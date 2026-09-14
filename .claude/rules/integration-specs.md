---
paths:
  - 'reqs/integration/**'
  - 'reqs/integration-examples/**'
---

# Integration specs

INTEGRATION_SUBJECT: an integration spec exercises the contract between two or more **real** app modules — that the shapes they exchange, the order they call each other in, and the errors they propagate actually agree. A case needing only one module belongs in `reqs/unit/`; otherwise this suite re-tests unit behaviour at integration cost while the contract itself stays unverified.

PRIMARY_MODULE: file the spec under the app path of the _primary_ module — the one whose contract is under test, not the one it calls — and name it for that module. Pick it by asking whose contract a failure would indict. When no module is primary the case is a flow and belongs in `reqs/e2e/`.

INTEGRATION_REAL_COLLABORATORS: keep every app module in the contract real; double only the platform edge — `chrome.*`, network, clock, storage — from `reqs/support/chrome-api.mock.js`. Doubling a participant reduces the spec to a unit spec asserting against its own mock.

INTEGRATION_OWNS_WIRING: this level owns the failures units cannot see — a renamed field, a changed return shape, an unawaited promise, an event emitted with the wrong payload, a mismatch between what one module throws and what the next catches.

INTEGRATION_NO_UI_FLOW: a multi-screen user journey is an e2e case even when every module in it is real. Integration stops at the module contract, or `reqs/integration/` slowly absorbs the e2e suite and loses its mirroring to the app tree.

## Booting a module that self-constructs

`background.js` constructs itself on import; `sidepanel.js` boots on
`DOMContentLoaded` and exposes `window.aiToolboxSidePanel`. Both are driven the
way Chrome drives them: `vi.resetModules()`, import, fire the event, then
`vi.waitFor` on a specific post-init observable — never a fixed sleep.

Load the page's real `sidepanel.html` rather than a hand-written DOM, so a
renamed container fails the spec instead of passing against stale markup.

## Validation

INTEGRATION_MIRROR_CHECK: the path mirrors the primary module's app path; the name is that module's base name plus `.integration.test.js`.
INTEGRATION_PRIMARY_CHECK: one named primary module, and it is the one a failure would indict; a spec with none is re-filed under `reqs/e2e/`.
INTEGRATION_REAL_CHECK: every app module in the contract is imported for real; only the platform edge is doubled.
INTEGRATION_NOT_UNIT_CHECK: each case needs at least two real modules to agree; a case satisfiable by one moves to `reqs/unit/`.
