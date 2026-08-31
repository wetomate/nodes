# Wetomate Nodes

Wetomate (we + automate) builds services and reusable tooling around [n8n](https://n8n.io). This repository contains our TypeScript toolkit for creating n8n integrations and the community node packages built with it.

## Packages

| Package                      | Directory                                          | Purpose                                                                      |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@wetomate/n8n-node-toolkit` | [`wetomate-node-toolkit`](./wetomate-node-toolkit) | Shared types and composable parameter-processing utilities for node authors. |

## Development

Node.js 22 or newer and npm are required. Install all workspace dependencies from the repository root:

```bash
npm ci
```

Run the repository checks with:

```bash
npm run lint
npm test
npm run build
```

Package-specific commands can be run with npm workspaces, for example:

```bash
npm run build --workspace @wetomate/n8n-node-toolkit
```

Keep reusable node-building behavior in the toolkit and provider-specific behavior in the relevant node package.
See the [project map](./PROJECT_MAP.md) for directory responsibilities, dependency boundaries, and the shared configuration policy.

### Tests

Run every workspace test from the repository root with `npm test`.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing. Build and test every affected package, document public behavior changes, and never commit credentials or local `.npmrc` files. Report vulnerabilities through the private process in [SECURITY.md](./SECURITY.md).

Notable package changes are recorded in [CHANGELOG.md](./CHANGELOG.md).

## License

This repository and its published packages are available under the [MIT License](./LICENSE.md), matching n8n's licensing requirement for verified community nodes. n8n is a trademark of n8n GmbH; this project is independently maintained by Wetomate.
