# E2E specs and e2e examples

Load with `SKILL.md`, which holds the rules every spec level shares —
SPEC_IMPORTS_SUBJECT, SPEC_SCENARIOS, SPEC_ASSERTS, SPEC_IS_EXECUTABLE,
ATOMIC_UNIT, OUTCOME_TITLE, REQUIREMENT_TRACE, EXAMPLES_MIRROR_SPECS. This file
holds only what is specific to the e2e level.

# Principles

E2E_SUBJECT: an e2e case exercises one user or system flow end to end — the sequence a person or an upstream system actually performs — not one module and not one contract; it is the only level that can prove the assembled product does the thing it claims
E2E_IS_FLAT: `reqs/e2e` has no mirrored sub-tree, because a flow crosses modules and has no single app path to mirror; the file is named for the flow (`checkout.e2e.<ext>`, `first-run.e2e.<ext>`) — otherwise the case is filed under whichever module it happened to start in and nobody finds it again
E2E_NAMED_BY_FLOW: name the file and every case after the outcome a user recognises ("a draft survives a reload", "an expired key is reported before the run starts"), never after the modules it traverses — otherwise the suite reads as a second integration tree
E2E_NO_INTERNAL_REACH: drive the flow only through the surfaces a real actor has — the UI, the public API, the CLI, the message the system receives — and assert only on what that actor can observe; reaching into a module to set up or inspect state makes the case an integration spec in disguise
E2E_FEW_AND_LOAD_BEARING: keep the suite small and reserved for flows whose breakage would be a user-visible outage; breadth belongs at the levels below, which are cheaper and localise failure — otherwise the slowest, flakiest level becomes the widest one
E2E_SEEDS_THROUGH_SUPPORT: perform setup and teardown through a command in `reqs/support`, not by writing storage or state directly from the case — otherwise every case encodes the current persistence shape and a storage change rewrites the whole suite

## E2E examples

E2E_EXAMPLE_PLACEMENT: place named example instances flat under `reqs/e2e-examples/<flow>.examples.<ext>`, mirroring the flat shape of `reqs/e2e`
E2E_EXAMPLE_SCOPE: an e2e example carries what an actor supplies or expects to see — the inputs typed, the payload sent, the text rendered — not a module's internal shape
E2E_EXAMPLE_FROM_CONSTRAINTS: compose each instance from constraint variables wherever the value is a boundary; a purely descriptive value stays a literal

# Method

E2E_PLACEMENT: place the case flat at `reqs/e2e/<flow><projectE2eSuffix>`; never in a module-shaped folder and never under `reqs/integration`
E2E_ONE_FLOW_PER_FILE: one flow per file; a variant of the same flow is a case within it, a different flow is a different file
E2E_ASSERT_AT_THE_SURFACE: assert on what the actor observes — rendered output, response body, exit code, emitted event — not on a module's return value

# Validation

E2E_FLAT_CHECK: every e2e case sits directly under `reqs/e2e` with no mirrored sub-tree, and no e2e case sits under `reqs/integration` or carries an integration suffix
E2E_FLOW_NAME_CHECK: the file and its cases are named for the user-recognisable flow and outcome, not for the modules traversed
E2E_SURFACE_CHECK: setup, drive, and assertion all go through actor-visible surfaces or a `reqs/support` command; no case imports an app module to arrange or inspect state
E2E_SIZE_CHECK: each case earns its place — its breakage would be user-visible; coverage that could live at unit or integration level is moved down
E2E_EXAMPLE_MIRROR_CHECK: `reqs/e2e-examples` is flat, mirrors `reqs/e2e`, and holds data only — no assertions, no boundary literals a constraint variable already states
