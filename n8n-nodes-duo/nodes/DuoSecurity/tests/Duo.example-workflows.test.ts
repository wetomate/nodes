/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type WorkflowNode = {
	name: string;
	type: string;
	parameters: Record<string, unknown>;
	credentials?: unknown;
};

type Workflow = {
	active?: boolean;
	nodes: WorkflowNode[];
	connections: Record<string, Record<string, unknown>>;
};

const examplesDirectory = join(__dirname, '../../../examples/workflows');

function readExample(fileName: string): Workflow {
	return JSON.parse(readFileSync(join(examplesDirectory, fileName), 'utf8')) as Workflow;
}

function nodeByName(workflow: Workflow, name: string): WorkflowNode {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	if (!node) throw new Error(`Workflow node not found: ${name}`);
	return node;
}

describe('Duo example workflows', () => {
	it.each(['check-api-health.json', 'duo-human-in-the-loop-approval.json'])(
		'keeps %s inactive, credential-free, and connected to registered Duo nodes',
		(fileName) => {
			const workflow = readExample(fileName);
			const nodeNames = new Set(workflow.nodes.map((node) => node.name));

			expect(workflow.active).toBe(false);
			expect(workflow.nodes.some((node) => node.type === 'n8n-nodes-duo.duoSecurity')).toBe(true);
			expect(workflow.nodes.every((node) => node.credentials === undefined)).toBe(true);

			for (const [source, outputs] of Object.entries(workflow.connections)) {
				expect(nodeNames.has(source)).toBe(true);
				for (const branches of Object.values(outputs)) {
					for (const branch of branches as Array<Array<{ node: string }>>) {
						for (const connection of branch) expect(nodeNames.has(connection.node)).toBe(true);
					}
				}
			}
		},
	);

	it('keeps the health-check operations in their intended order', () => {
		const workflow = readExample('check-api-health.json');
		const duoNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-duo.duoSecurity');

		expect(duoNodes.map((node) => node.parameters.endpoint)).toEqual([
			'ping',
			'preauth',
			'auth',
			'auth_status',
		]);
	});

	it('carries approval context into a synchronous Duo Push before the action gate', () => {
		const workflow = readExample('duo-human-in-the-loop-approval.json');
		const approval = nodeByName(workflow, 'Request Administrator Approval');
		const pushInfo = approval.parameters.pushinfo as { pairs: Array<{ key: string; value: string }> };

		expect(approval.parameters.endpoint).toBe('auth');
		expect(approval.parameters.factor).toBe('push');
		expect(approval.parameters.authOptionalFields).toEqual(
			expect.objectContaining({ async: false }),
		);
		expect(pushInfo.pairs.map((pair) => pair.key)).toEqual(['event', 'action', 'target']);
		expect(workflow.nodes.map((node) => node.name)).toEqual(
			expect.arrayContaining([
				'Event Trigger',
				'Check Administrator Access',
				'Request Administrator Approval',
				'Approved?',
				'Execute Approved Action',
				'Record Denied Approval',
			]),
		);
	});
});
