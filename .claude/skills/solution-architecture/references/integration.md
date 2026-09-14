# Integration specs and integration examples

Load with `SKILL.md`, which holds the rules every spec level shares —
SPEC_IMPORTS_SUBJECT, SPEC_SCENARIOS, SPEC_ASSERTS, SPEC_IS_EXECUTABLE,
ATOMIC_UNIT, OUTCOME_TITLE, REQUIREMENT_TRACE, EXAMPLES_MIRROR_SPECS. This file
holds only what is specific to the integration level.

# Principles

INTEGRATION_SUBJECT: an integration spec exercises the contract between two or more real modules — that the shapes they exchange, the order they call each other in, and the errors they propagate actually agree; a case that needs only one module belongs in `reqs/unit` — otherwise the integration suite re-tests unit behavior at integration cost and the contract itself stays unverified
PRIMARY_MODULE: file the spec under the app path of the _primary_ module — the one whose contract is under test, not the one it calls — and name it for that module; when no module is primary, the case is a flow and belongs in `reqs/e2e` — otherwise the same contract is filed under both participants and neither path is findable
INTEGRATION_REAL_COLLABORATORS: keep every module in the contract real; double only what sits outside the app — the platform API, the network, the clock, the store — taking that double from `reqs/support` — otherwise doubling a participant reduces the spec to a unit spec asserting against its own mock
INTEGRATION_OWNS_WIRING: this level owns the failures units cannot see — a renamed field, a changed return shape, an unawaited promise, an event emitted with the wrong payload, a mismatch between what one module throws and what the next catches
INTEGRATION_NO_UI_FLOW: a multi-screen user journey is an e2e case even when every module in it is real; integration stops at the module contract — otherwise `reqs/integration` slowly absorbs the e2e suite and loses its mirroring to the app tree

## Integration examples

INTEGRATION_EXAMPLE_PLACEMENT: place named example instances at `reqs/integration-examples/<mirrored-path>/<area>.examples.<ext>`, mirroring the `reqs/integration` path of the specs that consume them
INTEGRATION_EXAMPLE_SCOPE: an integration example carries the vocabulary of the contract under test — the payload one module hands the next; an instance consumed by three unrelated specs is a sign the contract, not the example, needs splitting
INTEGRATION_EXAMPLE_FROM_CONSTRAINTS: compose each instance from constraint variables wherever the value is a boundary; a purely descriptive value stays a literal

# Method

INTEGRATION_PLACEMENT: place the spec at `reqs/integration/<app-relative-path-of-primary-module>` named `<primaryModuleBaseName><projectIntegrationSuffix>`; never in an ad hoc folder
INTEGRATION_SELECT_PRIMARY: pick the primary module by asking whose contract a failure would indict — the caller whose expectations broke, not every module the case happened to load
INTEGRATION_DOUBLE_THE_EDGE: replace the platform edge (browser/OS API, network, storage, time) with a support double; leave every app module real

# Validation

INTEGRATION_MIRROR_CHECK: each integration spec's path mirrors its primary module's app path under `reqs/integration`, and its name is that module's base name plus the project's integration-test suffix
INTEGRATION_PRIMARY_CHECK: the spec names one primary module, and that module is the one whose contract a failure would indict; a spec with no primary module is re-filed under `reqs/e2e`
INTEGRATION_REAL_CHECK: every app module in the contract is imported for real; only the platform edge is doubled
INTEGRATION_NOT_UNIT_CHECK: each case needs at least two real modules to agree; a case satisfiable by one module is moved to `reqs/unit`
INTEGRATION_EXAMPLE_MIRROR_CHECK: each `reqs/integration-examples` entry mirrors the `reqs/integration` path of the specs consuming it, and holds data only — no assertions, no boundary literals a constraint variable already states
