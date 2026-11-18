---
name: wetomate-transformers
description: Add, rename, review, or use Wetomate toolkit transformers and other parameter-mapping helpers. Use when a node needs to convert n8n parameter values before a request, when writing a `transform` for a `ParameterMappingRule`, or when naming a new toolkit helper; do not activate for unrelated provider-node edits.
---

# Wetomate Transformers

The **Transformers** section of `wetomate-node-toolkit/README.md` is the source of truth for available transformers and helper naming conventions. Read it before writing any transform.

## Using a transformer

1. Check the Transformers table for an existing transformer that fits. Prefer it over an inline transform.
2. Respect the table's `target` column:
   - A transformer used without `target` must return an object (merged into the output) or `null`/`undefined`.
   - A transformer used with `target` may return any value, assigned at that path.
3. Don't trim strings in a transformer; `mapNodeParameters()` already trims every string at any depth.
4. Use an inline transform for logic specific to one provider node and keep it in that node package.

## Adding a transformer to the toolkit

Add one only when at least two node packages need it, or when it fixes a concrete correctness problem. Otherwise keep it in the node package.

1. Name it `transform<Input>To<Output>` (for example, `transformZeroToUndefined`). Name other helpers by role:
   - `validate…` throws or reports invalid input.
   - `map…` converts one known shape to another.
   - `set…` mutates a supplied object.
   - `is…` / `has…` returns a boolean.
2. Put it in `wetomate-node-toolkit/src/transformers.ts`. It's exported through `src/index.ts`.
3. Type it as `ParameterValueTransformer` (untargeted) or `TargetedParameterTransformer` (targeted). Set `runOnMissing = true` only when it must run without a parameter value.
4. Keep it pure: don't mutate the input value, and read n8n data only through the provided context.
5. Write a JSDoc comment that states whether it needs `target` and includes an `@example` mapping rule.
6. Add tests in `wetomate-node-toolkit/test/transformers.test.ts`, covering missing, edge, and non-mutation cases.
7. Add a row to the Transformers table in the toolkit README, and update the usage example if it helps.
8. Record the addition under `Unreleased` in `CHANGELOG.md`.

## Renaming or removing a transformer

Renaming a public export is a breaking change. Search every `n8n-nodes-*` package for consumers, keep a `@deprecated` alias for one major release when practical, and update the README table, tests, and changelog in the same change. Follow `$wetomate-toolkit-design` for compatibility decisions.

## Checks

From `wetomate-node-toolkit`, run `npm run build` and `npm test`. If a node package changed, run its build and tests too.
