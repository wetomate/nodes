/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import nock from 'nock';

import { DuoSecurityApi } from '../../../credentials/DuoSecurityApi.credentials';
import { DuoSecurity } from '../DuoSecurity.node';
import { NodeTestHarness } from './NodeTestHarness';

const credentials = {
	duoSecurityApi: {
		ikey: 'test_ikey',
		skey: 'test_skey',
		hostname: 'api-test.duosecurity.com',
	},
};

const harness = new NodeTestHarness({
	nodeTypes: {
		'n8n-nodes-duo.duoSecurity': new DuoSecurity(),
	},
	credentialTypes: {
		duoSecurityApi: new DuoSecurityApi(),
	},
});

describe('Duo Security node', () => {
	it('resolves icons for the base and versioned node descriptions', () => {
		const node = new DuoSecurity();

		expect(node.description.icon).toBe('file:duo.svg');
		expect(node.nodeVersions[1].description.icon).toEqual({
			light: 'file:duo.svg',
			dark: 'file:duo-dark.svg',
		});
	});

	it('provides an AI-specific tool description', () => {
		const node = new DuoSecurity();

		expect(node.nodeVersions[1].description.builderHint).toEqual({
			message: expect.stringContaining('Duo user verification'),
		});
		expect(node.nodeVersions[1].description.usableAsTool).toEqual({
			replacements: {
				description: expect.stringContaining('Use Duo Security to verify a user'),
			},
		});
		expect(node.nodeVersions[1].description.properties[0].builderHint).toEqual({
			message: expect.stringContaining('Choose PING'),
		});
	});

	it('uses a square SVG canvas for the node icon', () => {
		const icon = readFileSync(join(__dirname, '..', 'duo.svg'), 'utf8');

		expect(icon).toMatch(/viewBox="0 0 211\.1 211\.1"/);
	});

	describe('ping', () => {
		harness.setupTests({
			credentials,
			workflowFiles: ['ping.workflow.json'],
			nock: {
				baseUrl: 'https://api-test.duosecurity.com',
				mocks: [
					{
						method: 'get',
						path: '/auth/v2/ping',
						requestHeaders: {
							authorization: (value) => value === undefined,
						},
						statusCode: 200,
						responseHeaders: { 'Content-Type': 'application/json' },
						responseBody: {
							stat: 'OK',
							response: { time: 1724932800 },
						},
					},
				],
			},
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});

	describe('auth', () => {
		harness.setupTests({
			credentials,
			workflowFiles: ['auth.workflow.json'],
			nock: {
				baseUrl: 'https://api-test.duosecurity.com',
				mocks: [
					{
						method: 'post',
						path: '/auth/v2/auth',
						requestBody: {
							username: 'alice@example.com',
							factor: 'push',
							device: 'auto',
							pushinfo: 'source=n8n%20workflow',
							async: 'true',
							ipaddr: '192.0.2.10',
						},
						requestHeaders: {
							authorization: /^Basic /,
							date: /GMT$/,
							'content-type': 'application/json',
						},
						statusCode: 200,
						responseHeaders: { 'Content-Type': 'application/json' },
						responseBody: {
							stat: 'OK',
							response: {
								result: 'allow',
								status: 'allow',
								status_msg: 'Success. Logging you in...',
							},
						},
					},
				],
			},
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});
});
