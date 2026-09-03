const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, describe, it } = require('node:test');

const { prepareSampleWorkflows } = require('./prepare-sample-workflows');

const temporaryDirectories = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		fs.rmSync(directory, { force: true, recursive: true });
	}
});

function createRepository() {
	const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wetomate-samples-'));
	temporaryDirectories.push(repositoryRoot);
	return repositoryRoot;
}

function addSample(repositoryRoot, packageName, fileName, overrides = {}) {
	const packageRoot = path.join(repositoryRoot, packageName);
	const workflowDirectory = path.join(packageRoot, 'examples', 'workflows');
	fs.mkdirSync(workflowDirectory, { recursive: true });
	fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({ name: packageName }));

	const workflow = {
		id: `${packageName}-${fileName}`,
		name: `[Wetomate Example] ${fileName}`,
		nodes: [
			{
				id: 'provider-node',
				name: 'Provider Node',
				type: `${packageName}.providerNode`,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		active: false,
		settings: { executionOrder: 'v1' },
		...overrides,
	};

	fs.writeFileSync(
		path.join(workflowDirectory, `${fileName}.json`),
		`${JSON.stringify(workflow, null, 2)}\n`,
	);
}

describe('sample workflow preparation', () => {
	it('collects workflows in deterministic package and filename order', () => {
		const repositoryRoot = createRepository();
		const outputFile = path.join(repositoryRoot, 'prepared.json');
		addSample(repositoryRoot, 'n8n-nodes-zeta', 'second');
		addSample(repositoryRoot, 'n8n-nodes-alpha', 'first');

		const first = prepareSampleWorkflows(repositoryRoot, outputFile);
		const workflows = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
		const second = prepareSampleWorkflows(repositoryRoot, outputFile);

		assert.equal(first.count, 2);
		assert.equal(first.hash, second.hash);
		assert.deepEqual(
			workflows.map((workflow) => workflow.name),
			['[Wetomate Example] first', '[Wetomate Example] second'],
		);
	});

	it('changes the content hash when a sample changes', () => {
		const repositoryRoot = createRepository();
		const outputFile = path.join(repositoryRoot, 'prepared.json');
		addSample(repositoryRoot, 'n8n-nodes-alpha', 'first');
		const initial = prepareSampleWorkflows(repositoryRoot, outputFile);

		addSample(repositoryRoot, 'n8n-nodes-alpha', 'first', {
			name: '[Wetomate Example] Updated',
		});
		const updated = prepareSampleWorkflows(repositoryRoot, outputFile);

		assert.notEqual(initial.hash, updated.hash);
	});

	it('uses CUSTOM node types only in the prepared development import', () => {
		const repositoryRoot = createRepository();
		const packageOutput = path.join(repositoryRoot, 'package.json');
		const developmentOutput = path.join(repositoryRoot, 'development.json');
		addSample(repositoryRoot, 'n8n-nodes-alpha', 'first', {
			nodes: [
				{
					id: 'manual',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'provider-node',
					name: 'Provider Node',
					type: 'n8n-nodes-alpha.providerNode',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
			],
		});

		const packageResult = prepareSampleWorkflows(repositoryRoot, packageOutput);
		const developmentResult = prepareSampleWorkflows(repositoryRoot, developmentOutput, {
			development: true,
		});
		const packageWorkflow = JSON.parse(fs.readFileSync(packageOutput, 'utf8'))[0];
		const developmentWorkflow = JSON.parse(fs.readFileSync(developmentOutput, 'utf8'))[0];

		assert.equal(packageWorkflow.nodes[0].type, 'n8n-nodes-base.manualTrigger');
		assert.equal(packageWorkflow.nodes[1].type, 'n8n-nodes-alpha.providerNode');
		assert.equal(developmentWorkflow.nodes[0].type, 'n8n-nodes-base.manualTrigger');
		assert.equal(developmentWorkflow.nodes[1].type, 'CUSTOM.providerNode');
		assert.notEqual(packageResult.hash, developmentResult.hash);
	});

	it('rejects active samples and credential references', () => {
		const repositoryRoot = createRepository();
		const outputFile = path.join(repositoryRoot, 'prepared.json');
		addSample(repositoryRoot, 'n8n-nodes-alpha', 'active', { active: true });

		assert.throws(
			() => prepareSampleWorkflows(repositoryRoot, outputFile),
			/must set active to false/,
		);

		fs.rmSync(path.join(repositoryRoot, 'n8n-nodes-alpha'), {
			force: true,
			recursive: true,
		});
		addSample(repositoryRoot, 'n8n-nodes-alpha', 'credential', {
			nodes: [
				{
					id: 'provider-node',
					name: 'Provider Node',
					type: 'n8n-nodes-alpha.providerNode',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: { providerApi: { id: 'secret', name: 'Secret' } },
				},
			],
		});

		assert.throws(
			() => prepareSampleWorkflows(repositoryRoot, outputFile),
			/must not contain credential references/,
		);
	});

	it('rejects duplicate workflow IDs across packages', () => {
		const repositoryRoot = createRepository();
		const outputFile = path.join(repositoryRoot, 'prepared.json');
		addSample(repositoryRoot, 'n8n-nodes-alpha', 'first', {
			id: 'shared-id',
		});
		addSample(repositoryRoot, 'n8n-nodes-zeta', 'second', {
			id: 'shared-id',
		});

		assert.throws(
			() => prepareSampleWorkflows(repositoryRoot, outputFile),
			/Duplicate sample workflow ID: shared-id/,
		);
	});
});
