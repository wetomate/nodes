#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const baseUrl = process.env.WETOMATE_N8N_URL || "http://127.0.0.1:5678";
const landingUrl = new URL("/home/workflows", baseUrl).toString();
const email = process.env.WETOMATE_N8N_EMAIL || "dev@wetomate.local";
const password = process.env.WETOMATE_N8N_PASSWORD || "Wetomate123!";
const profile =
	process.env.WETOMATE_CHROME_PROFILE ||
	join(process.cwd(), ".wetomate-dev-browser");
const chrome = process.env.WETOMATE_CHROME || "google-chrome";
const debugPort = Number(process.env.WETOMATE_CHROME_DEBUG_PORT || 9222);
const pidFile = join(profile, "chrome.pid");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForN8n() {
	for (let attempt = 0; attempt < 90; attempt += 1) {
		try {
			if ((await fetch(`${baseUrl}/rest/settings`)).ok) return;
		} catch {}
		await sleep(1000);
	}
	throw new Error(`n8n did not become ready at ${baseUrl}`);
}

async function listTabs() {
	const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
	if (!response.ok)
		throw new Error(`could not list Chrome tabs (${response.status})`);
	return response.json();
}

async function newTab() {
	const response = await fetch(
		`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(landingUrl)}`,
		{ method: "PUT" },
	);
	if (!response.ok)
		throw new Error(`could not create Chrome tab (${response.status})`);
	return response.json();
}

function connect(endpoint) {
	const socket = new WebSocket(endpoint);
	const pending = new Map();
	let id = 0;
	socket.addEventListener("message", ({ data }) => {
		const message = JSON.parse(data);
		const resolve = pending.get(message.id);
		if (resolve) {
			pending.delete(message.id);
			resolve(message);
		}
	});
	const ready = new Promise((resolve, reject) => {
		socket.addEventListener("open", resolve, { once: true });
		socket.addEventListener("error", reject, { once: true });
	});
	return {
		call: async (method, params = {}) => {
			await ready;
			const requestId = ++id;
			const result = new Promise((resolve) =>
				pending.set(requestId, resolve),
			);
			socket.send(JSON.stringify({ id: requestId, method, params }));
			const message = await result;
			if (message.error) throw new Error(message.error.message);
			return message.result;
		},
		close: () => socket.close(),
	};
}

const login = (user, secret) => `(() => {
  const inputs = [...document.querySelectorAll('input')];
  const email = inputs.find((input) => input.type === 'email' || /email/i.test(input.name || input.placeholder || ''));
  const password = inputs.find((input) => input.type === 'password');
  if (!email || !password) return document.readyState === 'complete' && document.body?.children.length && !/login|signin|sign-in/i.test(location.pathname) ? 'signed-in' : 'waiting';
  if (window.__wetomateLoginSubmitted) return 'waiting';
  const setValue = (input, value) => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  };
  const expectedEmail = ${JSON.stringify(user)};
  const expectedPassword = ${JSON.stringify(secret)};
  if (email.value !== expectedEmail || password.value !== expectedPassword) {
    setValue(email, expectedEmail); setValue(password, expectedPassword); return 'filled';
  }
  const form = email.closest('form') || password.closest('form');
  const button = form?.querySelector('button[type="submit"]') || [...document.querySelectorAll('button')].find((item) => /sign in|log in/i.test(item.textContent || ''));
  if (!button || button.disabled) return 'waiting';
  window.__wetomateLoginSubmitted = true; button.click(); return 'submitted';
})()`;

try {
	await waitForN8n();
	mkdirSync(profile, { recursive: true });
	let tabs;
	try {
		tabs = await listTabs();
	} catch {
		const child = spawn(
			chrome,
			[
				`--remote-debugging-port=${debugPort}`,
				`--user-data-dir=${profile}`,
				"--no-first-run",
				"--no-default-browser-check",
				"--new-window",
				landingUrl,
			],
			{ detached: true, stdio: "ignore" },
		);
		child.unref();
		writeFileSync(pidFile, `${child.pid}\n`);
		for (let attempt = 0; attempt < 30; attempt += 1) {
			try {
				if ((await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok)
					break;
			} catch {}
			await sleep(250);
		}
		tabs = await listTabs();
	}
	const tab =
		tabs.find(
			(candidate) =>
				candidate.type === "page" && candidate.url.startsWith(baseUrl),
		) ?? (await newTab());
	const cdp = connect(tab.webSocketDebuggerUrl);
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const result = await cdp.call("Runtime.evaluate", {
				expression: login(email, password),
				returnByValue: true,
			});
			if (result.result?.value === "signed-in") {
				console.log(`n8n signed in automatically at ${baseUrl}`);
				cdp.close();
				process.exit(0);
			}
		} catch {
			/* Navigation replaces the SPA execution context after submit. */
		}
		await sleep(500);
	}
	throw new Error("n8n login form was not found");
} catch (error) {
	console.error(`Automatic n8n sign-in failed: ${error.message}`);
	console.error(`Open ${baseUrl} and sign in with ${email}.`);
	process.exitCode = 1;
}
