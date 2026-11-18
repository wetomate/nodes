# @wetomate/n8n-node-toolkit

> Shared TypeScript utilities for building consistent Wetomate n8n nodes.

The toolkit provides composable helpers for processing and cleaning node parameters before sending them to external APIs. It keeps standard n8n UI properties separate from execution-time mapping while standardizing optional fields, custom transformations, and request-ready payload generation across Wetomate integrations.

## Features

- Map standard n8n parameters with `mapNodeParameters()` and declarative rules.
- Rename, omit, or transform values without extending `INodeProperties`.
- Preserve per-item expression evaluation by passing the current item index.
- Transform optional and complex input collections.
- Verify supported HMAC, RSA, RSA-PSS, and ECDSA JWTs with the built-in crypto module.
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

Rules without a transformer preserve their type and trim every string inside arrays and plain objects, at any depth; other objects such as `Date` are kept unchanged. Use `target` to write to an output property; dotted paths build nested objects (for example, `hero.config.items`) and only descend into plain objects, so a path beneath a value such as a `Date` replaces it instead of mutating it. Paths containing `__proto__`, `constructor`, or `prototype` throw a `TypeError`. Use `staticValue` to supply a literal instead of reading an n8n parameter. A transformer without a `target` must return a plain object whose fields are merged into the mapped parameters, or `null`/`undefined` to omit them; a `__proto__`, `constructor`, or `prototype` field throws a `TypeError`. A transformer with a `target` may return any value, which is assigned at that path, or `null`/`undefined` to omit it. Invalid untargeted results throw rather than being silently dropped. `transformInputItemsToArray(...)` maps the supplied rules for every n8n input item into an array. Later rules replace earlier fields with the same name.

Type a transformer as `ParameterValueTransformer` when it merges object fields without a `target`, or as `TargetedParameterTransformer` when its result is assigned to a `target`.

New nodes should use standard n8n properties and separate `ParameterMappingRule` values.

## Migrating from 1.x to 2.0

Version 2.0 changes existing mapping behavior; it is not a drop-in replacement for every 1.x consumer.

- Direct rules preserve value types instead of stringifying them. To keep a provider's string payload contract, use `{ parameter: "device", target: "device", transform: String }`. Missing values remain omitted, while zero and booleans become strings. The mapper handles trimming.
- Transforms with `target` assign their complete result to that path. Remove `target` when an object result should still merge at the top level; keep it when the result is the target's value.
- Dots in output names now denote nested paths, not literal keys.
- Transform results now have strings trimmed deeply. Whitespace-sensitive integrations must review this behavior; there is no rule-level opt-out.
- Replace imports of `ParameterTransformer` with `ParameterValueTransformer` (merged fields) or `TargetedParameterTransformer` (assigned value). `ParameterMappingRule` is now a union type; use a type intersection instead of interface extension when adding metadata.
- Untargeted transforms must return a plain object or a nullish value. Unsafe mapping paths and top-level merge keys are rejected.

`processOptionalCollections` has been removed. Use `transformOptionalCollectionToFields` for the provider-neutral collection copy. If a provider requires strings and null omission, apply those conversions to the returned copy in a node-local transform, without a `target`. The mapper handles trimming. A direct replacement alone would change value types and retain null fields.

## Transformers

Transformers are reusable `transform` functions for `ParameterMappingRule` values. Use one from this table before writing an inline transform, and add every new reusable transformer to the table in the same change.

| Transformer | Input → output | Use with `target` | Runs when the value is missing | Use it to |
| --- | --- | --- | --- | --- |
| `transformInputItemsToArray(...rules)` | All n8n input items → array of objects mapped with `rules` | Required | Yes | Build a list field from every input item, such as table rows or batch entries. A single input item with empty JSON produces `[]`. |
| `transformOptionalCollectionToFields` | Collection object → shallow copy of its fields | No; fields are merged into the output | No | Spread an **Additional Fields** collection into the request body. |
| `transformZeroToUndefined` | `0` → `undefined`; other values unchanged | Yes | No | Omit an optional number field left at its `0` default. |

`mapNodeParameters()` trims every string inside arrays and plain objects in a mapped or transformed value, at any depth, so transformers don't need to trim strings themselves. Other objects, such as `Date`, are kept unchanged.

```ts
import {
	transformInputItemsToArray,
	transformOptionalCollectionToFields,
	transformZeroToUndefined,
	type ParameterMappingRule,
} from "@wetomate/n8n-node-toolkit";

const rules: readonly ParameterMappingRule[] = [
	{
		target: "items",
		transform: transformInputItemsToArray(
			{ parameter: "listItemTitle", target: "title" },
			{
				parameter: "listOptionalFields",
				transform: transformOptionalCollectionToFields,
			},
		),
	},
	{
		parameter: "limit",
		target: "limit",
		transform: transformZeroToUndefined,
	},
];
```

### Naming conventions

Name toolkit helpers by their role so each call site shows what the helper does:

| Prefix | Role | Example |
| --- | --- | --- |
| `transform…` | Converts a parameter value for a mapping rule | `transformZeroToUndefined` |
| `validate…` | Throws or reports invalid input | `validateClaims` |
| `map…` | Converts one known shape to another | `mapNodeParameters` |
| `set…` | Mutates a supplied object | `setValueAtPath` |
| `is…` / `has…` | Returns a boolean | `hasSingleEmptyJsonInputItem` |

Describe the input and output in the name, for example `transformOptionalCollectionToFields` instead of `spreadOptionalCollections`.

## JWT verification

Use the dedicated subpath when a node must verify a JWT with a caller-provided key:

```ts
import {
	verifyJwt,
	type JwtAlgorithm,
} from "@wetomate/n8n-node-toolkit/jwt-verification";

const payload = verifyJwt(token, verificationKey, algorithm as JwtAlgorithm);
```

The verifier checks the token signature, the declared algorithm, and numeric `exp` and `nbf` claims. It only uses Node's built-in `node:crypto` APIs, so importing it does not pull the rest of the toolkit into a node bundle.

## Benefits

- Reduces boilerplate when handling node parameters across integrations.
- Standardizes optional and dynamic fields.
- Keeps request payload generation consistent across nodes.
- Keeps provider-specific mapping rules out of the shared toolkit.

## Contributing

Issues and pull requests are welcome. Keep provider-specific behavior in its node package and add tests for changes to public toolkit behavior.

## License

[MIT](./LICENSE.md)
