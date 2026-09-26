const fs = require("fs");
const path = require("path");

const repositoryRoot = path.resolve(
	process.argv[2] ?? path.resolve(__dirname, ".."),
);
const toolkitPackage = readPackage(
	path.join(repositoryRoot, "wetomate-node-toolkit"),
);
const expectedToolkitRange = `^${toolkitPackage.version}`;

const nodeDirectories = fs
	.readdirSync(repositoryRoot, { withFileTypes: true })
	.filter(
		(entry) => entry.isDirectory() && entry.name.startsWith("n8n-nodes-"),
	)
	.map((entry) => entry.name)
	.filter((directory) =>
		fs.existsSync(path.join(repositoryRoot, directory, "package.json")),
	);

if (nodeDirectories.length === 0) {
	fail("No n8n-nodes-* workspaces were found.");
}

const errors = [];

for (const directory of nodeDirectories) {
	validateNodePackage(directory);
}

if (errors.length > 0) {
	fail(errors.join("\n"));
}

console.log(
	`Validated ${nodeDirectories.length} community node package(s) against ${toolkitPackage.name}@${expectedToolkitRange}.`,
);

function validateNodePackage(directory) {
	const packageRoot = path.join(repositoryRoot, directory);
	const nodePackage = readPackage(packageRoot);
	const packageLabel = nodePackage.name ?? directory;
	const toolkitRange = nodePackage.devDependencies?.[toolkitPackage.name];
	const workflowPeerRange = nodePackage.peerDependencies?.["n8n-workflow"];
	const runtimeDependencies = Object.keys(nodePackage.dependencies ?? {});

	if (toolkitRange !== expectedToolkitRange) {
		errors.push(
			`${packageLabel} must use ${toolkitPackage.name} as a development dependency with ${expectedToolkitRange}; found ${toolkitRange ?? "no development dependency"}.`,
		);
	}

	if (runtimeDependencies.length > 0) {
		errors.push(
			`${packageLabel} must not declare runtime dependencies; found ${runtimeDependencies.join(", ")}.`,
		);
	}

	if (workflowPeerRange !== "*") {
		errors.push(
			`${packageLabel} must declare n8n-workflow as a peer dependency with *; found ${workflowPeerRange ?? "no peer dependency"}.`,
		);
	}

	const nodes = readRegisteredEntries(nodePackage, packageLabel, "nodes");
	const credentials = readRegisteredEntries(
		nodePackage,
		packageLabel,
		"credentials",
	);

	if (nodes.length === 0) {
		errors.push(
			`${packageLabel} must register at least one node under package.json n8n.nodes.`,
		);
	}

	const registeredEntries = [...nodes, ...credentials];
	const duplicateEntries = registeredEntries.filter(
		(entry, index) => registeredEntries.indexOf(entry) !== index,
	);

	if (duplicateEntries.length > 0) {
		errors.push(
			`${packageLabel} registers duplicate n8n entry points: ${[...new Set(duplicateEntries)].join(", ")}.`,
		);
	}

	for (const registeredEntry of registeredEntries) {
		validateRegisteredEntry(packageRoot, packageLabel, registeredEntry);
	}

	const registeredNodeSources = new Set(
		nodes.map(getSourceRelativePath).filter(Boolean),
	);
	validateNodeSourceNames(packageRoot, packageLabel, registeredNodeSources);
}

function readRegisteredEntries(nodePackage, packageLabel, entryType) {
	const entries = nodePackage.n8n?.[entryType] ?? [];

	if (!Array.isArray(entries)) {
		errors.push(
			`${packageLabel} package.json n8n.${entryType} must be an array.`,
		);
		return [];
	}

	return entries;
}

function validateRegisteredEntry(packageRoot, packageLabel, registeredEntry) {
	const sourceRelativePath = getSourceRelativePath(registeredEntry);

	if (!sourceRelativePath) {
		errors.push(
			`${packageLabel} has an invalid registered n8n entry point: ${String(registeredEntry)}.`,
		);
		return;
	}

	const sourcePath = path.join(packageRoot, sourceRelativePath);

	if (!fs.existsSync(sourcePath)) {
		errors.push(
			`${packageLabel} registers ${registeredEntry}, but source file ${sourceRelativePath} does not exist.`,
		);
	}
}

function getSourceRelativePath(registeredEntry) {
	if (
		typeof registeredEntry !== "string" ||
		!registeredEntry.startsWith("dist/") ||
		!registeredEntry.endsWith(".js") ||
		registeredEntry.includes("\\") ||
		path.posix.normalize(registeredEntry) !== registeredEntry
	) {
		return undefined;
	}

	return `${registeredEntry.slice("dist/".length, -".js".length)}.ts`;
}

function validateNodeSourceNames(
	packageRoot,
	packageLabel,
	registeredNodeSources,
) {
	const nodesDirectory = path.join(packageRoot, "nodes");
	if (!fs.existsSync(nodesDirectory)) return;

	const unregisteredNodeSources = findFiles(nodesDirectory)
		.filter((sourcePath) => sourcePath.endsWith(".node.ts"))
		.map((sourcePath) =>
			path.relative(packageRoot, sourcePath).split(path.sep).join("/"),
		)
		.filter((sourcePath) => !registeredNodeSources.has(sourcePath));

	if (unregisteredNodeSources.length > 0) {
		errors.push(
			`${packageLabel} has unregistered .node.ts source file(s): ${unregisteredNodeSources.join(", ")}. Only files registered under n8n.nodes may use the .node.ts suffix.`,
		);
	}
}

function findFiles(directory) {
	return fs
		.readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const entryPath = path.join(directory, entry.name);
			return entry.isDirectory() ? findFiles(entryPath) : [entryPath];
		});
}

function readPackage(directory) {
	return JSON.parse(
		fs.readFileSync(path.join(directory, "package.json"), "utf8"),
	);
}

function fail(message) {
	console.error(message);
	process.exit(1);
}
