---
name: wetomate-release
description: Prepare and perform releases of Wetomate's toolkit and n8n node packages. Use for versioning, package validation, changelogs, npm publication, tags, and GitHub releases; do not use for ordinary feature development.
---

# Wetomate Release

Determine the affected packages and their dependency order before proposing versions. The shared toolkit must be released before node packages that consume its new version.

For each release:

- Review the changes since the previous package release and choose semantic versions from user-visible compatibility, not commit count.
- Keep package names, internal dependency ranges, lockfiles, documentation, and CI/release configuration consistent.
- Confirm that published files contain the compiled entry points, type declarations, icons, and n8n registrations they advertise, without source-only secrets or local configuration.
- Run a clean install where practical, then the package's tests, lint, build, and `npm pack --dry-run` or equivalent package-content check.
- Report the planned package order, versions, and validation results before publication.

Publishing, pushing commits or tags, and creating GitHub releases are external mutations. Perform them only when the user explicitly asks, and stop on authentication, ownership, registry, or version conflicts rather than changing the release target implicitly.

Use the repository's GitHub Actions and npm trusted-publishing flow. Keep package names, repository metadata, and release automation aligned with the Wetomate identity.
