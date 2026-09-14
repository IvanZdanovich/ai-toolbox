# Unit specs and unit examples

Load with `SKILL.md`, which holds the rules every spec level shares —
SPEC_IMPORTS_SUBJECT, SPEC_SCENARIOS, SPEC_ASSERTS, SPEC_IS_EXECUTABLE,
ATOMIC_UNIT, OUTCOME_TITLE, REQUIREMENT_TRACE, EXAMPLES_MIRROR_SPECS. This file
holds only what is specific to the unit level.

# Principles

UNIT_SUBJECT: a unit spec exercises exactly one source item in isolation — one module, class, or function — with every collaborator it reaches for replaced by a double from `reqs/support` or a local stub; the moment a case needs two real modules to agree, it belongs in `reqs/integration` — otherwise the two levels converge, the unit suite slows to integration speed, and a failure no longer localises
UNIT_MIRRORS_SOURCE: `reqs/unit/<path>` mirrors the app tree at `app/<path>` — same relative folder path, one spec file per source item, named with the project's unit-test suffix on that item's own base name (`foo.ts` → `foo.test.ts`) — otherwise a renamed or moved source file leaves its spec orphaned and undiscoverable
UNIT_PRIVATE_THROUGH_PUBLIC: reach a private helper through the public entry point that uses it, not by importing the internal file, unless the helper is itself the source item the spec is named after — otherwise the unit suite pins an internal shape and every refactor breaks specs that no consumer would have noticed
UNIT_COVERS_BRANCHES: a unit spec is the level that owns branch coverage for its item — every conditional, guard, default, and throw — because no higher level can reach them all without combinatorial setup
UNIT_NO_IO: a unit spec touches no network, filesystem, clock, or randomness it did not inject; a case that needs real IO is an integration or e2e case — otherwise the suite is flaky and its failures are not about the module

## Unit examples

UNIT_EXAMPLE_PLACEMENT: place named example instances at `reqs/unit-examples/<mirrored-path>/<area>.examples.<ext>`, mirroring the `reqs/unit` path of the specs that consume them
UNIT_EXAMPLE_SCOPE: a unit example describes one source item's inputs and expected shapes; an instance built from two modules' vocabularies belongs in `reqs/integration-examples` — otherwise the unit example tree becomes the project's shared fixture pile
UNIT_EXAMPLE_FROM_CONSTRAINTS: compose each instance from constraint variables rather than raw literals wherever the value is a boundary (a maximum, a format, an enum member); a purely descriptive value (a display name, a sample sentence) stays a literal — otherwise the chain in `references/constraints.md` breaks mid-way, or the examples file fills with constraints nobody declared

# Method

UNIT_PLACEMENT: place the spec at `reqs/unit/<app-relative-path>` named `<sourceBaseName><projectUnitSuffix>`; never in an ad hoc folder and never beside the source
UNIT_ONE_FILE_PER_ITEM: one spec file per source item — splitting a large item's spec follows the split of the item itself, not the spec's own length
UNIT_DOUBLE_FROM_SUPPORT: take a collaborator's double from `reqs/support` when a second spec needs it; keep a single-consumer stub inline (SUPPORT_ON_DEMAND)

# Validation

UNIT_MIRROR_CHECK: each unit spec's path mirrors its source item's app path under `reqs/unit`, and its name is that item's base name plus the project's unit-test suffix
UNIT_ISOLATION_CHECK: the spec's only real import from the app is the item it is named after; every other app module it reaches is doubled
UNIT_BRANCH_CHECK: the suite reaches every conditional branch of its item, not only the paths the happy case walks
UNIT_NO_IO_CHECK: no case performs network, filesystem, clock, or random access that was not injected by the spec
UNIT_EXAMPLE_MIRROR_CHECK: each `reqs/unit-examples` entry mirrors the `reqs/unit` path of the specs consuming it, and holds data only — no assertions, no boundary literals that a constraint variable already states
