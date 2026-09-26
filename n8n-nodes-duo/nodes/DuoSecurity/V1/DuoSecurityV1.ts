import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { DuoSecurityV1Base } from './DuoSecurityV1Base';

export class DuoSecurityV1 extends DuoSecurityV1Base {
	constructor(baseDescription: INodeTypeBaseDescription) {
		super(baseDescription, 'regular');
	}
}
