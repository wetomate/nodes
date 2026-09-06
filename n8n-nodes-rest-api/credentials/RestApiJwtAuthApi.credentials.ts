import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const algorithms = [
	'HS256',
	'HS384',
	'HS512',
	'RS256',
	'RS384',
	'RS512',
	'ES256',
	'ES384',
	'ES512',
	'PS256',
	'PS384',
	'PS512',
].map((algorithm) => ({ name: algorithm, value: algorithm }));

export class RestApiJwtAuthApi implements ICredentialType {
	name = 'restApiJwtAuthApi';
	displayName = 'REST JWT Auth API';
	documentationUrl =
		'https://github.com/wetomate/nodes/tree/main/n8n-nodes-rest-api#authentication';
	icon: ICredentialType['icon'] = {
		light: 'file:../nodes/RestApi/rest-api.svg',
		dark: 'file:../nodes/RestApi/rest-api-dark.svg',
	};
	test = { request: { url: '/' } };

	properties: INodeProperties[] = [
		{
			displayName: 'Key Type',
			name: 'keyType',
			type: 'options',
			options: [
				{ name: 'Passphrase', value: 'passphrase' },
				{ name: 'PEM Public Key', value: 'pemKey' },
			],
			default: 'passphrase',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: { show: { keyType: ['passphrase'] } },
		},
		{
			displayName: 'Public Key',
			name: 'publicKey',
			type: 'string',
			typeOptions: { rows: 5 },
			default: '',
			required: true,
			displayOptions: { show: { keyType: ['pemKey'] } },
		},
		{
			displayName: 'Algorithm',
			name: 'algorithm',
			type: 'options',
			options: algorithms,
			default: 'HS256',
		},
	];
}
