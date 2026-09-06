# Project guidance

## Purpose

This repository is becoming `wetomate/nodes`, the home of Wetomate (we + automate) tooling for building n8n integrations. It contains:

- a reusable TypeScript toolkit for creating n8n nodes, published as `@wetomate/n8n-node-toolkit`; and
- n8n community nodes built primarily on that toolkit, currently including `n8n-nodes-duo` and `n8n-nodes-rest-api`.

Use the Wetomate identity consistently across public names, packages, documentation, imports, lockfiles, and automation.

## Working conventions

- Use [`PROJECT_MAP.md`](./PROJECT_MAP.md) as the source of truth for repository structure, package boundaries, and shared configuration placement.
- Keep generic node-building classes and types in the shared toolkit; keep provider-specific behavior in its node package.
- Preserve compatibility unless a breaking change is intentional and documented.
- Follow the existing TypeScript, ESLint, and Prettier configuration.
- Work within the affected package and use its npm scripts. Run `npm run build` and, where available, `npm run lint` and `npm test` before finishing.
- Use `npm run dev:check` for full containerized validation and `npm run dev` when changes must be exercised in the n8n development runtime.
- Never commit credentials, registry tokens, generated `dist` output, or local `.npmrc` files.
- After changing the repository, inspect the complete staged, unstaged, and untracked diff and propose an n8n-style commit message. Do not stage, commit, tag, or push unless explicitly requested.

## Checking n8n verification compatibility

Use the repository skill `$wetomate-n8n-verification` when reviewing a community node for n8n verified-node eligibility, preparing a verification submission, investigating a rejection, or making changes specifically to satisfy verification requirements.

Invoke it with the package and desired outcome, for example:

```text
Use $wetomate-n8n-verification to audit n8n-nodes-duo for submission readiness.
```

The skill refreshes the current rules from official n8n sources, separates policy eligibility from technical compatibility, runs the relevant package checks, and reports blockers with evidence. Use the node-development, testing, documentation, or release skills separately when the audit leads to implementation, test, documentation, or publication work.
