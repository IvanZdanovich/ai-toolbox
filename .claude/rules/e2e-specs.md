---
paths:
  - 'reqs/e2e/**/*.e2e.spec.js'
  - 'reqs/e2e-examples/**/*.examples.js'
  - 'reqs/support/*.selectors.js'
  - 'reqs/support/*.commands.js'
  - 'reqs/support/*.localization.js'
  - 'reqs/support/playwright.driver.js'
  - 'playwright.config.js'
---

# E2E specs

# Reasoning Principles

E2E_DRIVES_THE_SHIPPED_UI: runs under Playwright in a real Chrome with the unpacked extension installed (`npm run test:e2e`, `playwright.config.js`) and drives the panel through clicks and typing, over importing an app module into jsdom — otherwise the widest level in the project proves the services agree with each other and nothing about the product a user opens, which is all `workflows.e2e.spec.js` was doing before it moved down to `reqs/integration/`.
E2E_SUBJECT: exercises one user flow end to end — the sequence a person actually performs — over one module or one contract — otherwise nothing proves the assembled product does what it claims.
E2E_NO_INTERNAL_REACH: drives the flow only through surfaces a real actor has and asserts only on what that actor observes, importing no app module and writing no storage key — otherwise reaching into a module to arrange or inspect state makes the case an integration spec in disguise. A constraint is the one thing it may import, and only to state the boundary the UI has to hold.
E2E_FEW_AND_LOAD_BEARING: keeps a case only when its breakage would be a user-visible outage, leaving breadth to the cheaper levels that narrow a failure to one module — otherwise the slowest, flakiest level becomes the widest one.
E2E_IS_A_SEQUENCE: runs a flow's steps in order against one open panel — `test.describe.configure({ mode: 'serial' })`, the action in each `When`'s `beforeAll`, the assertions in its `Then`s — over rebuilding the world per case, because the flow is the subject and a person does not start again between steps.
E2E_SEEDS_THROUGH_SUPPORT: sets up, drives and tears down through `reqs/support/` — a command for the deed, a selector for the surface, `en.localization.js` for the copy — over raw selector strings, quoted UI text or storage writes in the case — otherwise every case encodes today's markup and a rename rewrites the suite.
E2E_USES_THE_DEMO_PROVIDER: drives the demo provider over a configured one, and tolerates `MOCK_FAILURE_RATE` by retrying rather than asserting on one attempt — otherwise the level depends on a secret and someone else's uptime, or goes red for a fault the provider was built to simulate.
E2E_OWNS_NO_LOGIC: leaves branching, retry counts and waiting to `reqs/support/`, keeping a case to arrange-act-assert — otherwise the case reads as a program and a failure names a line rather than a rule.

# Output Shape

E2E_FILENAME: names the file `reqs/e2e/<flow>.e2e.spec.js` and backs it, when it needs data, with `reqs/e2e-examples/<flow>.examples.js` — the `.e2e.` infix is what `playwright.config.js` matches on, and what separates it from `.integration.spec.js` and unit's bare `.spec.js` — otherwise the file is collected by no runner at all.
E2E_IS_NOT_COLLECTED_BY_VITEST: stays out of `vitest.config.js`'s `include`, since jsdom cannot host it — otherwise `npm test` runs a Playwright file with no browser and fails for a reason that has nothing to do with the extension.
E2E_IS_FLAT: keeps `reqs/e2e/` free of a mirrored sub-tree and names the file for the flow (`template-lifecycle.e2e.spec.js`) over a module, since a flow crosses modules and has no single app path to mirror — otherwise the case ends up filed under whichever module it happened to start in.
E2E_NAMED_BY_FLOW: names the file and every case after an outcome a user recognises — "a draft survives a reload", "an expired key is reported before the run starts" — over the modules traversed — otherwise the suite reads as a second integration tree.
E2E_TITLE_IS_THE_ACTOR: takes the flow as the title subject and writes the `Given` as the actor's situation, the `When` as what they do, the `Then` as what they observe — `TemplateLifecycle: Given a first-time user with the side panel open` / `When the user writes a template and saves it` — naming no module in any of the three — otherwise the flow reads as a module suite and the actor disappears from the one level written for them.
E2E_SUPPORT_LAYERS: splits the scaffolding by what changes it — `<page>.selectors.js` for how a surface is addressed, `<page>.commands.js` for what a user does, `<language>.localization.js` for the copy they read, `playwright.driver.js` for the browser and the installed extension — otherwise a markup change, a flow change and a wording change all land in the same file.
E2E_COMMAND_IS_A_DEED: names a command for the deed and the surface it happens on — `sidePanel_CreateTemplate`, `templateRun_Execute` — and returns what the case asserts on, over asserting inside it — otherwise the requirement moves into support, where the gate does not look for it.

# Validation

E2E_FLAT_CHECK: every case sits directly under `reqs/e2e/` and is named `<flow>.e2e.spec.js`; none sits under `reqs/integration/` or carries an integration infix.
E2E_RUNNER_CHECK: `npx playwright test --list` names every file under `reqs/e2e/`, and `npx vitest list --filesOnly` names none of them.
E2E_FLOW_NAME_CHECK: file and cases are named for the user-recognisable flow and outcome.
E2E_SURFACE_CHECK: the case imports nothing from `chrome-extension/` except a constraint; setup, drive and assertion go through a `reqs/support/` command, selector or localization value.
E2E_NO_RAW_STRING_CHECK: no selector string and no piece of UI copy is written out in a case.
E2E_SIZE_CHECK: each case earns its place — its breakage would be user-visible; coverage that could live lower moves down.
E2E_RED_FIRST_CHECK: each case has been seen failing against a deliberate break of the thing it covers — dropping the name field's `maxlength` turns the boundary case red while `npm test` stays green.
