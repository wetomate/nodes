# @wetomate/n8n-node-toolkit

> Shared TypeScript utilities for building consistent Wetomate n8n nodes.

The toolkit provides composable helpers for processing and cleaning node parameters before sending them to external APIs. It keeps standard n8n UI properties separate from execution-time mapping while standardizing optional fields, custom transformations, and request-ready payload generation across Wetomate integrations.

## Features

- Map standard n8n parameters with `mapNodeParameters()` and declarative rules.
- Rename, omit, or transform values without extending `INodeProperties`.
- Preserve per-item expression evaluation by passing the current item index.
- Transform optional and complex input collections.
- Bundle reusable processing code into self-contained community-node packages.

## Installation

```bash
npm install @wetomate/n8n-node-toolkit
```

Community-node packages in this repository declare the toolkit as a development dependency. The shared build bundles it into each node's `dist` output, so published nodes don't require it at runtime.

## Parameter mapping

Keep the node editor definition as a normal `INodeProperties[]`:

```ts
export const properties: INodeProperties[] = [
	{
		displayName: "User",
		name: "userLocator",
		type: "resourceLocator",
		default: { mode: "username", value: "" },
	},
];
```

Define execution-time mapping separately:

```ts
import {
	mapNodeParameters,
	type ParameterMappingRule,
} from "@wetomate/n8n-node-toolkit";

const rules: readonly ParameterMappingRule[] = [
	{
		parameter: "userLocator",
		transform: (value) => {
			if (!value || typeof value !== "object") return;

			const locator = value as { mode?: string; value?: string };
			return locator.mode && locator.value
				? { [locator.mode]: locator.value }
				: undefined;
		},
	},
	{ parameter: "deviceName", target: "device_name" },
];

const requestParameters = mapNodeParameters(this, itemIndex, rules);
```

Rules without a transformer stringify and trim their value. A transformer can return several fields or return `null`/`undefined` to omit a value. Later rules replace earlier fields with the same name.

`IWetomateNodeProperties` and `WetomateNodePropertiesArray` remain available as deprecated compatibility exports. New nodes should use standard n8n properties and separate `ParameterMappingRule` values.

## Benefits

- Reduces boilerplate when handling node parameters across integrations.
- Standardizes optional and dynamic fields.
- Keeps request payload generation consistent across nodes.
- Keeps provider-specific mapping rules out of the shared toolkit.

## Contributing

Issues and pull requests are welcome. Keep provider-specific behavior in its node package and add tests for changes to public toolkit behavior.

## License

[MIT](./LICENSE.md)
