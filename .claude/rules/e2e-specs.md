---
paths:
  - 'reqs/e2e/**/*.e2e.spec.js'
  - 'reqs/e2e-examples/**/*.examples.js'
---

# E2E specs

# Reasoning Principles

E2E_SUBJECT: exercises one user or system flow end to end — the sequence a person or an upstream system actually performs — over one module or one contract — otherwise nothing proves the assembled product does what it claims.
E2E_NO_INTERNAL_REACH: drives the flow only through surfaces a real actor has and asserts only on what that actor observes — otherwise reaching into a module to arrange or inspect state makes the case an integration spec in disguise.
E2E_FEW_AND_LOAD_BEARING: keeps a case only when its breakage would be a user-visible outage, leaving breadth to the cheaper levels that narrow a failure to one module — otherwise the slowest, flakiest level becomes the widest one.
E2E_SEEDS_THROUGH_SUPPORT: sets up and tears down through `reqs/support/` over writing storage directly from the case — otherwise every case encodes the current persistence shape and a storage change rewrites the suite.

# Output Shape

E2E_FILENAME: names the file `reqs/e2e/<flow>.e2e.spec.js` and backs it, when it needs data, with `reqs/e2e-examples/<flow>.examples.js` — the `.e2e.` infix is what separates it from `.integration.spec.js` and unit's bare `.spec.js` once all three flatten into one Vitest run — otherwise a plain `.spec.js` here reads as a unit spec that wandered up.
E2E_IS_FLAT: keeps `reqs/e2e/` free of a mirrored sub-tree and names the file for the flow (`workflows.e2e.spec.js`) over a module, since a flow crosses modules and has no single app path to mirror — otherwise the case ends up filed under whichever module it happened to start in.
E2E_NAMED_BY_FLOW: names the file and every case after an outcome a user recognises — "a draft survives a reload", "an expired key is reported before the run starts" — over the modules traversed — otherwise the suite reads as a second integration tree.
E2E_TITLE_IS_THE_ACTOR: takes the flow as the title subject and writes the `Given` as the actor's situation, the `When` as what they do, the `Then` as what they observe — `Workflows: Given a first-time user with an empty library` / `When the user creates and runs a template` — naming no module in any of the three — otherwise the flow reads as a module suite and the actor disappears from the one level written for them.

# Validation

E2E_FLAT_CHECK: every case sits directly under `reqs/e2e/` and is named `<flow>.e2e.spec.js`; none sits under `reqs/integration/` or carries an integration infix.
E2E_FLOW_NAME_CHECK: file and cases are named for the user-recognisable flow and outcome.
E2E_SURFACE_CHECK: setup, drive and assertion go through actor-visible surfaces or a `reqs/support/` command.
E2E_SIZE_CHECK: each case earns its place — its breakage would be user-visible; coverage that could live lower moves down.
