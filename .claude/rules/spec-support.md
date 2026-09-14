---
paths:
  - 'reqs/support/**'
---

# Spec support

Every method, script, command, harness or double that serves the specs rather
than stating a requirement: `chrome-api.mock.js` (the Chrome API double, used
by ten suites across two levels) and `vitest.setup.js` (installs that double,
resets storage between cases, registers custom matchers).

SUPPORT_NOT_SPEC: a support file asserts nothing and owns no requirement — no `it`/`test` case, and no boundary literal; import any value it needs from `chrome-extension/constraints/`. Otherwise a requirement hides where nobody looks for it and the gate cannot tell coverage from scaffolding.

SUPPORT_NAMED_BY_SUBJECT: name a file for what it doubles or drives — `chrome-api.mock.js`, `vitest.setup.js` — never for its role. `mocks/`, `helpers/`, `utils/` and `common/` are how a junk drawer starts; this directory replaced a `reqs/mocks/` for exactly that reason (layout.adr-3).

SUPPORT_ON_DEMAND: a file arrives here when a **second** consumer needs it, not in anticipation of one. A double used by exactly one spec stays beside that spec.

SUPPORT_MOCKS_ARE_PLAIN: the Chrome mock's API methods are plain functions, not spies. A spec asserting on calls must `vi.spyOn(chromeMock.<area>, '<method>')` itself; events expose `_trigger(...)` and `_listeners` instead.

Nothing under `reqs/support/` counts as coverage.
