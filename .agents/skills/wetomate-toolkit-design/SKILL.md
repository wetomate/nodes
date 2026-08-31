---
name: wetomate-toolkit-design
description: Design or review Wetomate's shared n8n node toolkit for maintainable APIs, SOLID boundaries, and appropriate design patterns. Use for architecture, public types, abstractions, refactors, and extension-point decisions; do not activate for routine provider-node edits.
---

# Wetomate Toolkit Design

Design the toolkit around repeated, demonstrated needs across node packages. Keep provider-specific policy out of the toolkit.

Apply SOLID principles pragmatically:

- Give each abstraction one coherent reason to change.
- Prefer extension through small strategies, processors, or composition over growing conditional branches and inheritance trees.
- Keep substitutable contracts explicit, especially for optional values, errors, sync/async behavior, and mutation.
- Split interfaces by what consumers actually need; avoid forcing nodes to depend on unrelated capabilities.
- Point dependencies toward stable toolkit contracts and inject n8n execution or transport boundaries when that improves testability.

Use a design pattern only when it makes a recurring variation or lifecycle clearer. Prefer simple functions and data first. Strategy is suitable for parameter or response transformation; adapter for isolating n8n/provider shapes; builder only when constructing valid definitions has meaningful invariants. Avoid factories, base classes, or registries that merely relocate straightforward code.

Before changing a public API, inspect all repository consumers. Describe the invariant, alternatives considered, compatibility impact, and migration path. Preserve backward compatibility when reasonable; otherwise make the break explicit and update every in-repository consumer, test, export, and document together.

Favor narrow public exports, predictable names, immutable inputs where practical, precise TypeScript types, and pure transformations around an explicit side-effect boundary. Add contract tests for public behavior and extension points. Reject abstractions supported by only one speculative use case unless they solve a concrete correctness problem.
