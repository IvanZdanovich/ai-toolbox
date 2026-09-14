---
paths:
  - 'reqs/integration/**/*.integration.spec.js'
  - 'reqs/integration-examples/**/*.examples.js'
---

# Integration specs

INTEGRATION_FILENAME: names the file for the primary module's source base name plus `.integration.spec.js` and files it at `reqs/integration/<primary-module-app-path>/` — `chrome-extension/background/background.js` is verified by `reqs/integration/background/background.integration.spec.js` — and backs it, when it needs data, with `reqs/integration-examples/<same-path>/<name>.examples.js` — otherwise the infix is the only thing distinguishing this level from `reqs/unit/`'s bare `.spec.js` at the same mirrored path, and dropping it collides the two.
INTEGRATION_SUBJECT: exercises the contract between two or more **real** app modules — that the shapes they exchange, the order they call each other in, and the errors they propagate actually agree — and sends a case needing only one module to `reqs/unit/` — otherwise this suite re-tests unit behaviour at integration cost while the contract itself stays unverified.
PRIMARY_MODULE: files the spec under the app path of the _primary_ module — the one whose contract is under test, not the one it calls — picking it by asking whose contract a failure would indict, and re-files a case with no primary module as a flow under `reqs/e2e/` — otherwise the spec lands under the collaborator and a failure points at the wrong owner.
INTEGRATION_REAL_COLLABORATORS: keeps every app module in the contract real and doubles only the platform edge — `chrome.*`, network, clock, storage — from `reqs/support/chrome-api.mock.js` — otherwise doubling a participant reduces the spec to a unit spec asserting against its own mock.
INTEGRATION_TITLE_NAMES_THE_PRIMARY: takes the primary module as the title subject, never the collaborator, and says in the `Given` which modules are real — `TemplateManager: Given the template manager against the real storage module` — otherwise the output names the module a failure passed through rather than the one whose contract it indicts.
INTEGRATION_OWNS_WIRING: covers the failures units cannot see — a renamed field, a changed return shape, an unawaited promise, an event emitted with the wrong payload, a mismatch between what one module throws and what the next catches.
INTEGRATION_NO_UI_FLOW: sends a multi-screen user journey to `reqs/e2e/` even when every module in it is real, stopping this level at the module contract — otherwise `reqs/integration/` slowly absorbs the e2e suite and loses its mirroring to the app tree.
BOOT_AS_CHROME_DOES: drives a self-constructing module the way Chrome drives it — `vi.resetModules()`, import, fire the event, then `vi.waitFor` on a specific post-init observable — over a fixed sleep; `background.js` constructs itself on import and `sidepanel.js` boots on `DOMContentLoaded` exposing `window.aiToolboxSidePanel` — otherwise the spec races the module's own start-up and flakes.
BOOT_LOADS_REAL_MARKUP: loads the page's real `.html` file from disk with `fs` — `chrome-extension/sidepanel/sidepanel.html` — and mounts its `<body>` into `document.body.innerHTML` under jsdom with the `<script>` tags stripped, over a hand-written DOM string in the spec, then imports the page module itself to boot it — otherwise a renamed container passes the spec against stale markup.

## Validation

INTEGRATION_MIRROR_CHECK: the path mirrors the primary module's app path; the name is that module's base name plus `.integration.spec.js`.
INTEGRATION_PRIMARY_CHECK: one named primary module, and it is the one a failure would indict; a spec with none is re-filed under `reqs/e2e/`.
INTEGRATION_REAL_CHECK: every app module in the contract is imported for real; only the platform edge is doubled.
INTEGRATION_NOT_UNIT_CHECK: each case needs at least two real modules to agree; a case satisfiable by one moves to `reqs/unit/`.
