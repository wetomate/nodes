---
name: wetomate-n8n-verification
description: Audit a Wetomate community-node package against the current n8n verified community node eligibility, security, packaging, documentation, lint, testing, and provenance rules. Use when checking verification readiness, investigating a verification rejection, or changing a package specifically to meet verified-node requirements; do not activate for routine node development without a verification goal.
---

# Wetomate n8n verification

Assess the requested package against current n8n verified community node rules. Keep verification eligibility separate from general package quality: passing technical checks does not override a policy-level eligibility blocker.

## Refresh the rules

Browse current first-party n8n sources for every audit because the requirements change. Start with:

- n8n's community node verification guidelines;
- the current `n8n-node` tool and node linter documentation;
- the verified-node submission or Creator Portal guidance when submission readiness is in scope.

Use official n8n documentation and repositories as the source of truth. Record the audit date and link each policy-level conclusion to the current source. Do not present remembered requirements as current facts.

## Audit workflow

Identify the target workspace and inspect its `package.json`, registered nodes and credentials, source, tests, README, license, repository metadata, and publishing workflow. Also inspect shared build or validation configuration that affects the package.

Evaluate eligibility before detailed remediation:

- whether the node duplicates or iterates on an existing n8n node;
- whether it is a logic or flow-control node;
- whether the package integrates exactly one third-party service rather than acting as a generic proxy;
- whether its npm and public GitHub ownership, repository, author, license, and documentation can be verified.

If any eligibility decision needs marketplace or npm state, verify it online. Label unavailable or unpublished evidence as `Unknown`; do not infer that it passes.

Then check the technical requirements that apply to the package:

- TypeScript and current n8n package structure and metadata;
- English-only UI text, errors, and public documentation;
- no runtime dependencies, direct environment-variable access, or direct file-system access;
- safe credential handling, useful errors, input validation, and no secret or request-body logging;
- use of the official `n8n-node` tooling where current policy requires it;
- MIT licensing, usable documentation, examples, and authentication instructions;
- GitHub Actions publication with npm provenance when required by the current rules;
- compatibility, item pairing, expressions, and appropriate automated coverage.

Treat bundled implementation libraries and development dependencies precisely. Report what the published manifest and tarball contain instead of claiming “no dependencies” from source layout alone.

## Verification commands

Use the repository's existing commands and do not replace working project conventions merely to imitate a scaffold. From the repository root, normally run:

```bash
npm run check:packages
npm run lint --workspace <package-name>
npm test --workspace <package-name>
npm run build --workspace <package-name>
npm pack --dry-run --workspace <package-name>
```

Run `npm run dev:check` after verification-related implementation or shared-configuration changes. Run configured `n8n-node` lint/build commands when the package provides them.

Use `npx @n8n/scan-community-package <package-name>@<published-version>` only for a version that exists on npm. Distinguish registry, network, or scanner failures from actual findings; a tool failure is not a pass or a verification rejection.

Inspect the produced tarball listing, not only the source manifest. Search source for environment, file-system, logging, credential, and external import risks. Do not expose secrets while auditing.

## Report

Lead with two explicit results:

- **Eligibility:** `Eligible`, `Not eligible`, or `Unknown`.
- **Technical compatibility:** `Compatible`, `Non-compliant`, or `Conditional`.

List policy blockers first, then technical findings ordered by severity. For every blocker, cite the current official rule and give repository evidence with file and line references. Separate confirmed findings, automated-check results, and facts that require publication or owner verification.

End with the smallest remediation plan that can change the result. Never imply that technical changes can fix a policy-level ineligibility decision. If the user asks for changes, modify only the authorized scope, rerun proportionate checks, and report any remaining external submission steps.
