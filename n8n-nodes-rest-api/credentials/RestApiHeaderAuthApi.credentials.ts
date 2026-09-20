import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class RestApiHeaderAuthApi implements ICredentialType {
	name = 'restApiHeaderAuthApi';
	displayName = 'REST Header Auth API';
	documentationUrl =
		'https://github.com/wetomate/nodes/tree/main/n8n-nodes-rest-api#authentication';
	icon: ICredentialType['icon'] = {
		light: 'file:../nodes/RestApi/rest-api.svg',
		dark: 'file:../nodes/RestApi/rest-api-dark.svg',
	};
	test = { request: { url: '/' } };

	properties: INodeProperties[] = [
		{
			displayName: 'Header Name',
			name: 'name',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Header Value',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];
}
