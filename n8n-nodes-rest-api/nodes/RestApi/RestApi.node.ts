import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { RestApiV1 } from './V1/RestApiV1.node';

export class RestApi extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'REST API',
			name: 'restApi',
			icon: 'file:rest-api.svg',
			group: ['trigger'],
			subtitle: 'Webhook with JSON Schema validation',
			defaultVersion: 1,
			description: 'Starts a workflow after validating an HTTP request body',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new RestApiV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
