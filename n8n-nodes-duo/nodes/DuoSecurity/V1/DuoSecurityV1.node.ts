import {
	IDataObject,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type INodeExecutionData,
} from 'n8n-workflow';

import { duoProperties } from './duoProperties';
import { mapDuoParameters } from './duoParameterMapping';
import { safeStringify } from '../utils/duoUtils';

const versionDescription: INodeTypeDescription = {
	displayName: 'Duo Security',
	name: 'duoSecurity',
	icon: { light: 'file:duo.svg', dark: 'file:duo-dark.svg' },
	group: ['transform'],
	subtitle: 'Duo Security Multi-factor Authentication/Authorization',
	version: 1,
	description:
		'Connects n8n workflows to Duo Security for user verification and second-factor authentication.',
	builderHint: {
		message:
			'Use for Duo user verification, pre-authentication, Duo Push approval, passcode authentication, or authentication status checks.',
	},
	defaults: {
		name: 'Duo Security',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'duoSecurityApi',
			required: true,
		},
	],
	hints: [
		{
			message: 'The AUTH operation sends a real authentication challenge to the selected user.',
			type: 'warning',
			location: 'ndv',
			whenToDisplay: 'always',
			displayCondition: '={{ $parameter["endpoint"] === "auth" }}',
		},
		{
			message: 'For asynchronous authentication, pass the transaction ID returned by AUTH to AUTH STATUS.',
			type: 'info',
			location: 'ndv',
			whenToDisplay: 'always',
			displayCondition: '={{ $parameter["endpoint"] === "auth_status" }}',
		},
	],
	properties: duoProperties,
	usableAsTool: {
		replacements: {
			description:
				'Use Duo Security to verify a user or start a second-factor authentication challenge. Use PREAUTH before AUTH when checking whether a user can authenticate. Use Push Notification for administrator approvals and include only non-secret context in Push Info. Treat only an explicit result.response.result of allow as approval; never continue after a missing, denied, expired, or failed response.',
		},
	},
};

export class DuoSecurityV1 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Duo Security',
		name: 'duoSecurity',
		icon: { light: 'file:duo.svg', dark: 'file:duo-dark.svg' },
		group: ['transform'],
		subtitle: 'Duo Security Multi-factor Authentication/Authorization',
		version: 1,
		description: 'Duo Security authentication operations',
		defaults: { name: 'Duo Security' },
		inputs: [],
		outputs: [],
		properties: [],
		usableAsTool: true,
	};

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			icon: { light: 'file:duo.svg', dark: 'file:duo-dark.svg' },
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const endpoint = this.getNodeParameter('endpoint', i);
			const method = endpoint === 'auth' || endpoint === 'preauth' ? 'POST' : 'GET';
			const isPost = method.toLowerCase() === 'post';
			const processedParams = mapDuoParameters(this, i);

			const requestOptions = {
				method: method as IHttpRequestMethods,
				url: `/auth/v2/${endpoint}`,
				json: true,
				body: isPost ? safeStringify(processedParams) : safeStringify({} as IDataObject),
				qs: isPost ? ({} as IDataObject) : processedParams,
				headers: {
					'Content-Type': 'application/json',
				},
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'duoSecurityApi',
				requestOptions,
			);

			returnData.push({
				json: { result: response },
				pairedItem: { item: i },
			});
		}

		return [returnData];
	}
}
