import { build } from "esbuild";
import {
	access,
	copyFile,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
} from "node:fs/promises";
import { builtinModules } from "node:module";
import { join, posix, resolve } from "node:path";

const packageRoot = resolve(process.argv[2] ?? process.cwd());
const packageManifestPath = join(packageRoot, "package.json");
const packageManifest = JSON.parse(await readFile(packageManifestPath, "utf8"));
const distDirectory = join(packageRoot, "dist");
const stagingDirectory = join(packageRoot, ".dist-build");

const registeredEntries = [
	...readRegisteredEntries(packageManifest, "nodes"),
	...readRegisteredEntries(packageManifest, "credentials"),
];

if (registeredEntries.length === 0) {
	throw new Error(
		`${packageManifest.name ?? packageRoot} does not register any n8n entry points.`,
	);
}

const entryPoints = Object.create(null);

for (const registeredEntry of registeredEntries) {
	const outputName = getOutputName(registeredEntry);
	const sourcePath = join(packageRoot, `${outputName}.ts`);

	if (entryPoints[outputName]) {
		throw new Error(
			`${packageManifest.name ?? packageRoot} registers duplicate n8n entry point ${registeredEntry}.`,
		);
	}

	await access(sourcePath);
	entryPoints[outputName] = sourcePath;
}

await rm(stagingDirectory, { force: true, recursive: true });

const result = await build({
	bundle: true,
	entryPoints,
	external: ["n8n-workflow"],
	format: "cjs",
	metafile: true,
	outdir: stagingDirectory,
	platform: "node",
	sourcemap: true,
	sourcesContent: false,
	target: "node22",
});

await copyAssets(join(packageRoot, "nodes"), join(stagingDirectory, "nodes"));
await copyAssets(
	join(packageRoot, "credentials"),
	join(stagingDirectory, "credentials"),
);

const allowedExternalImports = new Set([
	"n8n-workflow",
	...builtinModules,
	...builtinModules.map((moduleName) => `node:${moduleName}`),
]);
const unexpectedExternalImports = Object.values(result.metafile.outputs)
	.flatMap((output) => output.imports)
	.filter((entry) => entry.external && !allowedExternalImports.has(entry.path))
	.map((entry) => entry.path);

if (unexpectedExternalImports.length > 0) {
	throw new Error(
		`Unexpected runtime dependencies in ${packageManifest.name ?? packageRoot}: ${[
			...new Set(unexpectedExternalImports),
		].join(", ")}`,
	);
}

// The official n8n-node build may have emitted the complete TypeScript source
// tree into dist. Replace it with the bundled package so tests and source
// modules cannot leak into the published artifact.
await rm(distDirectory, { force: true, recursive: true });
await mkdir(distDirectory, { recursive: true });
for (const outputFile of await listFiles(stagingDirectory)) {
	const relativePath = outputFile.slice(stagingDirectory.length + 1);
	const destination = join(distDirectory, relativePath);
	await mkdir(join(destination, ".."), { recursive: true });
	await rename(outputFile, destination);
}
await rm(stagingDirectory, { force: true, recursive: true });

function readRegisteredEntries(manifest, entryType) {
	const entries = manifest.n8n?.[entryType] ?? [];

	if (!Array.isArray(entries)) {
		throw new TypeError(`package.json n8n.${entryType} must be an array.`);
	}

	return entries;
}

function getOutputName(registeredEntry) {
	if (
		typeof registeredEntry !== "string" ||
		!registeredEntry.startsWith("dist/") ||
		!registeredEntry.endsWith(".js") ||
		registeredEntry.includes("\\") ||
		posix.normalize(registeredEntry) !== registeredEntry
	) {
		throw new Error(
			`Registered n8n entry point must use the form dist/path/to/entry.js: ${String(registeredEntry)}`,
		);
	}

	return registeredEntry.slice("dist/".length, -".js".length);
}

async function listFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
		else files.push(entryPath);
	}

	return files;
}

async function copyAssets(sourceDirectory, destinationDirectory) {
	let entries;
	try {
		entries = await readdir(sourceDirectory, { withFileTypes: true });
	} catch (error) {
		if (error.code === "ENOENT") return;
		throw error;
	}

	for (const entry of entries) {
		const source = join(sourceDirectory, entry.name);
		const destination = join(destinationDirectory, entry.name);
		if (entry.isDirectory()) {
			await copyAssets(source, destination);
			continue;
		}

		const extension = entry.name
			.slice(entry.name.lastIndexOf("."))
			.toLowerCase();
		if (![".png", ".svg"].includes(extension)) continue;
		await mkdir(destinationDirectory, { recursive: true });
		await copyFile(source, destination);
	}
}
