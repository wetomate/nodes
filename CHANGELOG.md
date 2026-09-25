# Changelog

All notable changes to Wetomate's published packages are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and package versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- Reworked the Duo human-in-the-loop example around expense reimbursement approval with an n8n form, contextual Duo Push, and approved or denied branches.
- Documented the Duo Auth API check and logo endpoints in the Duo package README.
- Added `npm run dev:clean` to reset only the persistent n8n development data volume when stale workflows remain.

## n8n-nodes-rest-api 1.1.0 - 2026-09-25

### Changed

- Record invalid REST API request bodies as failed n8n executions while preserving the configured `4xx` response and stopping downstream nodes.

## n8n-nodes-rest-api 1.0.1 - 2026-09-20

### Fixed

- Added explicit credential test request definitions for the Basic, Header, and JWT authentication credentials.

## n8n-nodes-duo 1.1.0 - 2026-09-19

### Added

- Added a separate Duo Security AI Tool node for n8n AI Agents.
- Added a capability showcase workflow covering PING, CHECK, PREAUTH, synchronous AUTH, asynchronous AUTH with status polling, and LOGO.

### Changed

- Kept the regular Duo Security node as a workflow node with main inputs and outputs.
- Corrected Duo Auth API ping signing and empty GET request bodies.

## n8n-nodes-duo 1.0.1 - 2026-09-06

### Changed

- Moved Duo tests to the package-level test directory so they are kept outside the published node source tree.

### Added

- Added `n8n-nodes-rest-api`, a Webhook-compatible REST API trigger with visual and custom JSON Schema validation powered by AJV.

### Fixed

- Fixed REST API node and credential icons, and registered package-owned authentication credentials so they work when n8n loads the node from a custom directory.

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
