# Contributing to Wetomate Nodes

Thanks for helping improve Wetomate's n8n toolkit and community nodes.

## Code of conduct

Participation in this project is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Before starting

Open an issue before substantial features, breaking changes, or broad refactors so the approach and compatibility impact can be discussed. Keep pull requests focused on one logical change.

## Development

Node.js 22 or newer and npm are required. From the repository root:

```bash
npm ci
npm run lint
npm test
npm run build
```

Keep reusable node-building abstractions in `wetomate-node-toolkit`. Keep provider-specific behavior in its `n8n-nodes-*` package. Preserve existing workflows unless a breaking change is intentional, documented, and accompanied by migration guidance.

Keep configuration that should apply to every community node in the root `configs` directory. Each node package should extend or require those base files and contain only the smallest package-specific override needed. See [PROJECT_MAP.md](./PROJECT_MAP.md) for the repository boundaries and configuration pattern.

Declare `@wetomate/n8n-node-toolkit` as a development dependency in every node package, using a caret range that matches the toolkit workspace version. npm links the current workspace for repository builds, and the shared build derives entry points from the package's `n8n` metadata and bundles the toolkit into its generated JavaScript. Published nodes must have no runtime dependencies and must keep `n8n-workflow` as a `*` peer dependency. Run `npm run check:packages` after changing versions, dependencies, or registered entries.

## Tests

Behavior changes must include proportionate automated tests. Bug fixes must include a regression test that fails without the fix.

For node execution behavior, use n8n's `NodeTestHarness` with `.workflow.json` fixtures and pinned expected output. Declare provider requests through the harness's `nock` configuration so the node runs through the real request stack. Do not treat a hand-built `IExecuteFunctions` mock or a direct `execute` call as workflow coverage. Direct unit tests remain appropriate for pure helpers and isolated transformations.

Tests must not call live provider services or contain real credentials. Mock network and other nondeterministic boundaries while keeping pure transformations real.

## Documentation

Update the relevant README, public API comments, and `CHANGELOG.md` when behavior, installation, package names, release steps, or compatibility changes. Write `n8n` lowercase and use sentence-case headings.

## Commit and pull request titles

Use the n8n Angular-style format:

```text
<type>(<optional scope>): <Summary>
```

Allowed types are `build`, `ci`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, and `test`. Write the summary in imperative present tense, capitalize its first letter, and omit the trailing period. Use `<Provider> Node` as the scope for a specific node or `API` for the toolkit's public API.

Examples:

```text
feat(Duo Node): Add asynchronous authentication status checks
fix(API): Preserve empty optional parameter values
docs: Clarify npm release prerequisites
```

Mark breaking changes with `!` and include a `BREAKING CHANGE:` footer with migration instructions.

## Pull requests

Describe what changed, why it changed, and how reviewers can verify it. Link the relevant issue, include automated and manual test results, and confirm the diff contains no unrelated changes or secrets.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](./LICENSE.md).
