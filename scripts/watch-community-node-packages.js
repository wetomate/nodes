const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

let parcelWatcher;
try {
	parcelWatcher = require("@parcel/watcher");
} catch {
	// The Docker development image provides @parcel/watcher. Keep the script
	// usable from the host for tests and lightweight local checks as well.
}

const watchedExtensions = new Set([".json", ".png", ".svg", ".ts"]);

function discoverCommunityNodePackages(repositoryRoot) {
	return fs
		.readdirSync(repositoryRoot, { withFileTypes: true })
		.filter(
			(entry) => entry.isDirectory() && entry.name.startsWith("n8n-nodes-"),
		)
		.map((entry) => {
			const directory = path.join(repositoryRoot, entry.name);
			const manifestPath = path.join(directory, "package.json");
			if (!fs.existsSync(manifestPath)) return null;

			const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
			return typeof manifest.name === "string"
				? { directory, name: manifest.name }
				: null;
		})
		.filter(Boolean)
		.sort((left, right) => left.name.localeCompare(right.name));
}

function isNodeSourceFile(fileName) {
	return (
		typeof fileName === "string" &&
		watchedExtensions.has(path.extname(fileName))
	);
}

function isWatchedPackagePath(relativePath) {
	const normalizedPath = relativePath.split(path.sep).join("/");
	return (
		normalizedPath === "package.json" ||
		((normalizedPath.startsWith("credentials/") ||
			normalizedPath.startsWith("nodes/")) &&
			isNodeSourceFile(normalizedPath))
	);
}

function runWorkspaceBuild(repositoryRoot, workspace) {
	return new Promise((resolve) => {
		const child = spawn("npm", ["run", "build", "--workspace", workspace], {
			cwd: repositoryRoot,
			stdio: "inherit",
		});
		child.once("error", (error) =>
			resolve({ code: null, error, signal: null }),
		);
		child.once("exit", (code, signal) => resolve({ code, signal }));
	});
}

function startCommunityNodeWatcher(repositoryRoot) {
	const packages = discoverCommunityNodePackages(repositoryRoot);
	const toolkitSource = path.join(
		repositoryRoot,
		"wetomate-node-toolkit",
		"src",
	);
	const pendingPackages = new Set();
	const watchers = [];
	const subscriptions = [];
	let toolkitChanged = false;
	let building = false;
	let debounceTimer;

	const scheduleBuild = (packageName, includesToolkit = false) => {
		if (packageName) pendingPackages.add(packageName);
		if (includesToolkit) {
			toolkitChanged = true;
			for (const nodePackage of packages)
				pendingPackages.add(nodePackage.name);
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => void flushBuilds(), 150);
	};

	const flushBuilds = async () => {
		if (building) return;
		building = true;

		while (toolkitChanged || pendingPackages.size > 0) {
			const buildToolkit = toolkitChanged;
			const workspaces = [...pendingPackages].sort();
			toolkitChanged = false;
			pendingPackages.clear();

			if (buildToolkit) {
				console.log(
					"Toolkit source changed; rebuilding the toolkit and community nodes...",
				);
				await runWorkspaceBuild(
					repositoryRoot,
					"@wetomate/n8n-node-toolkit",
				);
			}

			for (const workspace of workspaces) {
				console.log(`Node source changed; rebuilding ${workspace}...`);
				const result = await runWorkspaceBuild(repositoryRoot, workspace);
				if (result.code !== 0) {
					console.error(
						`${workspace} build failed${
							result.error
								? `: ${result.error.message}`
								: result.signal
									? ` with signal ${result.signal}`
									: ` with exit code ${result.code}`
						}.`,
					);
				}
			}
		}

		building = false;
	};

	const watchPackage = (nodePackage) => {
		if (parcelWatcher) {
			const subscription = parcelWatcher.subscribe(
				nodePackage.directory,
				(error, events) => {
					if (error) {
						console.error(
							`Failed to watch ${nodePackage.name}: ${error.message}`,
						);
						return;
					}

					if (
						events.some(({ path: changedPath }) =>
							isWatchedPackagePath(
								path.relative(nodePackage.directory, changedPath),
							),
						)
					) {
						scheduleBuild(nodePackage.name);
					}
				},
			);
			subscriptions.push(subscription);
			return;
		}

		for (const sourceDirectoryName of ["credentials", "nodes"]) {
			const sourceDirectory = path.join(
				nodePackage.directory,
				sourceDirectoryName,
			);
			if (!fs.existsSync(sourceDirectory)) continue;

			watchers.push(
				fs.watch(
					sourceDirectory,
					{ recursive: true },
					(_eventType, fileName) => {
						if (isNodeSourceFile(fileName))
							scheduleBuild(nodePackage.name);
					},
				),
			);
		}
	};

	for (const nodePackage of packages) watchPackage(nodePackage);

	if (fs.existsSync(toolkitSource)) {
		if (parcelWatcher) {
			subscriptions.push(
				parcelWatcher.subscribe(toolkitSource, (error, events) => {
					if (error) {
						console.error(`Failed to watch toolkit: ${error.message}`);
						return;
					}
					if (
						events.some(({ path: changedPath }) =>
							isNodeSourceFile(changedPath),
						)
					) {
						scheduleBuild(undefined, true);
					}
				}),
			);
		} else {
			watchers.push(
				fs.watch(
					toolkitSource,
					{ recursive: true },
					(_eventType, fileName) => {
						if (isNodeSourceFile(fileName))
							scheduleBuild(undefined, true);
					},
				),
			);
		}
	}

	const close = async () => {
		clearTimeout(debounceTimer);
		for (const watcher of watchers) watcher.close();
		const activeSubscriptions = await Promise.all(subscriptions);
		await Promise.all(
			activeSubscriptions.map((subscription) => subscription.unsubscribe()),
		);
	};

	console.log(
		`Watching ${packages.length} community node package(s) for source changes.`,
	);
	return { close, packages };
}

if (require.main === module) {
	const repositoryRoot = path.resolve(
		process.argv[2] ?? path.resolve(__dirname, ".."),
	);
	const watcher = startCommunityNodeWatcher(repositoryRoot);
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.once(signal, () => {
			void watcher.close().finally(() => process.exit(0));
		});
	}
}

module.exports = {
	discoverCommunityNodePackages,
	isNodeSourceFile,
	isWatchedPackagePath,
	startCommunityNodeWatcher,
};
