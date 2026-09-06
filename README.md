# Wetomate Nodes

Wetomate (we + automate) builds services and reusable tooling around [n8n](https://n8n.io). This repository contains our TypeScript toolkit for creating n8n integrations and the community node packages built with it.

## Packages

| Package                      | Directory                                          | Purpose                                                                      |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@wetomate/n8n-node-toolkit` | [`wetomate-node-toolkit`](./wetomate-node-toolkit) | Shared types and composable parameter-processing utilities for node authors. |
| `n8n-nodes-duo`              | [`n8n-nodes-duo`](./n8n-nodes-duo)                 | Duo Security authentication operations for n8n workflows.                    |
| `n8n-nodes-rest-api`         | [`n8n-nodes-rest-api`](./n8n-nodes-rest-api)       | REST API trigger with AJV JSON Schema request validation.                    |

## Development

Node.js 22 or newer and npm are required. Install all workspace dependencies from the repository root:

```bash
npm ci
```

Run the repository checks with:

```bash
npm run build
npm run lint
npm test
```

Package-specific commands can be run with npm workspaces, for example:

```bash
npm run build --workspace @wetomate/n8n-node-toolkit
npm run test --workspace n8n-nodes-duo
npm test --workspace n8n-nodes-rest-api
```

Keep reusable node-building behavior in the toolkit and provider-specific behavior in the relevant node package.
See the [project map](./PROJECT_MAP.md) for directory responsibilities, dependency boundaries, and the shared configuration policy.

### Tests

Run every workspace test from the repository root with `npm test`. To run only the Duo Security package or its workflow-level node suite, use:

```bash
npm run test --workspace n8n-nodes-duo
npm run test --workspace n8n-nodes-duo -- DuoSecurity.node.test.ts --runInBand
```

The Duo node suite executes `.workflow.json` fixtures through an n8n workflow harness. Fixtures keep the expected node output as pinned data, and `nock` mocks Duo API requests, so tests do not require live credentials or network access to Duo.

Use `npm run dev:check` for the complete containerized test path. It builds the development image, installs the locked workspace dependencies in the Docker volume when needed, then runs dependency validation, lint, Jest tests, and builds for every workspace. The command exits after validation and does not start the n8n editor.

### Docker development environment

Docker and Docker Compose can provide the complete build and n8n runtime without installing Node.js dependencies on the host.

> [!IMPORTANT]
> Copy `.env.example` to `.env` before the first run and review its local login credentials and runtime settings. The `.env` file is ignored by Git. n8n 2.17.0 or newer applies the configured owner account on every startup, so change the values in `.env` rather than in the editor.

```bash
cp .env.example .env
```

| Variable                         | Default                       | Purpose                                                      |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `N8N_VERSION`                    | `latest`                      | Selects the n8n image version.                               |
| `GENERIC_TIMEZONE`               | `UTC`                         | Sets the container and n8n timezone.                         |
| `N8N_LOG_LEVEL`                  | `debug`                       | Controls n8n runtime logging.                                |
| `NPM_CONFIG_LOGLEVEL`            | `verbose`                     | Controls dependency-install logging.                         |
| `NPM_CONFIG_REGISTRY`            | `https://registry.npmjs.org/` | Selects the registry used by the image build and `npm ci`.   |
| `WETOMATE_N8N_EMAIL`             | `dev@wetomate.local`          | Sets the local n8n owner login.                              |
| `WETOMATE_N8N_FIRST_NAME`        | `Wetomate`                    | Sets the local owner's first name.                           |
| `WETOMATE_N8N_LAST_NAME`         | `Developer`                   | Sets the local owner's last name.                            |
| `WETOMATE_N8N_PASSWORD`          | `Wetomate123!`                | Sets the local n8n owner password.                           |
| `WETOMATE_AUTO_LOGIN`            | `true`                        | Opens Chrome and signs in to the local editor automatically. |
| `WETOMATE_N8N_URL`               | `http://127.0.0.1:5678`       | URL used by the browser login helper.                        |
| `WETOMATE_CHROME_PROFILE`        | `.wetomate-dev-browser`       | Dedicated Chrome profile used by the development browser.    |
| `WETOMATE_CHROME`                | `google-chrome`               | Chrome executable used by the login helper.                  |
| `WETOMATE_CHROME_DEBUG_PORT`     | `9222`                        | Local Chrome DevTools Protocol port.                         |
| `WETOMATE_SEED_SAMPLE_WORKFLOWS` | `true`                        | Imports changed sample workflows on startup.                 |

These credentials are intended only for the local development instance. Start it with:

```bash
npm run dev
```

With `WETOMATE_AUTO_LOGIN=true`, the command starts a dedicated Chrome profile, opens the editor, and signs in using the configured local owner credentials. Set it to `false` to sign in manually. The default browser executable is `google-chrome`; set `WETOMATE_CHROME` for another Chromium based executable.

The container installs dependencies into a Docker volume, validates dependency versions, lints, tests, builds every workspace, and links every `n8n-nodes-*` package into n8n before serving the editor at <http://localhost:5678>. It also imports inactive workflows from each package's `examples/workflows` directory. Development imports use n8n's `CUSTOM` node namespace while the source examples retain their publishable package node types. A persistent content hash prevents unchanged examples from being imported repeatedly. n8n data and the npm cache persist in separate Docker volumes.

While `npm run dev` is running, changes to node or credential TypeScript, JSON metadata, and PNG or SVG icons rebuild the affected package automatically. Changes to a package's `examples/workflows/*.json` file are validated and hot imported as inactive workflows. n8n's development reloader then refreshes the node descriptions without restarting the container. Toolkit source changes rebuild the toolkit and every community node. Use `npm run dev:restart` to recover after a watcher or build failure, open a prepared container shell with `npm run dev:shell`, and stop the environment with `npm run dev:down`.

To force the sample workflows to be imported again, stop the environment and run:

```bash
npm run dev:down
npm run dev:seed
```

Set `WETOMATE_SEED_SAMPLE_WORKFLOWS=false` in `.env` to disable automatic imports. Sample workflows use stable IDs, remain inactive, and don't contain credentials; select or create the required credentials in the editor before executing them.

## Continuous integration

GitHub Actions builds, lints, tests, and inspects every npm package on pull requests and pushes to `main`.

## Releases

Publishing is triggered by publishing a GitHub release. The release tag selects exactly one package and its version must match that package's `package.json`:

- `toolkit-v1.2.3` publishes `@wetomate/n8n-node-toolkit@1.2.3`.
- `n8n-nodes-duo-v1.2.3` publishes `n8n-nodes-duo@1.2.3`.
- `n8n-nodes-rest-api-v1.2.3` publishes `n8n-nodes-rest-api@1.2.3`.

Before publishing a release, update the package version and any internal development dependency ranges, commit the resulting lockfile, and make sure CI passes. The shared community-node build derives entry points from each package's `n8n` metadata and bundles the toolkit into generated JavaScript, so installing a published node does not install the toolkit at runtime. Publish a new toolkit release before building a node from outside this workspace against that version.

The npm packages should configure `wetomate/nodes` and the `publish.yml` workflow as their npm trusted publisher. The workflow uses GitHub OIDC and publishes provenance; an `NPM_TOKEN` repository secret can be used as a fallback.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing. Build and test every affected package, document public behavior changes, and never commit credentials or local `.npmrc` files. Report vulnerabilities through the private process in [SECURITY.md](./SECURITY.md).

Notable package changes are recorded in [CHANGELOG.md](./CHANGELOG.md).

## License

This repository and its published packages are available under the [MIT License](./LICENSE.md), matching n8n's licensing requirement for verified community nodes. n8n is a trademark of n8n GmbH; this project is independently maintained by Wetomate.
