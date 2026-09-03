# Changelog

All notable changes to Wetomate's published packages are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and package versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Automatic, idempotent sample workflow imports and live community-node rebuilding for the Docker development environment.
- Added the `$wetomate-n8n-verification` repository skill for evidence-based verified community node compatibility audits.
- Repository guidance, project skills, contribution guidelines, security reporting, and community standards.

### Changed

- Added composable parameter-mapping rules to `@wetomate/n8n-node-toolkit` and migrated the Duo node away from custom `INodeProperties` extensions while retaining deprecated compatibility exports.
- Renamed the shared toolkit package to `@wetomate/n8n-node-toolkit` and aligned repository terminology with Wetomate.
- Consolidated package dependency management into npm workspaces.
- Added manifest-driven community-node bundling and package validation, allowing `n8n-nodes-duo` to reuse the toolkit without external runtime dependencies.

### Fixed

- Preserved Duo input-item pairing in node output so downstream expressions resolve against the correct source item.
