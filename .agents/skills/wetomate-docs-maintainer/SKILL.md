---
name: wetomate-docs-maintainer
description: Maintain Wetomate repository documentation and community-health files so they match the code, package metadata, workflows, and n8n terminology. Use for README, contributing, changelog, code-of-conduct, security, release, setup, and public API documentation changes, and when implementation changes make those documents stale.
---

# Wetomate Docs Maintainer

Inspect the relevant implementation, `package.json` files, scripts, and workflows before editing documentation. Treat executable configuration as the source of truth and flag contradictions instead of documenting behavior that does not exist.

Keep documentation consistent across the root README, package READMEs, `AGENTS.md`, community-health files, and public API comments:

- Write `n8n` lowercase, including at the start of a sentence. Preserve exact casing for Wetomate, GitHub, npm, TypeScript, Jest, and provider names.
- Use sentence-case headings, active voice, concise paragraphs, and inclusive language.
- Format package names, commands, files, directories, API symbols, UI input, and versions as code. Bold exact UI labels.
- Prefer task-oriented instructions with commands that can actually be run from the stated directory.
- Update relative links, package names, installation examples, release tags, prerequisites, and cross-references whenever their targets change.
- Keep provider-specific usage in the provider package README and shared toolkit behavior in the toolkit README.
- Record user-visible package changes under `Unreleased` in `CHANGELOG.md`; skip internal-only edits unless they affect contributors or releases.
- Preserve legal text, attribution, and private reporting routes in `LICENSE.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`. Do not invent contact details.

Search the repository for stale terminology after renames. Run available Markdown or link checks; otherwise verify headings, fenced code blocks, relative targets, and commands manually. Report documentation checks separately from code checks.
