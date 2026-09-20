import type { IWebhookFunctions } from 'n8n-workflow';

import { handleRestApiWebhook } from '../utils/webhook';

describe('REST API webhook unit behavior', () => {
	it('returns configured validation details without workflow data', async () => {
		const response = responseMock();
		const context = webhookContext(
			{
				validateBody: true,
				schemaSource: 'json',
				jsonSchema: JSON.stringify({
					type: 'object',
					required: ['email'],
					properties: { email: { type: 'string', format: 'email' } },
				}),
				ajvOptions: { allErrors: true, validateFormats: true },
				validationErrorCode: 422,
				authentication: 'none',
				responseMode: 'onReceived',
				options: {},
			},
			{ body: { email: 'invalid' } },
			response,
		);

		await expect(handleRestApiWebhook(context)).resolves.toEqual({
			noWebhookResponse: true,
		});
		expect(response.writeHead).toHaveBeenCalledWith(422, {
			'Content-Type': 'application/json; charset=utf-8',
		});
		const payload = JSON.parse(response.end.mock.calls[0][0] as string) as {
			error: string;
			details: Array<{ keyword: string }>;
		};
		expect(payload.error).toBe('Request body validation failed');
		expect(payload.details).toEqual([expect.objectContaining({ keyword: 'format' })]);
	});

	it('routes a valid request to the matching method output', async () => {
		const context = webhookContext(
			{
				validateBody: false,
				authentication: 'none',
				httpMethod: ['GET', 'POST'],
				responseMode: 'onReceived',
				options: { responseData: 'accepted' },
			},
			{
				body: { orderId: 42 },
				headers: { 'content-type': 'application/json' },
				method: 'POST',
				params: { version: 'v1' },
				query: { source: 'test' },
			},
			responseMock(),
		);

		const result = await handleRestApiWebhook(context);

		expect(result.webhookResponse).toBe('accepted');
		expect(result.workflowData?.[0]).toEqual([]);
		expect(result.workflowData?.[1]?.[0]).toEqual({
			json: {
				headers: { 'content-type': 'application/json' },
				params: { version: 'v1' },
				query: { source: 'test' },
				body: { orderId: 42 },
				webhookUrl: 'https://n8n.example/webhook/orders',
				executionMode: 'test',
			},
		});
	});

	it('rejects missing Basic authentication without exposing credentials', async () => {
		const response = responseMock();
		const getCredentials = jest.fn(async () => ({ user: 'admin', password: 'secret' }));
		const context = webhookContext(
			{
				validateBody: false,
				authentication: 'basicAuth',
				responseMode: 'onReceived',
				options: {},
			},
			{ headers: {} },
			response,
			getCredentials,
		);

		await expect(handleRestApiWebhook(context)).resolves.toEqual({
			noWebhookResponse: true,
		});
		expect(response.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="REST API"');
		expect(response.end).toHaveBeenCalledWith(
			JSON.stringify({ error: 'Authentication is required' }),
		);
		expect(getCredentials).toHaveBeenCalledWith('restApiBasicAuthApi');
	});
});

function webhookContext(
	parameters: Record<string, unknown>,
	requestOverrides: Record<string, unknown>,
	response: ReturnType<typeof responseMock>,
	getCredentials: (type: string) => Promise<Record<string, unknown>> = async () => ({
		user: 'admin',
		password: 'secret',
	}),
): IWebhookFunctions {
	const request = {
		body: {},
		contentType: 'application/json',
		headers: {},
		ip: '203.0.113.1',
		ips: [],
		method: 'POST',
		params: {},
		query: {},
		...requestOverrides,
	};

	return {
		getChildNodes: () => [],
		getCredentials,
		getHeaderData: () => request.headers,
		getMode: () => 'manual',
		getNode: () => ({
			id: 'rest-api-node',
			name: 'REST API',
			type: 'n8n-nodes-rest-api.restApi',
			typeVersion: 1,
			parameters: { options: parameters.options ?? {} },
		}),
		getNodeParameter: (name: string, fallbackValue?: unknown) =>
			parameters[name] ?? fallbackValue,
		getNodeWebhookUrl: () => 'https://n8n.example/webhook/orders',
		getRequestObject: () => request,
		getResponseObject: () => response,
	} as unknown as IWebhookFunctions;
}

function responseMock() {
	return {
		end: jest.fn(),
		flushHeaders: jest.fn(),
		setHeader: jest.fn(),
		writeHead: jest.fn(),
	};
}
