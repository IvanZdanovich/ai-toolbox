---
paths:
  - 'reqs/unit/**/*.test.js'
  - 'reqs/unit-examples/**/*.examples.js'
---

# Unit specs

UNIT_SUBJECT: exercises exactly one source item in isolation — one module, class, or function — with every collaborator it reaches for replaced by a double from `reqs/support/` or a local stub, and sends a case needing two real modules to agree to `reqs/integration/` — otherwise the two levels converge, the unit suite slows to integration speed, and a failure stops localising.
UNIT_MIRRORS_SOURCE: mirrors `chrome-extension/<path>` at `reqs/unit/<path>` — same relative folder path, one spec file per source item, named for the source file with its `.js` swapped for `.test.js` and no level infix: `chrome-extension/shared/storage.js` → `reqs/unit/shared/storage.test.js`, and a directory module takes its directory's name over `index.test.js`, as `shared/components/editor-tab/index.js` → `reqs/unit/shared/components/editor-tab.test.js` does — otherwise a renamed or moved source file leaves its spec orphaned and undiscoverable.
UNIT_PRIVATE_THROUGH_PUBLIC: reaches a private helper through the public entry point that uses it over importing the internal file, unless the helper is itself the item the spec is named after — otherwise the suite pins an internal shape and every refactor breaks specs no consumer would have noticed.
UNIT_COVERS_BRANCHES: covers every conditional, guard, default and throw of its item at this level — otherwise the branches go unreached, because no higher level gets to them all without combinatorial setup.
UNIT_NO_IO: allows no network, filesystem, clock or randomness the spec did not inject, and sends a case needing real IO to integration or e2e — otherwise the suite is flaky and its failures are not about the module.
UNIT_DOUBLE_FROM_SUPPORT: takes a collaborator's double from `reqs/support/` once a second spec needs it and leaves a single-consumer stub inline — otherwise shared doubles accumulate for consumers that never arrive.

## Unit examples

UNIT_EXAMPLE_SCOPE: describes one source item's inputs and expected shapes per `<subject>.examples.js` file, and files an instance built from two modules' vocabularies under `reqs/integration-examples/` — otherwise the example tree becomes a shared fixture pile.
UNIT_EXAMPLE_SPLIT_PENDING: adds no fifth subject to `reqs/unit-examples/shared/test-data.examples.js`, which serves four (templates, history, settings, AI responses) through a single `fixtures` export — splitting it by subject is right but blocked on 112 call sites — otherwise the file it is already too late to split cheaply grows further.

## Validation

UNIT_MIRROR_CHECK: the spec's path mirrors its source item's app path, and its name is that item's base name plus `.test.js` — never `.integration.test.js`, `.e2e.test.js` or `.spec.js`.
UNIT_ISOLATION_CHECK: the only real app import is the item the spec is named after; every other app module it reaches is doubled.
UNIT_BRANCH_CHECK: the suite reaches every conditional branch of its item, not only the happy path.
UNIT_EXAMPLE_MIRROR_CHECK: each `reqs/unit-examples` entry mirrors the `reqs/unit` path of the specs consuming it, and holds data only.
