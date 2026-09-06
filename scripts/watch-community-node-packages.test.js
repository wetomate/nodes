const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { afterEach, describe, it } = require("node:test");

const {
	discoverCommunityNodePackages,
	isNodeSourceFile,
	isWatchedPackagePath,
} = require("./watch-community-node-packages");
const { isSampleWorkflowPath } = require("./watch-sample-workflows");

const temporaryDirectories = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		fs.rmSync(directory, { force: true, recursive: true });
	}
});

describe("community node development watcher", () => {
	it("recognizes package sample workflow changes", () => {
		const repositoryRoot = "/workspace";

		assert.equal(
			isSampleWorkflowPath(
				repositoryRoot,
				"/workspace/n8n-nodes-duo/examples/workflows/approval.json",
			),
			true,
		);
		assert.equal(
			isSampleWorkflowPath(
				repositoryRoot,
				"/workspace/n8n-nodes-duo/README.md",
			),
			false,
		);
		assert.equal(
			isSampleWorkflowPath(
				repositoryRoot,
				"/workspace/n8n-nodes-duo/examples/workflows/approval.md",
			),
			false,
		);
	});

	it("discovers node workspaces in package-name order", () => {
		const repositoryRoot = fs.mkdtempSync(
			path.join(os.tmpdir(), "wetomate-watcher-"),
		);
		temporaryDirectories.push(repositoryRoot);

		for (const packageName of ["n8n-nodes-zeta", "n8n-nodes-alpha"]) {
			const packageRoot = path.join(repositoryRoot, packageName);
			fs.mkdirSync(packageRoot);
			fs.writeFileSync(
				path.join(packageRoot, "package.json"),
				JSON.stringify({ name: packageName }),
			);
		}
		fs.mkdirSync(path.join(repositoryRoot, "not-a-node-package"));

		assert.deepEqual(
			discoverCommunityNodePackages(repositoryRoot).map(({ name }) => name),
			["n8n-nodes-alpha", "n8n-nodes-zeta"],
		);
	});

	it("watches node source, metadata, and icon file extensions", () => {
		for (const fileName of [
			"Node.node.ts",
			"package.json",
			"icon.svg",
			"icon.png",
		]) {
			assert.equal(isNodeSourceFile(fileName), true, fileName);
		}

		for (const fileName of ["README.md", "Node.node.js.map", undefined]) {
			assert.equal(isNodeSourceFile(fileName), false, String(fileName));
		}
	});

	it("ignores generated files while watching package roots", () => {
		for (const fileName of [
			"package.json",
			"nodes/RestApi/RestApi.node.ts",
			"credentials/RestApiHeaderAuthApi.credentials.ts",
			"nodes/RestApi/rest-api.svg",
		]) {
			assert.equal(isWatchedPackagePath(fileName), true, fileName);
		}

		for (const fileName of [
			"dist/nodes/RestApi.node.js",
			"README.md",
			"examples/workflows/example.json",
		]) {
			assert.equal(isWatchedPackagePath(fileName), false, fileName);
		}
	});
});
