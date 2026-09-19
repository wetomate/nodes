import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { DuoSecurityV1Base } from './DuoSecurityV1Base.node';

export class DuoSecurityToolV1 extends DuoSecurityV1Base {
	constructor(baseDescription: INodeTypeBaseDescription) {
		super(baseDescription, 'tool');
	}
}
