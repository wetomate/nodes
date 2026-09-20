import { timingSafeEqual } from 'node:crypto';

import jwt from 'jsonwebtoken';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INode,
	IWebhookFunctions,
	IWebhookResponseData,
	MultiPartFormData,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError, WorkflowConfigurationError } from 'n8n-workflow';

import { buildSchema, validateRequestBody } from './validation';

type WebhookOptions = {
	binaryPropertyName?: string;
	ignoreBots?: boolean;
	ipWhitelist?: string;
	rawBody?: boolean;
	responseData?: string;
};

type WebhookStatusError = NodeOperationError & { statusCode: number };

function webhookError(
	context: IWebhookFunctions,
	statusCode: number,
	message: string,
): WebhookStatusError {
	const error = new NodeOperationError(context.getNode(), message) as WebhookStatusError;
	error.statusCode = statusCode;
	return error;
}

export async function handleRestApiWebhook(
	context: IWebhookFunctions,
): Promise<IWebhookResponseData> {
	checkResponseModeConfiguration(context);

	const request = context.getRequestObject();
	const response = context.getResponseObject();
	const options = context.getNodeParameter('options', {}) as WebhookOptions;

	if (!isIpAllowed(options.ipWhitelist, request.ips, request.ip)) {
		return rejectRequest(response, 403, 'IP address is not allowed to access this endpoint');
	}

	if (options.ignoreBots && isLikelyBot(request.headers['user-agent'])) {
		return rejectRequest(response, 403, 'Request rejected because its user agent is a bot');
	}

	let jwtPayload: IDataObject | undefined;
	try {
		jwtPayload = await validateAuthentication(context);
	} catch (error) {
		if (error instanceof NodeOperationError && 'statusCode' in error) {
			const statusError = error as WebhookStatusError;
			if (statusError.statusCode === 401)
				response.setHeader('WWW-Authenticate', 'Basic realm="REST API"');
			return rejectRequest(response, statusError.statusCode, statusError.message);
		}
		throw new NodeOperationError(context.getNode(), error as Error);
	}

	if (!shouldRunWorkflow(context)) return {};

	const content = getRequestContent(request);
	if (context.getNodeParameter('validateBody', true) as boolean) {
		try {
			const validation = validateRequestBody(
				content.body,
				buildSchema(context),
				context.getNodeParameter('ajvOptions', {}) as IDataObject,
			);
			if (!validation.valid) {
				const statusCode = context.getNodeParameter('validationErrorCode', 400) as number;
				response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
				response.end(
					JSON.stringify({
						error: 'Request body validation failed',
						details: validation.errors.map(({ instancePath, keyword, message, params }) => ({
							instancePath,
							keyword,
							message,
							params,
						})),
					}),
				);
				return { noWebhookResponse: true };
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error as Error, {
				description: 'Review the JSON Schema and AJV options configured on this node.',
			});
		}
	}

	const prepareOutput = setupOutputConnection(context, request.method, jwtPayload);
	const outputItem: INodeExecutionData = {
		json: {
			headers: request.headers,
			params: request.params,
			query: request.query,
			body: content.body,
		},
	};

	if (request.contentType === 'multipart/form-data') {
		await addMultipartFiles(context, request as MultiPartFormData.Request, outputItem, options);
	}

	if (options.rawBody) {
		if (!request.rawBody) await request.readRawBody();
		outputItem.binary = {
			...(outputItem.binary ?? {}),
			data: {
				data: (request.rawBody ?? Buffer.alloc(0)).toString(BINARY_ENCODING),
				mimeType: request.contentType ?? 'application/octet-stream',
			},
		};
	}

	if (!request.body && !options.rawBody && request.contentType !== 'multipart/form-data') {
		const binaryPropertyName = options.binaryPropertyName?.trim() || 'data';
		outputItem.binary = {
			[binaryPropertyName]: await context.helpers.prepareBinaryData(
				request,
				request.contentDisposition?.filename,
				request.contentType ?? 'application/octet-stream',
			),
		};
	}

	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	if (responseMode === 'streaming') {
		response.writeHead(200, {
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Content-Type': 'application/json; charset=utf-8',
			'Transfer-Encoding': 'chunked',
		});
		response.flushHeaders();
		return { noWebhookResponse: true, workflowData: prepareOutput(outputItem) };
	}

	return {
		webhookResponse: options.responseData,
		workflowData: prepareOutput(outputItem),
	};
}

function shouldRunWorkflow(context: IWebhookFunctions): boolean {
	const node = context.getNode() as INode & {
		parameters?: { options?: { onlyRunIf?: unknown } };
	};
	const onlyRunIf = node.parameters?.options?.onlyRunIf;
	if (typeof onlyRunIf !== 'string' || !onlyRunIf.startsWith('=')) return true;

	try {
		return Boolean(context.evaluateExpression(onlyRunIf.slice(1), 0));
	} catch (error) {
		context.logger.warn(
			`REST API "Only Run If" expression failed; allowing the request: ${(error as Error).message}`,
			{ nodeName: node.name },
		);
		return true;
	}
}

function getRequestContent(request: ReturnType<IWebhookFunctions['getRequestObject']>): {
	body: IDataObject;
} {
	if (request.contentType === 'multipart/form-data') {
		return { body: (request as MultiPartFormData.Request).body.data };
	}
	return { body: (request.body ?? {}) as IDataObject };
}

async function addMultipartFiles(
	context: IWebhookFunctions,
	request: MultiPartFormData.Request,
	outputItem: INodeExecutionData,
	options: WebhookOptions,
): Promise<void> {
	let count = 0;
	for (const [fieldName, value] of Object.entries(request.body.files ?? {})) {
		const files = Array.isArray(value) ? value : [value];
		for (let index = 0; index < files.length; index++) {
			const file = files[index];
			const configuredName = options.binaryPropertyName?.trim();
			const normalizedFieldName = fieldName.replace(/\[\]$/, '').trim() || 'data';
			const propertyName = configuredName
				? `${configuredName}${count}`
				: files.length > 1
					? `${normalizedFieldName}${index}`
					: normalizedFieldName;
			outputItem.binary ??= {};
			outputItem.binary[propertyName] = await context.nodeHelpers.copyBinaryFile(
				file.filepath,
				file.originalFilename ?? file.newFilename,
				file.mimetype,
			);
			count++;
		}
	}
}

async function validateAuthentication(
	context: IWebhookFunctions,
): Promise<IDataObject | undefined> {
	const authentication = context.getNodeParameter('authentication', 'none') as string;
	if (authentication === 'none') return undefined;

	const headers = context.getHeaderData();
	if (authentication === 'basicAuth') {
		const credentials = await getCredentials(context, 'restApiBasicAuthApi');
		if (!credentials.user || !credentials.password) {
			throw webhookError(context, 500, 'Authentication credentials are not configured');
		}
		const authorization = headers.authorization;
		if (!authorization?.startsWith('Basic ')) {
			throw webhookError(context, 401, 'Authentication is required');
		}
		let supplied = '';
		try {
			supplied = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
		} catch {
			throw webhookError(context, 403, 'Authentication data is invalid');
		}
		const expected = `${String(credentials.user ?? '')}:${String(credentials.password ?? '')}`;
		if (!safeEqual(supplied, expected)) {
			throw webhookError(context, 403, 'Authentication data is invalid');
		}
		return undefined;
	}

	if (authentication === 'headerAuth') {
		const credentials = await getCredentials(context, 'restApiHeaderAuthApi');
		const name = String(credentials.name ?? '').toLowerCase();
		const secret = credentials.secret ?? credentials.value;
		if (!name || !secret) {
			throw webhookError(context, 500, 'Authentication credentials are not configured');
		}
		const value = headers[name];
		if (typeof value !== 'string' || !safeEqual(value, String(secret))) {
			throw webhookError(context, 403, 'Authentication data is invalid');
		}
		return undefined;
	}

	if (authentication === 'jwtAuth') {
		const credentials = await getCredentials(context, 'restApiJwtAuthApi');
		const authorization = headers.authorization;
		const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
		if (!token) throw webhookError(context, 401, 'Bearer token is required');
		const key = credentials.keyType === 'pemKey' ? credentials.publicKey : credentials.secret;
		try {
			const verificationKey =
				credentials.keyType === 'pemKey'
					? formatPublicKey(String(key ?? ''))
					: String(key ?? '');
			const decoded = jwt.verify(token, verificationKey, {
				algorithms: [credentials.algorithm as jwt.Algorithm],
			});
			return typeof decoded === 'string' ? { value: decoded } : (decoded as IDataObject);
		} catch {
			throw webhookError(context, 403, 'Authentication data is invalid');
		}
	}

	throw webhookError(context, 500, 'Unsupported authentication configuration');
}

function formatPublicKey(value: string): string {
	const normalized = value.replace(/\\n/g, '\n').trim();
	if (normalized.includes('\n')) return normalized;

	const match = normalized.match(/-----BEGIN (PUBLIC KEY|CERTIFICATE)-----(.*?)-----END \1-----/);
	if (!match) return normalized;
	const body = match[2].replace(/\s+/g, '');
	const lines = body.match(/.{1,64}/g) ?? [];
	return `-----BEGIN ${match[1]}-----\n${lines.join('\n')}\n-----END ${match[1]}-----`;
}

async function getCredentials(
	context: IWebhookFunctions,
	type: string,
): Promise<ICredentialDataDecryptedObject> {
	try {
		return await context.getCredentials<ICredentialDataDecryptedObject>(type);
	} catch {
		throw webhookError(context, 500, 'Authentication credentials are not configured');
	}
}

function safeEqual(actual: string, expected: string): boolean {
	const actualBuffer = Buffer.from(actual);
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

function isLikelyBot(userAgent: string | undefined): boolean {
	return /bot|crawler|spider|preview|slurp|facebookexternalhit|whatsapp|telegram/i.test(
		userAgent ?? '',
	);
}

export function isIpAllowed(
	allowlist: string | undefined,
	proxyIps: string[],
	requestIp?: string,
): boolean {
	if (!allowlist?.trim()) return true;
	const ranges: Array<{ network: ParsedIp; prefix: number }> = [];

	for (const rawEntry of allowlist.split(',')) {
		const entry = normalizeIp(rawEntry.trim());
		if (!entry) continue;
		try {
			if (entry.includes('/')) {
				const [network, prefixText] = entry.split('/');
				const prefix = Number(prefixText);
				const parsedNetwork = parseIp(network);
				if (parsedNetwork && Number.isInteger(prefix) && prefix >= 0 && prefix <= parsedNetwork.bits)
					ranges.push({ network: parsedNetwork, prefix });
			} else {
				const parsed = parseIp(entry);
				if (parsed) ranges.push({ network: parsed, prefix: parsed.bits });
			}
		} catch {
			// Invalid entries never grant access.
		}
	}

	return [requestIp, ...proxyIps].some((value) => {
		const ip = parseIp(normalizeIp(value));
		return ip ? ranges.some(({ network, prefix }) => matchesCidr(ip, network, prefix)) : false;
	});
}

type ParsedIp = { bytes: number[]; bits: 32 | 128 };

function parseIp(value?: string): ParsedIp | undefined {
	if (!value) return undefined;
	if (!value.includes(':')) {
		const octets = value.split('.').map(Number);
		return octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
			? { bytes: octets, bits: 32 }
			: undefined;
	}

	const halves = value.split('::');
	if (halves.length > 2) return undefined;
	const left = halves[0] ? halves[0].split(':') : [];
	const right = halves[1] ? halves[1].split(':') : [];
	if (halves.length === 1 && left.length !== 8) return undefined;
	const groups = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
	if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return undefined;
	const bytes = groups.flatMap((group) => {
		const number = Number.parseInt(group, 16);
		return [number >> 8, number & 0xff];
	});
	return { bytes, bits: 128 };
}

function matchesCidr(ip: ParsedIp, network: ParsedIp, prefix: number): boolean {
	if (ip.bits !== network.bits) return false;
	const fullBytes = Math.floor(prefix / 8);
	const remainingBits = prefix % 8;
	for (let index = 0; index < fullBytes; index++) {
		if (ip.bytes[index] !== network.bytes[index]) return false;
	}
	if (remainingBits === 0) return true;
	const mask = 0xff << (8 - remainingBits);
	return (ip.bytes[fullBytes] & mask) === (network.bytes[fullBytes] & mask);
}

function normalizeIp(value?: string): string | undefined {
	if (!value) return undefined;
	return value.startsWith('::ffff:') ? value.slice(7) : value;
}

function setupOutputConnection(
	context: IWebhookFunctions,
	requestMethod: string,
	jwtPayload?: IDataObject,
): (item: INodeExecutionData) => INodeExecutionData[][] {
	const configuredMethods = context.getNodeParameter('httpMethod', []) as string | string[];
	const methods = Array.isArray(configuredMethods) ? configuredMethods : [configuredMethods];
	const outputIndex = Math.max(0, methods.indexOf(requestMethod.toUpperCase()));
	const webhookUrl = context.getNodeWebhookUrl('default');
	const executionMode = context.getMode() === 'manual' ? 'test' : 'production';

	return (item) => {
		item.json.webhookUrl = webhookUrl;
		item.json.executionMode = executionMode;
		if (jwtPayload) item.json.jwtPayload = jwtPayload;
		const outputs = methods.map<INodeExecutionData[]>(() => []);
		outputs[outputIndex] = [item];
		return outputs;
	};
}

function checkResponseModeConfiguration(context: IWebhookFunctions): void {
	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	const hasResponseNode = context
		.getChildNodes(context.getNode().name)
		.some((node) => node.type === 'n8n-nodes-base.respondToWebhook');

	if (responseMode === 'responseNode' && !hasResponseNode) {
		throw new WorkflowConfigurationError(
			context.getNode(),
			new Error('No Respond to Webhook node is connected'),
			{
				description: 'Connect a Respond to Webhook node or select a different response mode.',
			},
		);
	}

	if (hasResponseNode && !['responseNode', 'streaming'].includes(responseMode)) {
		throw new WorkflowConfigurationError(
			context.getNode(),
			new Error('A connected Respond to Webhook node is not used'),
			{
				description:
					'Select the Respond to Webhook response mode or remove the connected response node.',
			},
		);
	}
}

function rejectRequest(
	response: ReturnType<IWebhookFunctions['getResponseObject']>,
	statusCode: number,
	message: string,
): IWebhookResponseData {
	response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify({ error: message }));
	return { noWebhookResponse: true };
}
