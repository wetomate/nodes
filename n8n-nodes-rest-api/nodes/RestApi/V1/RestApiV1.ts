import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { RestApiV1Base } from './RestApiV1Base';

export class RestApiV1 extends RestApiV1Base {
	constructor(baseDescription: INodeTypeBaseDescription) {
		super(baseDescription);
	}
}
