# Changelog

All notable changes to Wetomate's published packages are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and package versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## @wetomate/n8n-node-toolkit 1.0.2 - 2026-09-06

### Added

- First public release of the shared Wetomate toolkit for building n8n community nodes.
- Composable parameter-mapping rules for renaming, omitting, and transforming node values.

### Changed

- Retained the earlier custom property types as deprecated compatibility exports while standardizing new integrations on n8n's `INodeProperties` type.

## n8n-nodes-duo 1.0.0 - 2026-09-06

### Added

- First public release of the Duo Security community node for n8n.
- Authentication, asynchronous authentication status, pre-authentication, and availability operations for the Duo Auth API.
- Example workflows for API health checks and human approval flows.

### Fixed

- Preserved Duo input-item pairing in node output so downstream expressions resolve against the correct source item.
