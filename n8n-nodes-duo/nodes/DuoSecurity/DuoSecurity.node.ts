import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';
import { DuoSecurityV1 } from './V1/DuoSecurityV1.node';

export class DuoSecurity extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Duo Security',
			name: 'duoSecurity',
			icon: 'file:duo.svg',
			group: ['transform'],
			subtitle: 'Duo Security Multi-factor Authentication/Authorization',
			defaultVersion: 1,
			description:
				'Duo Security, is a two-factor authentication (2FA) and identity security solution that enhances online security by verifying user identities',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DuoSecurityV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
