import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';
import { DuoSecurityToolV1 } from './V1/DuoSecurityToolV1';

export class DuoSecurityTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Duo Security AI Tool',
			name: 'duoSecurityTool',
			icon: 'file:duo.svg',
			group: ['transform'],
			subtitle: 'Duo Security operations for AI agents',
			defaultVersion: 1,
			description: 'Duo Security operations exposed as an AI tool',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DuoSecurityToolV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
