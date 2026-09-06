import type {
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { configuredOutputs } from '../utils/response';
import { handleRestApiWebhook } from '../utils/webhook';
import { restApiCredentials, restApiProperties, restApiWebhooks } from './restApiProperties';

const versionDescription: INodeTypeDescription & { sensitiveOutputFields?: string[] } = {
	displayName: 'REST API',
	name: 'restApi',
	icon: { light: 'file:rest-api.svg', dark: 'file:rest-api-dark.svg' },
	group: ['trigger'],
	version: 1,
	description: 'Starts a workflow after validating an HTTP request body',
	subtitle: 'Webhook with JSON Schema validation',
	eventTriggerDescription: 'Waiting for you to call the Test URL',
	activationMessage: 'You can now call the production REST API URL.',
	defaults: { name: 'REST API' },
	supportsCORS: true,
	triggerPanel: {
		header: '',
		executionsHelp: {
			inactive:
				"Use test mode while building the workflow. Select 'Listen for test event', then call the test URL. Activate the workflow before calling the production URL.",
			active:
				'The production URL starts the active workflow. Production executions appear in the executions list.',
		},
		activationHint:
			'Activate the workflow to call this endpoint without listening for a test event.',
	},
	inputs: [],
	outputs: `={{(${configuredOutputs})($parameter)}}`,
	credentials: restApiCredentials,
	webhooks: restApiWebhooks,
	sensitiveOutputFields: ['headers.authorization', 'headers.cookie'],
	properties: restApiProperties,
};

export class RestApiV1 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'REST API',
		name: 'restApi',
		icon: { light: 'file:rest-api.svg', dark: 'file:rest-api-dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow after validating an HTTP request body',
		subtitle: 'Webhook with JSON Schema validation',
		defaults: { name: 'REST API' },
		inputs: [],
		outputs: [],
		properties: [],
	};

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			icon: { light: 'file:rest-api.svg', dark: 'file:rest-api-dark.svg' },
			...baseDescription,
			...versionDescription,
		};
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return await handleRestApiWebhook(this);
	}
}
