---
paths:
  - 'reqs/unit/*.spec.js'
  - 'reqs/unit-examples/*.examples.js'
---

# Unit specs

# Reasoning Principles

UNIT_SUBJECT: exercises exactly one source item — one module, class or function — with every collaborator replaced by a double from `reqs/support/` or a local stub, and sends a case needing two real modules to agree to `reqs/integration/` — otherwise the two levels converge, the unit suite slows to integration speed, and a failure stops narrowing to one module.
UNIT_PRIVATE_THROUGH_PUBLIC: reaches a private helper through the public entry point that uses it over importing the internal file, unless the helper is itself the item the spec is named after — otherwise the suite pins an internal shape and every refactor breaks specs no consumer would have noticed.
UNIT_COVERS_BRANCHES: covers every conditional, guard, default and throw of its item here over leaving them to a higher level — otherwise they go unreached, because no higher level gets to them all without setup that multiplies.
UNIT_INJECTS_THE_WORLD: takes clock, randomness, network and filesystem from what the spec passes in, and sends a case needing the real ones to integration or e2e — otherwise the suite flakes and its failures stop being about the module.
UNIT_DOUBLE_FROM_SUPPORT: moves a collaborator's double to `reqs/support/` once a second spec needs it and leaves a single-consumer stub inline — otherwise shared doubles pile up for consumers that never arrive.

# Output Shape

UNIT_IS_FLAT: puts every spec directly under `reqs/unit/`, named for the source item and nothing else — `chrome-extension/shared/storage.js` → `reqs/unit/storage.spec.js`, `content/content.js` → `reqs/unit/content.spec.js`, a directory module taking its directory's name over `index.spec.js` (`shared/components/editor-tab/index.js` → `reqs/unit/editor-tab.spec.js`) — over a sub-tree mirroring `chrome-extension/`, so `ls reqs/unit` is the list of what is covered and moving a module between directories leaves its spec where it was — otherwise the tree is maintained twice and a source move shows up as a spec move that says nothing.
UNIT_NAME_IS_THE_MODULE: takes the source file's base name as the whole file name, and when two sources would collide qualifies with the parent directory — `shared/components/toast.js` and a later `content/toast.js` become `toast.spec.js` and `content-toast.spec.js` — over reintroducing a directory for the one pair that clashes; the title's subject follows the same name — otherwise a flat directory silently loses one of the two specs.
UNIT_EXAMPLE_SCOPE: describes one source item's inputs and expected shapes per `<subject>.examples.js`, filing an instance built from two modules' shapes under `reqs/integration-examples/` — otherwise the example tree turns into a shared fixture pile.
UNIT_EXAMPLE_SPLIT_PENDING: gives a new subject its own `<subject>.examples.js` with named exports over a fifth key in `reqs/unit-examples/test-data.examples.js`, which already serves four (templates, history, settings, AI responses) behind one `fixtures` namespace and is the single standing exception to `EXAMPLE_IS_A_NAMED_VARIABLE`, blocked on the call sites already reaching through that namespace — otherwise the file it is already too late to split cheaply grows further.

# Validation

UNIT_FLAT_CHECK: every spec sits directly under `reqs/unit/`, with no sub-directory, and its name is its source item's base name plus `.spec.js` — never `.integration.spec.js`, `.e2e.spec.js` or `.cross.spec.js`.
UNIT_NAME_COLLISION_CHECK: no two source items covered here share a spec file name; a pair that would is qualified by its parent directory.
UNIT_ISOLATION_CHECK: the only real app import is the item the spec is named after; every other app module it reaches is doubled.
UNIT_BRANCH_CHECK: the suite reaches every conditional branch of its item, not only the happy path.
UNIT_EXAMPLE_FLAT_CHECK: each `reqs/unit-examples` entry sits directly under that directory, is named `<subject>.examples.js` for the spec consuming it, and holds data only.
