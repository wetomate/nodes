import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import * as crypto from 'crypto';

/**
 * Converts a plain object of query parameters into a canonical
 * application/x-www-form-urlencoded string, suitable for use in URLs or HTTP requests.
 *
 * Behavior:
 * 1. Sorts the parameter keys in lexicographical order.
 * 2. Encodes both keys and values using `encodeURIComponent`.
 * 3. Supports array values by repeating the key for each element.
 *    Example: { a: ["1","2"] } → "a=1&a=2"
 * 4. Escapes special characters that `encodeURIComponent` doesn't handle (! ' ( ) *).
 *
 * @param params - An object where keys are strings and values are strings or string arrays.
 * @returns A properly encoded query string with keys sorted.
 *
 */
function canonParams(params: Record<string, string | string[]>) {
	return Object.keys(params)
		.sort()
		.flatMap((k) => {
			const value = params[k];
			const keq = encodeURIComponent(k) + '=';
			return Array.isArray(value)
				? value.map((v) => keq + encodeURIComponent(v))
				: [keq + encodeURIComponent(value)];
		})
		.join('&')
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Hashes the input string or buffer using SHA-512 and returns the hex digest.
 *
 * @param {string | Buffer} to_hash - The data to hash.
 * @returns {string} The SHA-512 hash as a hex string.
 */
function hashString(to_hash: string | Buffer) {
	return crypto.createHash('sha512').update(to_hash).digest('hex');
}

function canonicalizeV5(
	method: string,
	host: string,
	path: string,
	params: Record<string, string>,
	date: string,
	body: string,
): string {
	return [
		date,
		method.toUpperCase(),
		host.toLowerCase(),
		path,
		canonParams(params),
		hashString(body),
		hashString(''),
	].join('\n');
}

export function signV5(
	ikey: string,
	skey: string,
	method: string,
	host: string,
	path: string,
	params: Record<string, string>,
	date: string,
	body: string,
): string {
	const canon = canonicalizeV5(method, host, path, params, date, body);
	const sig = crypto.createHmac('sha512', skey).update(canon).digest('hex');

	const auth = Buffer.from([ikey, sig].join(':')).toString('base64');
	return 'Basic ' + auth;
}

export class DuoSecurityApi implements ICredentialType {
	name = 'duoSecurityApi';
	displayName = 'Duo Security API';
	documentationUrl = 'https://duo.com';
	icon: ICredentialType['icon'] = {
		light: 'file:../nodes/DuoSecurity/duo.svg',
		dark: 'file:../nodes/DuoSecurity/duo-dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Integration Key',
			name: 'ikey',
			type: 'string',
			default: '',
			placeholder: 'Ex: DIXXXXXXXXXX',
		},
		// eslint-disable-next-line @n8n/community-nodes/credential-unnecessary-password
		{
			displayName: 'Secret Key',
			name: 'skey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'API Host',
			name: 'hostname',
			type: 'string',
			description: 'hostname address must be without https or http',
			placeholder: 'Ex: api-XXXXXXXX.duosecurity.com',
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const ikey = credentials.ikey as string;
		const skey = credentials.skey as string;
		const hostname = credentials.hostname as string;

		if (requestOptions.url !== '/auth/v2/ping') {
			const date = new Date().toUTCString();

			const bodyString =
				requestOptions.body !== undefined ? (requestOptions.body as string) : '';

			const auth = signV5(
				ikey,
				skey,
				requestOptions.method as string,
				hostname,
				requestOptions.url,
				requestOptions.qs as Record<string, string>,
				date,
				bodyString,
			);

			requestOptions.headers = {
				...requestOptions.headers,
				Date: date,
				Authorization: auth,
			};
		}

		requestOptions.baseURL = 'https://' + hostname;
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			url: '/auth/v2/check',
			method: 'GET',
		},
	};
}
