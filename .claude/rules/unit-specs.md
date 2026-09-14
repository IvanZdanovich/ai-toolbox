---
paths:
  - 'reqs/unit/**'
  - 'reqs/unit-examples/**'
---

# Unit specs

UNIT_SUBJECT: a unit spec exercises exactly one source item in isolation — one module, class, or function — with every collaborator it reaches for replaced by a double from `reqs/support/` or a local stub. The moment a case needs two real modules to agree it belongs in `reqs/integration/`; otherwise the two levels converge, the unit suite slows to integration speed, and a failure stops localising.

UNIT_MIRRORS_SOURCE: `reqs/unit/<path>` mirrors `chrome-extension/<path>` — same relative folder path, one spec file per source item, named `<sourceBaseName>.test.js`. A renamed or moved source file whose spec stays put is orphaned and undiscoverable.

UNIT_PRIVATE_THROUGH_PUBLIC: reach a private helper through the public entry point that uses it, not by importing the internal file — unless the helper is itself the item the spec is named after. Otherwise the suite pins an internal shape and every refactor breaks specs no consumer would have noticed.

UNIT_COVERS_BRANCHES: this level owns branch coverage for its item — every conditional, guard, default and throw — because no higher level reaches them all without combinatorial setup.

UNIT_NO_IO: no network, filesystem, clock or randomness the spec did not inject. A case needing real IO is an integration or e2e case; otherwise the suite is flaky and its failures are not about the module.

UNIT_DOUBLE_FROM_SUPPORT: take a collaborator's double from `reqs/support/` once a second spec needs it; a single-consumer stub stays inline.

## Unit examples

UNIT_EXAMPLE_SCOPE: a unit example describes one source item's inputs and expected shapes. An instance built from two modules' vocabularies belongs in `reqs/integration-examples/`, or the example tree becomes a shared fixture pile.

Note: `reqs/unit-examples/shared/test-data.examples.js` is currently one file
serving four subjects (templates, history, settings, AI responses) via a single
`fixtures` export. Splitting it by subject is right but blocked on 112 call
sites; do not add a fifth subject to it.

## Validation

UNIT_MIRROR_CHECK: the spec's path mirrors its source item's app path, and its name is that item's base name plus `.test.js`.
UNIT_ISOLATION_CHECK: the only real app import is the item the spec is named after; every other app module it reaches is doubled.
UNIT_BRANCH_CHECK: the suite reaches every conditional branch of its item, not only the happy path.
UNIT_EXAMPLE_MIRROR_CHECK: each `reqs/unit-examples` entry mirrors the `reqs/unit` path of the specs consuming it, and holds data only.
