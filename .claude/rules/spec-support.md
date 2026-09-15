---
paths:
  - 'reqs/support/**/*.js'
---

# Spec support

# Reasoning Principles

SUPPORT_SCOPE: holds every method, script, command, harness, driver or double that serves the specs over stating a requirement — `chrome-api.mock.js` doubles the Chrome API for ten suites across two levels, `vitest.setup.js` installs it, resets storage between cases and registers custom matchers — otherwise scaffolding scatters beside its first consumer and the second one copies it.
SUPPORT_NOT_SPEC: keeps a support file free of assertions and requirements — no `it`/`test` case and no boundary literal, importing any value it needs from `chrome-extension/constraints/` — otherwise a requirement hides where nobody looks for it and the gate cannot tell coverage from scaffolding.
SUPPORT_ON_DEMAND: moves a file here once a **second** consumer needs it and leaves a single-spec double beside that spec — otherwise shared scaffolding piles up for consumers that never arrive.
SUPPORT_MOCKS_ARE_PLAIN: exposes a mock's API methods as plain functions and its events as `_trigger(...)` and `_listeners`, leaving a spec that asserts on calls to wrap them in `vi.spyOn(chromeMock.<area>, '<method>')` itself, over shipping spies from the double — otherwise every suite inherits call state from the one before it.
SUPPORT_IS_NOT_COVERAGE: counts nothing under `reqs/support/` as coverage, over crediting a double for the lines its consumers run through it — otherwise scaffolding inflates the number the coverage floor is meant to guard.

# Output Shape

SUPPORT_NAMED_BY_SUBJECT: names a file for what it doubles or drives, suffixed by what it is — `<subject>.mock.js` for a double, `<runner>.setup.js` for a harness the runner loads, `<runner>.driver.js` for one that drives an external tool — over its role, keeping `mocks/`, `helpers/`, `utils/` and `common/` out — otherwise the directory becomes the junk drawer `reqs/mocks/` already became once before it was consolidated here.
SUPPORT_NEVER_COLLECTED: keeps `.spec.js` out of this directory, the suffix reserved for the four levels `vitest.config.js` collects — otherwise a file here is read as coverage, or the runner tries to execute scaffolding as a suite.

# Validation

SUPPORT_ASSERTION_CHECK: no file under `reqs/support/` contains an `it`/`test` case or a boundary literal.
SUPPORT_NAME_CHECK: every file is named for its subject and ends in `.mock.js`, `.setup.js` or `.driver.js`; no role-named file or directory exists, and no `.spec.js` sits here.
SUPPORT_CONSUMER_CHECK: each file has at least two consuming specs.
