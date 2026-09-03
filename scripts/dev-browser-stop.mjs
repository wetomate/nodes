#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const profile =
	process.env.WETOMATE_CHROME_PROFILE ||
	join(process.cwd(), ".wetomate-dev-browser");
const pidFile = join(profile, "chrome.pid");
const expectedProfile = `--user-data-dir=${profile}`;
const pids = new Set();

for (const entry of readdirSync("/proc")) {
	if (!/^\d+$/.test(entry)) continue;
	try {
		const commandLine = readFileSync(
			`/proc/${entry}/cmdline`,
			"utf8",
		).replaceAll("\0", " ");
		if (
			commandLine.includes(expectedProfile) &&
			!commandLine.includes(" --type=")
		)
			pids.add(Number(entry));
	} catch {}
}
if (existsSync(pidFile)) {
	try {
		pids.add(Number.parseInt(readFileSync(pidFile, "utf8"), 10));
	} catch {}
	unlinkSync(pidFile);
}
for (const pid of pids) {
	try {
		const commandLine = readFileSync(
			`/proc/${pid}/cmdline`,
			"utf8",
		).replaceAll("\0", " ");
		if (commandLine.includes(expectedProfile)) process.kill(pid, "SIGTERM");
	} catch (error) {
		if (error.code !== "ESRCH") throw error;
	}
}
