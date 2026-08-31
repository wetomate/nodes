const assert = require('node:assert/strict');
const { mkdir, mkdtemp, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { afterEach, describe, it } = require('node:test');
const { spawnSync } = require('node:child_process');

const validatorPath = path.resolve(__dirname, 'validate-community-node-packages.js');
const temporaryRoots = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((directory) =>
			rm(directory, { force: true, recursive: true }),
		),
	);
});

describe('community node package validation', () => {
	it('accepts a package that satisfies the shared contract', async () => {
		const repositoryRoot = await createRepositoryFixture();

		const result = runValidator(repositoryRoot);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Validated 1 community node package/);
	});

	it('reports dependency and registered-entry violations together', async () => {
		const repositoryRoot = await createRepositoryFixture({
			dependencies: { example: '^1.0.0' },
			devDependencies: { '@wetomate/n8n-node-toolkit': '^0.9.0' },
			peerDependencies: { 'n8n-workflow': '^2.0.0' },
			n8n: {
				nodes: [
					'dist/nodes/Missing.node.js',
					'dist/nodes/Missing.node.js',
					'dist/../Outside.node.js',
				],
				credentials: [],
			},
		});

		const result = runValidator(repositoryRoot);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /development dependency with \^1\.0\.2/);
		assert.match(result.stderr, /must not declare runtime dependencies; found example/);
		assert.match(result.stderr, /n8n-workflow as a peer dependency with \*/);
		assert.match(result.stderr, /duplicate n8n entry points/);
		assert.match(result.stderr, /invalid registered n8n entry point/);
		assert.match(result.stderr, /source file nodes\/Missing\.node\.ts does not exist/);
	});
});

async function createRepositoryFixture(nodePackageOverrides = {}) {
	const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'wetomate-validator-'));
	temporaryRoots.push(repositoryRoot);

	const toolkitRoot = path.join(repositoryRoot, 'wetomate-node-toolkit');
	const nodeRoot = path.join(repositoryRoot, 'n8n-nodes-example');
	await mkdir(path.join(nodeRoot, 'nodes'), { recursive: true });
	await mkdir(path.join(nodeRoot, 'credentials'), { recursive: true });
	await mkdir(toolkitRoot, { recursive: true });

	await writeJson(path.join(toolkitRoot, 'package.json'), {
		name: '@wetomate/n8n-node-toolkit',
		version: '1.0.2',
	});
	await writeFile(path.join(nodeRoot, 'nodes/Example.node.ts'), 'export class Example {}\n');
	await writeFile(
		path.join(nodeRoot, 'credentials/Example.credentials.ts'),
		'export class ExampleCredentials {}\n',
	);
	await writeJson(path.join(nodeRoot, 'package.json'), {
		name: 'n8n-nodes-example',
		devDependencies: {
			'@wetomate/n8n-node-toolkit': '^1.0.2',
		},
		peerDependencies: {
			'n8n-workflow': '*',
		},
		n8n: {
			nodes: ['dist/nodes/Example.node.js'],
			credentials: ['dist/credentials/Example.credentials.js'],
		},
		...nodePackageOverrides,
	});

	return repositoryRoot;
}

function runValidator(repositoryRoot) {
	return spawnSync(process.execPath, [validatorPath, repositoryRoot], {
		encoding: 'utf8',
	});
}

async function writeJson(filePath, value) {
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
