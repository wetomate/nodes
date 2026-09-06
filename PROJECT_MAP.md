# Project map

This repository is an npm workspace containing the shared Wetomate toolkit and the n8n community nodes built with it.

```text
.
├── configs/                    Shared build, lint, test, and formatting defaults
├── wetomate-node-toolkit/      Reusable node-building functions and TypeScript types
├── n8n-nodes-duo/              Duo Security community node package
├── n8n-nodes-rest-api/         REST API trigger and AJV validation package
├── .github/workflows/          Repository validation and npm publishing automation
├── scripts/                    Repository-wide validation utilities
├── Dockerfile.dev              n8n-based development image
├── docker-compose.dev.yml      Development runtime, source mounts, and persistent volumes
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

## Docker development environment

`Dockerfile.dev` extends the official n8n image. `docker-compose.dev.yml` bind-mounts the repository at `/workspace` and
keeps container dependencies, the npm cache, and n8n state in named volumes. The development entry point checks and
builds all workspaces, symlinks every `n8n-nodes-*` package into n8n's default `/home/node/.n8n/custom/node_modules`
directory, imports changed `examples/workflows/*.json` files, and starts the community-node source watcher before n8n
starts.

Sample workflows belong to their provider package under `n8n-nodes-*/examples/workflows` and are included in the
published package. They use stable workflow and node IDs, remain inactive, and never contain credential references. The
entry point aggregates and validates them, rewrites package node types to n8n's `CUSTOM` namespace only in the temporary
development import, then records a content hash in the persistent n8n data volume so unchanged samples aren't imported
again.

Use the root `dev:*` npm scripts to operate the environment. Source remains on the host, but dependencies stay in the
container so native packages match the n8n image. The watcher rebuilds an affected node package when its node,
credential, metadata, or icon source changes; toolkit changes rebuild every node package. A companion watcher validates
and hot imports changed `examples/workflows/*.json` files as inactive workflows. n8n's development hot reload observes
the generated `dist` files. Restarting the service repeats validation, compilation, linking, and the idempotent sample
check against the current repository source. Use `npm run dev:seed` while the main container is stopped to force a
sample re-import.

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
