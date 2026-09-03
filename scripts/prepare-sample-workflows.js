const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function discoverSampleWorkflows(repositoryRoot) {
	const packageDirectories = fs
		.readdirSync(repositoryRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name.startsWith('n8n-nodes-'))
		.map((entry) => entry.name)
		.sort();

	const samples = [];

	for (const packageDirectory of packageDirectories) {
		const packageRoot = path.join(repositoryRoot, packageDirectory);
		const packageManifestPath = path.join(packageRoot, 'package.json');
		const workflowDirectory = path.join(packageRoot, 'examples', 'workflows');

		if (!fs.existsSync(packageManifestPath) || !fs.existsSync(workflowDirectory)) continue;

		const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf8'));
		const packageName = packageManifest.name;
		if (typeof packageName !== 'string' || !packageName.startsWith('n8n-nodes-')) {
			throw new Error(`${packageDirectory} has an invalid community-node package name.`);
		}

		const workflowFiles = fs
			.readdirSync(workflowDirectory, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
			.map((entry) => path.join(workflowDirectory, entry.name))
			.sort();

		for (const workflowFile of workflowFiles) {
			const relativePath = path.relative(repositoryRoot, workflowFile);
			const source = fs.readFileSync(workflowFile, 'utf8');
			let workflow;

			try {
				workflow = JSON.parse(source);
			} catch (error) {
				throw new Error(`${relativePath} is not valid JSON: ${error.message}`);
			}

			validateSampleWorkflow(workflow, packageName, relativePath);
			samples.push({ packageName, relativePath, source, workflow });
		}
	}

	const workflowIds = new Set();
	for (const sample of samples) {
		if (workflowIds.has(sample.workflow.id)) {
			throw new Error(`Duplicate sample workflow ID: ${sample.workflow.id}`);
		}
		workflowIds.add(sample.workflow.id);
	}

	return samples;
}

function validateSampleWorkflow(workflow, packageName, relativePath) {
	if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
		throw new Error(`${relativePath} must contain one workflow object.`);
	}
	if (typeof workflow.id !== 'string' || workflow.id.trim() === '') {
		throw new Error(`${relativePath} must define a stable workflow ID.`);
	}
	if (typeof workflow.name !== 'string' || !workflow.name.startsWith('[Wetomate Example]')) {
		throw new Error(`${relativePath} must use a name starting with [Wetomate Example].`);
	}
	if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
		throw new Error(`${relativePath} must contain at least one node.`);
	}
	if (!workflow.connections || typeof workflow.connections !== 'object') {
		throw new Error(`${relativePath} must define workflow connections.`);
	}
	if (workflow.active !== false) {
		throw new Error(`${relativePath} must set active to false.`);
	}
	if (!workflow.nodes.some((node) => node.type?.startsWith(`${packageName}.`))) {
		throw new Error(`${relativePath} must demonstrate a node from ${packageName}.`);
	}

	const credentialNode = workflow.nodes.find(
		(node) => node.credentials && Object.keys(node.credentials).length > 0,
	);
	if (credentialNode) {
		throw new Error(
			`${relativePath} must not contain credential references (found on ${credentialNode.name ?? credentialNode.id}).`,
		);
	}
}

function prepareSampleWorkflows(repositoryRoot, outputFile, options = {}) {
	const samples = discoverSampleWorkflows(repositoryRoot);
	const hash = crypto.createHash('sha256');
	hash.update(options.development ? 'development-custom-types-v1' : 'package-types-v1');
	hash.update('\0');

	for (const sample of samples) {
		hash.update(sample.relativePath);
		hash.update('\0');
		hash.update(sample.source);
		hash.update('\0');
	}

	fs.writeFileSync(
		outputFile,
		`${JSON.stringify(
			samples.map((sample) =>
				options.development
					? useDevelopmentNodeTypes(sample.workflow, sample.packageName)
					: sample.workflow,
			),
			null,
			2,
		)}\n`,
	);

	return { count: samples.length, hash: hash.digest('hex') };
}

function useDevelopmentNodeTypes(workflow, packageName) {
	return {
		...workflow,
		nodes: workflow.nodes.map((node) => ({
			...node,
			type:
				typeof node.type === 'string' && node.type.startsWith(`${packageName}.`)
					? `CUSTOM.${node.type.slice(packageName.length + 1)}`
					: node.type,
		})),
	};
}

if (require.main === module) {
	const repositoryRoot = path.resolve(process.argv[2] ?? path.resolve(__dirname, '..'));
	const outputFile = process.argv[3];
	const development = process.argv.includes('--development');

	if (!outputFile) {
		console.error(
			'Usage: node scripts/prepare-sample-workflows.js <repository-root> <output-file>',
		);
		process.exit(2);
	}

	const result = prepareSampleWorkflows(repositoryRoot, path.resolve(outputFile), { development });
	process.stdout.write(`${result.hash} ${result.count}\n`);
}

module.exports = {
	discoverSampleWorkflows,
	prepareSampleWorkflows,
	useDevelopmentNodeTypes,
	validateSampleWorkflow,
};
