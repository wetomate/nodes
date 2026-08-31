---
name: wetomate-testing
description: Design, write, or review reliable tests for Wetomate's shared n8n toolkit and provider node packages. Use for test plans, regression tests, Jest tests, mocks, fixtures, and coverage-focused reviews.
---

# Wetomate Testing

Follow n8n's testing expectations: every behavior change needs proportionate automated coverage, integration coverage applies when components interact, and node execution behavior needs workflow-level coverage through n8n's node test harness. Every bug fix needs a focused regression test that fails without the fix and passes with it.

Test observable behavior and compatibility boundaries. A test must be capable of failing for the intended defect and remain stable across harmless refactors.

For toolkit code:

- Exercise the public exports with representative n8n values, including missing values, `null`, empty strings, nested collections, multiple item indexes, custom processors, and processor omissions where relevant.
- Assert immutability or mutation only when it is part of the contract.
- Prefer small table-driven cases for transformation rules and explicit tests for error behavior.

For node packages:

- Use `NodeTestHarness` with `.workflow.json` fixtures for node execution behavior. Configure one or more workflows for the affected operations and store the expected output as pinned data so the harness executes the node through the real request stack.
- Treat published files under `examples/workflows` as test inputs. Add workflow contract tests that load the real JSON files and verify their inactive state, credential-free configuration, registered package node types, connections, operation order, and provider-specific metadata whenever an example changes. Use the execution harness for the provider-node portions and structural assertions for workflows that also contain built-in n8n nodes.
- Declare provider HTTP mocks through the harness's `nock` configuration. Let the harness supply the n8n execution context; do not hand-build `IExecuteFunctions` mocks or call `execute` directly and present that as workflow coverage.
- Reserve direct unit tests and minimal dependency mocks for pure helpers, isolated transformations, signing, and error-normalization logic.
- Test request construction, authentication inputs, parameter mapping, pagination or item handling, and response/error normalization independently where useful.
- Cover multiple input items, their item indexes and pairing metadata, expressions, optional parameters, empty responses, and error paths when relevant.
- Mock provider network access, clock, and randomness; do not mock the pure unit under test.
- Use fixed protocol examples for signing code and include cases where canonicalization differences would change the signature.
- Assert n8n-specific errors such as `NodeApiError` or `NodeOperationError` when they are part of the contract.
- Never use live credentials or depend on external services in the unit suite.

If a package cannot consume n8n's test harness, verify that constraint before choosing an alternative. Keep direct-context tests classified as unit tests and do not claim they validate real workflow execution.

Name Jest tests `*.test.ts` and keep fixtures close to the package they exercise. Prefer arrange-act-assert structure, table-driven cases for meaningful input matrices, and assertions on outputs or calls rather than implementation details. Avoid snapshots for large node descriptions unless the serialized structure itself is the contract. Review intentional snapshot updates explicitly. Avoid asynchronous `done` callbacks when the test is synchronous or can return a promise.

Document manual verification steps for behavior that automation cannot cover. Use the affected package's configured test runner and run the narrowest relevant test during iteration, then the package suite. Also run build and lint when tests add TypeScript helpers or fixtures. Report commands run and distinguish failures caused by the change from pre-existing failures. Refer to n8n's [`TESTING_PROMPT_WORKFLOW.md`](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/TESTING_PROMPT_WORKFLOW.md) for the current harness pattern.
