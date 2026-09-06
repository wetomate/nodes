import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class RestApiBasicAuthApi implements ICredentialType {
	name = 'restApiBasicAuthApi';
	displayName = 'REST Basic Auth API';
	documentationUrl =
		'https://github.com/wetomate/nodes/tree/main/n8n-nodes-rest-api#authentication';
	icon: ICredentialType['icon'] = {
		light: 'file:../nodes/RestApi/rest-api.svg',
		dark: 'file:../nodes/RestApi/rest-api-dark.svg',
	};
	test = { request: { url: '/' } };

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];
}
