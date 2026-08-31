module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: "@typescript-eslint/parser",

	parserOptions: {
		sourceType: "module",
		project: "./tsconfig.json",
	},

	ignorePatterns: [
		".eslintrc.js",
		"**/*.js",
		"**/node_modules/**",
		"**/dist/**",
	],

	overrides: [
		{
			files: ["package.json"],
			parser: "jsonc-eslint-parser",
			parserOptions: {
				project: null,
			},
			plugins: ["eslint-plugin-n8n-nodes-base"],
			extends: ["plugin:n8n-nodes-base/community"],
		},
		{
			files: ["./credentials/**/*.ts"],
			plugins: ["eslint-plugin-n8n-nodes-base"],
			extends: ["plugin:n8n-nodes-base/credentials"],
			rules: {
				"n8n-nodes-base/cred-class-field-type-options-password-missing":
					"off",
				"n8n-nodes-base/cred-class-field-documentation-url-miscased": "off",
			},
		},
		{
			files: ["./nodes/**/*.ts"],
			plugins: ["eslint-plugin-n8n-nodes-base"],
			extends: ["plugin:n8n-nodes-base/nodes"],
			rules: {
				"n8n-nodes-base/node-param-options-type-unsorted-items": "off",
				"n8n-nodes-base/node-class-description-inputs-wrong-regular-node":
					"off",
				"n8n-nodes-base/node-class-description-outputs-wrong": "off",
				"n8n-nodes-base/node-param-type-options-password-missing": "off",
			},
		},
	],

	plugins: ["@typescript-eslint", "n8n-nodes-base"],

	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:n8n-nodes-base/community",
	],
};
