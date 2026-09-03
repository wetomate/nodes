const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { prepareSampleWorkflows } = require("./prepare-sample-workflows");

let parcelWatcher;
try {
	parcelWatcher = require("@parcel/watcher");
} catch {
	// The Docker development image provides @parcel/watcher. Use fs.watch as a fallback.
}

function isSampleWorkflowPath(repositoryRoot, changedPath) {
	const relativePath = path
		.relative(repositoryRoot, changedPath)
		.split(path.sep)
		.join("/");
	return /^n8n-nodes-[^/]+\/examples\/workflows\/[^/]+\.json$/.test(
		relativePath,
	);
}

function importSampleWorkflows(repositoryRoot, dataDirectory) {
	const temporaryDirectory = fs.mkdtempSync(
		path.join(os.tmpdir(), "wetomate-sample-watch-"),
	);
	const inputFile = path.join(temporaryDirectory, "workflows.json");
	const markerFile = path.join(
		dataDirectory,
		".wetomate-sample-workflows.sha256",
	);
	const cleanup = () =>
		fs.rmSync(temporaryDirectory, { recursive: true, force: true });

	try {
		const result = prepareSampleWorkflows(repositoryRoot, inputFile, {
			development: true,
		});
		const currentHash = fs.existsSync(markerFile)
			? fs.readFileSync(markerFile, "utf8").split("\n", 1)[0]
			: "";
		if (result.hash === currentHash) {
			cleanup();
			return Promise.resolve({ changed: false });
		}

		return new Promise((resolve) => {
			const child = spawn(
				"n8n",
				["import:workflow", `--input=${inputFile}`, "--activeState=false"],
				{
					cwd: repositoryRoot,
					stdio: "inherit",
				},
			);
			child.once("error", (error) => {
				cleanup();
				resolve({ changed: true, error });
			});
			child.once("exit", (code, signal) => {
				if (code === 0) {
					fs.writeFileSync(markerFile, `${result.hash}\n`);
					console.log(
						`Imported ${result.count} changed Wetomate sample workflow(s).`,
					);
					cleanup();
					resolve({ changed: true });
					return;
				}
				cleanup();
				resolve({
					changed: true,
					error: new Error(
						`n8n import exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
					),
				});
			});
		});
	} catch (error) {
		cleanup();
		throw error;
	}
}

function startSampleWorkflowWatcher(repositoryRoot, dataDirectory) {
	const watchers = [];
	const subscriptions = [];
	let debounceTimer;
	let importing = false;
	let pending = false;

	const scheduleImport = () => {
		pending = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => void flush(), 250);
	};
	const flush = async () => {
		if (importing || !pending) return;
		pending = false;
		importing = true;
		try {
			const result = await importSampleWorkflows(
				repositoryRoot,
				dataDirectory,
			);
			if (result.error)
				console.error(
					`Sample workflow hot reload failed: ${result.error.message}`,
				);
		} catch (error) {
			console.error(`Sample workflow hot reload failed: ${error.message}`);
		} finally {
			importing = false;
			if (pending) void flush();
		}
	};
	const handleChange = (changedPath) => {
		if (isSampleWorkflowPath(repositoryRoot, changedPath)) scheduleImport();
	};

	if (parcelWatcher) {
		subscriptions.push(
			parcelWatcher.subscribe(repositoryRoot, (error, events) => {
				if (error) {
					console.error(
						`Failed to watch sample workflows: ${error.message}`,
					);
					return;
				}
				for (const event of events) handleChange(event.path);
			}),
		);
	} else {
		for (const packageDirectory of fs.readdirSync(repositoryRoot, {
			withFileTypes: true,
		})) {
			if (
				!packageDirectory.isDirectory() ||
				!packageDirectory.name.startsWith("n8n-nodes-")
			)
				continue;
			const directory = path.join(
				repositoryRoot,
				packageDirectory.name,
				"examples",
				"workflows",
			);
			if (fs.existsSync(directory))
				watchers.push(
					fs.watch(directory, (_event, fileName) => {
						if (fileName) handleChange(path.join(directory, fileName));
					}),
				);
		}
	}

	console.log("Watching sample workflows for hot reloads.");
	return {
		close: async () => {
			clearTimeout(debounceTimer);
			for (const watcher of watchers) watcher.close();
			const activeSubscriptions = await Promise.all(subscriptions);
			await Promise.all(
				activeSubscriptions.map((subscription) =>
					subscription.unsubscribe(),
				),
			);
		},
		scheduleImport,
	};
}

if (require.main === module) {
	const repositoryRoot = path.resolve(
		process.argv[2] ?? path.resolve(__dirname, ".."),
	);
	const dataDirectory =
		process.env.WETOMATE_N8N_DATA_DIRECTORY || "/home/node/.n8n";
	const watcher = startSampleWorkflowWatcher(repositoryRoot, dataDirectory);
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.once(
			signal,
			() => void watcher.close().finally(() => process.exit(0)),
		);
	}
}

module.exports = {
	importSampleWorkflows,
	isSampleWorkflowPath,
	startSampleWorkflowWatcher,
};
