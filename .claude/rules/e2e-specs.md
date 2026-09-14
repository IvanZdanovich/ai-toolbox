---
paths:
  - 'reqs/e2e/**'
  - 'reqs/e2e-examples/**'
---

# E2E specs

E2E_SUBJECT: an e2e case exercises one user or system flow end to end — the sequence a person or an upstream system actually performs — not one module and not one contract. It is the only level that proves the assembled product does what it claims.

E2E_IS_FLAT: `reqs/e2e/` has no mirrored sub-tree, because a flow crosses modules and has no single app path to mirror. Name the file for the flow (`workflows.e2e.test.js`), never for a module, or the case ends up filed under whichever module it happened to start in.

E2E_NAMED_BY_FLOW: name the file and every case after an outcome a user recognises — "a draft survives a reload", "an expired key is reported before the run starts" — never after the modules traversed, or the suite reads as a second integration tree.

E2E_NO_INTERNAL_REACH: drive the flow only through surfaces a real actor has, and assert only on what that actor observes. Reaching into a module to arrange or inspect state makes the case an integration spec in disguise.

E2E_FEW_AND_LOAD_BEARING: keep the suite small and reserved for flows whose breakage would be a user-visible outage. Breadth belongs at the cheaper levels that localise failure; otherwise the slowest, flakiest level becomes the widest one.

E2E_SEEDS_THROUGH_SUPPORT: set up and tear down through `reqs/support/`, not by writing storage directly from the case, or every case encodes the current persistence shape and a storage change rewrites the suite.

## Validation

E2E_FLAT_CHECK: every case sits directly under `reqs/e2e/`; none sits under `reqs/integration/` or carries an integration suffix.
E2E_FLOW_NAME_CHECK: file and cases are named for the user-recognisable flow and outcome.
E2E_SURFACE_CHECK: setup, drive and assertion go through actor-visible surfaces or a `reqs/support/` command.
E2E_SIZE_CHECK: each case earns its place — its breakage would be user-visible; coverage that could live lower moves down.
