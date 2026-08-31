# Project map

This repository is an npm workspace containing the shared Wetomate toolkit and the n8n community nodes built with it.

```text
.
├── configs/                    Shared build, lint, test, and formatting defaults
├── wetomate-node-toolkit/      Reusable node-building functions and TypeScript types
├── scripts/                    Repository-wide validation utilities
├── package.json                Workspace membership and repository-wide commands
└── package-lock.json           Reproducible dependency graph for all workspaces
```

## Package boundaries

`wetomate-node-toolkit` owns provider-neutral abstractions, public types, and reusable parameter-processing behavior. It
keeps standard n8n UI properties separate from execution-time mapping rules. A change belongs there when more than one
provider node can use it without knowing about a provider API.

Each `n8n-nodes-*` workspace owns its provider credentials, operations, fields, request handling, icons, and
provider-specific tests. Node packages may use `@wetomate/n8n-node-toolkit` during development; the toolkit must not
depend on a provider package.

## Toolkit dependency resolution

`npm ci` links `@wetomate/n8n-node-toolkit` from the current repository into every `n8n-nodes-*` workspace. Because the
toolkit appears before the node-package glob in the root workspace list, repository-wide builds compile the current
toolkit before compiling the nodes.

Each node package declares `@wetomate/n8n-node-toolkit` as a development dependency with a normal npm semver range
matching the current toolkit version. Do not use `file:`, `link:`, or `workspace:` dependency protocols. The shared
package build derives source entry points from the package's `n8n.nodes` and `n8n.credentials` registrations and bundles
the toolkit and package implementation dependencies into the generated JavaScript. This preserves maintained sources
while keeping published community nodes free of runtime dependencies. `npm run check:packages` enforces the toolkit
range, peer dependency, runtime dependency, and registered-source rules, and node packages run the same check before
packing.

## Shared configuration

Configuration intended for all community node packages belongs in `configs`. The community-node packages use the
official n8n CLI configuration for linting and keep node-local configuration files aligned with the official tool:

| Concern    | Shared base                                             | Node-local entry point          |
|------------|---------------------------------------------------------|---------------------------------|
| TypeScript | `configs/tsconfig.base.json`                            | `n8n-nodes-*/tsconfig.json`     |
| ESLint     | `@n8n/node-cli/eslint`                                  | `n8n-nodes-*/eslint.config.mjs` |
| Prettier   | `configs/.prettierrc.base.js`                           | `n8n-nodes-*/.prettierrc.js`    |
| Jest       | `configs/jest.base.js`                                  | `n8n-nodes-*/jest.config.js`    |
| Node build | `@n8n/node-cli` plus `configs/build-community-node.mjs` | Package `build` script          |

Change a shared base when the rule should apply to every node. Add a node-local override only when the package genuinely
differs, and keep that override as small as possible. The toolkit may also extend a shared base, but it can override
node-oriented defaults that do not fit a library package; its Jest and TypeScript files demonstrate this pattern.

## Adding a community node

Create the provider package as a root npm workspace named `n8n-nodes-<provider>` so the root workspace glob includes it
automatically. Reuse the base configuration files above, add only provider-specific source and metadata, and declare the
current `@wetomate/n8n-node-toolkit` version as a development dependency with a caret range. Register every node and
credential under the package's `n8n` metadata, use the shared bundler, and keep `n8n-workflow` as a `*` peer dependency.
Update release selection, the root package table, and this map when the new package changes those lists.
