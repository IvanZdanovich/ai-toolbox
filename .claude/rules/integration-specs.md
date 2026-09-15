---
paths:
  - 'reqs/integration/*.integration.spec.js'
  - 'reqs/integration-examples/*.examples.js'
---

# Integration specs

# Reasoning Principles

INTEGRATION_SUBJECT: exercises the contract between two or more **real** app modules — the shapes they exchange, the order they call each other in, the errors they propagate — and sends a case needing only one module to `reqs/unit/` — otherwise this suite re-tests unit behaviour at integration cost while the contract itself stays unverified.
PRIMARY_MODULE: picks the primary module by asking whose contract a failure would blame — the one under test, not the one it calls — and names the file after it; a case with no primary module stays here only while it is about module seams, and goes to `reqs/e2e/` the moment it is about what a person does — otherwise the spec is named after the collaborator and a failure points at the wrong owner.
INTEGRATION_REAL_COLLABORATORS: keeps every app module in the contract real and doubles only the platform edge — `chrome.*`, network, clock, storage — from `reqs/support/chrome-api.mock.js` — otherwise doubling a participant reduces the spec to a unit spec asserting against its own mock.
INTEGRATION_OWNS_WIRING: covers what units cannot see — a renamed field, a changed return shape, an unawaited promise, an event emitted with the wrong payload, a mismatch between what one module throws and what the next catches — over re-asserting either module's own logic — otherwise both modules pass alone and the seam between them ships unchecked.
INTEGRATION_NO_UI_FLOW: sends a multi-screen user journey to `reqs/e2e/` even when every module in it is real, stopping this level at the module contract — otherwise `reqs/integration/` slowly absorbs the e2e suite and stops being the level that names a contract's owner.

# Output Shape

INTEGRATION_FILENAME: names the file for the primary module's source base name plus `.integration.spec.js`, directly under `reqs/integration/` — `chrome-extension/background/background.js` is verified by `reqs/integration/background.integration.spec.js` — and backs it, when it needs data, with `reqs/integration-examples/<name>.examples.js`, flat in the same way — otherwise the infix is the only thing separating this level from `reqs/unit/`'s bare `.spec.js` for the same module, and dropping it collides the two.
INTEGRATION_IS_FLAT: keeps `reqs/integration/` free of a sub-tree mirroring `chrome-extension/`, since a contract spans directories and mirroring files it under whichever side happens to be primary — `ls reqs/integration` is then the list of contracts held — otherwise the same module's specs move whenever the app tree is rearranged, for no gain in what the filing says.
INTEGRATION_WITHOUT_A_PRIMARY: names a spec whose flows genuinely have no primary module for the flow itself — `workflows.integration.spec.js` holds the shared services' seam as one library flow runs through all four — over filing it under whichever module its first case happened to touch; a second such file is a sign the cases belong to a primary after all.
INTEGRATION_TITLE_NAMES_THE_PRIMARY: takes the primary module as the title subject over the collaborator, and says in the `Given` which modules are real — `TemplateManager: Given the template manager against the real storage module` — otherwise the output names the module a failure passed through rather than the one whose contract it blames.
BOOT_AS_CHROME_DOES: drives a self-constructing module the way Chrome drives it — `vi.resetModules()` → import → fire the event → `vi.waitFor` on a specific post-init observable — over a fixed sleep; `background.js` constructs itself on import and `sidepanel.js` boots on `DOMContentLoaded` exposing `window.aiToolboxSidePanel` — otherwise the spec races the module's own start-up and flakes.
BOOT_LOADS_REAL_MARKUP: reads the page's real `.html` from disk with `fs` — `chrome-extension/sidepanel/sidepanel.html` — mounts its `<body>` into `document.body.innerHTML` with `<script>` tags stripped, then imports the page module to boot it, over a hand-written DOM string — otherwise a renamed container passes the spec against stale markup.

# Validation

INTEGRATION_FLAT_CHECK: every spec sits directly under `reqs/integration/`, with no sub-directory, named for its primary module's base name (or for the flow, when it has none) plus `.integration.spec.js`.
INTEGRATION_PRIMARY_CHECK: one named primary module, and it is the one a failure would blame; a spec with none is named for its flow and justifies that in its header.
INTEGRATION_NAME_COLLISION_CHECK: no two specs here share a file name; a pair of primary modules with the same base name is qualified by its parent directory, as `reqs/unit/` does.
INTEGRATION_REAL_CHECK: every app module in the contract is imported for real; only the platform edge is doubled.
INTEGRATION_NOT_UNIT_CHECK: each case needs at least two real modules to agree; a case satisfiable by one moves to `reqs/unit/`.
