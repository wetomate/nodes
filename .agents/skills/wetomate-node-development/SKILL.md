---
name: wetomate-node-development
description: Build or modify Wetomate n8n community nodes and credentials using the repository's shared toolkit and package conventions. Use for node implementation, provider operations, parameters, credentials, and node scaffolding; use the testing skill for test-only work.
---

# Wetomate Node Development

Implement provider-specific behavior in its node package and reusable node-building behavior in the shared toolkit. Do not copy generic helpers into an individual node.

Before editing, inspect the affected package's `package.json`, node registration, versioned node structure, and nearby implementations. Preserve n8n's expected `INodeType`, credential, property, and item-index behavior.

When adding or changing a node:

- Keep display properties declarative and execution logic small; extract pure request/response transformations where useful.
- Use the toolkit's public API instead of its internals. If the API is insufficient, improve the toolkit separately and keep the dependency direction from nodes to toolkit.
- Treat credentials and authentication material as secrets. Never log them or commit local registry configuration.
- Update node/credential registration, package metadata, icons, and user-facing documentation when the public surface changes.
- Use Wetomate names consistently across public APIs, packages, imports, and documentation.
- Preserve item pairing and per-item expression evaluation; do not accidentally reuse item-zero parameters for every input.
- Convert provider failures into useful n8n errors without exposing secrets.

Run the affected package's build and lint scripts. Run its tests whenever behavior changes.

For community-node sample workflows, keep source exports under the package's `examples/workflows/` directory. Use stable workflow IDs, names beginning with `[Wetomate Example]`, `active: false`, package node types, and no credential references. Do not copy development-only `CUSTOM.*` node types, generated webhook IDs, instance metadata, or execution data into the source export.

Keep the workflow companions together under `examples/workflows/` using the exact workflow stem: `<name>.json`, `<name>.md`, and `<name>.insomnia.json`. Use an `n8n_base_url` environment variable so the same requests work with both `/webhook-test` and `/webhook`.

When arranging workflow examples, use a consistent sticky-note size and a non-overlapping grid. Place the connected node cards below the explanatory note content so long notes do not cover the nodes, and include a runnable `curl` example in each scenario note.
