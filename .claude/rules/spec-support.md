---
paths:
  - 'reqs/support/**/*.js'
---

# Spec support

Every method, script, command, harness or double that serves the specs rather
than stating a requirement: `chrome-api.mock.js` (the Chrome API double, used
by ten suites across two levels) and `vitest.setup.js` (installs that double,
resets storage between cases, registers custom matchers).

SUPPORT_NOT_SPEC: keeps a support file free of assertions and requirements — no `it`/`test` case and no boundary literal, importing any value it needs from `chrome-extension/constraints/` — otherwise a requirement hides where nobody looks for it and the gate cannot tell coverage from scaffolding.
SUPPORT_NAMED_BY_SUBJECT: names a file for what it doubles or drives, suffixed by what it is — `<subject>.mock.js` for a double, `<runner>.setup.js` for a harness the runner loads, as `chrome-api.mock.js` and `vitest.setup.js` do — over its role, keeping `mocks/`, `helpers/`, `utils/` and `common/` out, and never a `.spec.js`, the suffix reserved for the four levels `vitest.config.js` collects, so that a file here can never be read as coverage — otherwise the directory becomes the junk drawer that `reqs/mocks/` already became once (layout.adr-3).
SUPPORT_ON_DEMAND: moves a file here when a **second** consumer needs it and leaves a single-spec double beside that spec — otherwise shared scaffolding accumulates for consumers that never arrive.
SUPPORT_MOCKS_ARE_PLAIN: exposes the Chrome mock's API methods as plain functions over spies, leaving a spec that asserts on calls to `vi.spyOn(chromeMock.<area>, '<method>')` itself and exposing events as `_trigger(...)` and `_listeners` — otherwise every suite inherits call state from the one before it.
SUPPORT_IS_NOT_COVERAGE: nothing under `reqs/support/` counts as coverage.

## Validation

SUPPORT_ASSERTION_CHECK: no file under `reqs/support/` contains an `it`/`test` case or a boundary literal.
SUPPORT_NAME_CHECK: every file is named for its subject and ends in `.mock.js` or `.setup.js`; no role-named file or directory exists, and no `.spec.js` sits here.
SUPPORT_CONSUMER_CHECK: each file has at least two consuming specs.
