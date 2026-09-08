# Changelog

All notable changes to Wetomate's published packages are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and package versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- Reworked the Duo human-in-the-loop example around expense reimbursement approval with an n8n form, contextual Duo Push, and approved or denied branches.
- Documented the Duo Auth API check and logo endpoints in the Duo package README.

## n8n-nodes-duo 1.0.1 - 2026-09-06

### Changed

- Moved Duo tests to the package-level test directory so they are kept outside the published node source tree.

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
