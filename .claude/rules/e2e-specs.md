---
paths:
  - 'reqs/e2e/**/*.e2e.test.js'
  - 'reqs/e2e-examples/**/*.examples.js'
---

# E2E specs

E2E_FILENAME: names the file `reqs/e2e/<flow>.e2e.test.js` — the `.e2e.` infix is what separates it from `reqs/integration/`'s `.integration.test.js` and `reqs/unit/`'s bare `.test.js` once both are flattened into one Vitest run, and `npm run test:e2e` selects the directory — and backs it, when it needs data, with `reqs/e2e-examples/<flow>.examples.js` — otherwise a plain `.test.js` here reads as a unit spec that wandered up.
E2E_SUBJECT: exercises one user or system flow end to end — the sequence a person or an upstream system actually performs — over one module or one contract — otherwise nothing proves the assembled product does what it claims.
E2E_IS_FLAT: keeps `reqs/e2e/` free of a mirrored sub-tree and names the file for the flow (`workflows.e2e.test.js`) over a module, because a flow crosses modules and has no single app path to mirror — otherwise the case ends up filed under whichever module it happened to start in.
E2E_NAMED_BY_FLOW: names the file and every case after an outcome a user recognises — "a draft survives a reload", "an expired key is reported before the run starts" — over the modules traversed — otherwise the suite reads as a second integration tree.
E2E_NO_INTERNAL_REACH: drives the flow only through surfaces a real actor has and asserts only on what that actor observes — otherwise reaching into a module to arrange or inspect state makes the case an integration spec in disguise.
E2E_FEW_AND_LOAD_BEARING: reserves the suite for flows whose breakage would be a user-visible outage and leaves breadth to the cheaper levels that localise failure — otherwise the slowest, flakiest level becomes the widest one.
E2E_SEEDS_THROUGH_SUPPORT: sets up and tears down through `reqs/support/` over writing storage directly from the case — otherwise every case encodes the current persistence shape and a storage change rewrites the suite.

## Validation

E2E_FLAT_CHECK: every case sits directly under `reqs/e2e/` and is named `<flow>.e2e.test.js`; none sits under `reqs/integration/` or carries an integration suffix.
E2E_FLOW_NAME_CHECK: file and cases are named for the user-recognisable flow and outcome.
E2E_SURFACE_CHECK: setup, drive and assertion go through actor-visible surfaces or a `reqs/support/` command.
E2E_SIZE_CHECK: each case earns its place — its breakage would be user-visible; coverage that could live lower moves down.
