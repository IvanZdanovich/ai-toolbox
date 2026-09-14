---
paths:
  - 'reqs/**'
---

# Specs in `reqs/`

`reqs/` holds everything that verifies or justifies `chrome-extension/`.
Nothing here is packaged, so specs import across into the app freely; the app
never imports back.

## Which level a spec belongs at

Decide by what stays **real**, not by what the file is about. Twelve specs here
sat under `integration/` while doubling every collaborator, so the filing said
nothing true about any of them (`reqs/adr/layout/layout.adr.md`, layout.adr-4).

| Real app modules in the case                | Level       | Path                                                                      |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| exactly one, collaborators doubled          | unit        | `reqs/unit/<app-path>/<module>.test.js`                                   |
| two or more, only the platform edge doubled | integration | `reqs/integration/<primary-module-app-path>/<module>.integration.test.js` |
| a whole flow, no primary module             | e2e         | `reqs/e2e/<flow>.e2e.test.js` (flat)                                      |
| a property every module must hold           | cross       | `reqs/cross/<concern>.spec.js` (flat, by concern)                         |

The platform edge is `chrome.*`, network, storage and time — double those from
`reqs/support/`. Doubling an app module the case is meant to exercise turns the
spec into an assertion about its own mock.

## Every spec, at every level

SPEC_IMPORTS_SUBJECT: import the module the spec is named after and assert against its behaviour — never a local re-implementation, an inline copy of the logic, or a mock standing in for the subject itself. Mocking the subject's _collaborators_ is fine. Two suites here once rebuilt `background.js` and `sidepanel.js` inline and passed across a thousand lines while both modules reported 0% coverage.

SPEC_ASSERTS: every case ends in at least one assertion about the subject. A case that only arranges state, or whose comment concedes the outcome "may vary depending on implementation", is deleted — not left green.

SPEC_SCENARIOS: happy path, every conditional branch, edge cases (empty/null/zero/undefined), error and rejection paths, boundary values. One passing example is not a suite.

ATOMIC_UNIT: one independently testable rule per case; split a compound one.

OUTCOME_TITLE: title the case after the rule or outcome it enforces, not the steps it takes — "escapes a template name rather than rendering it as markup", not "calls sanitizeText".

NO_RAW_BOUNDARIES: a spec asserting a boundary imports the constraint variable from `chrome-extension/constraints/` — `MAX_TEMPLATES`, `STORAGE_CHUNK_SIZE` — never the number.

REQUIREMENT_TRACE: a spec that exists because of a decision names its origin in the file header (`Origin: layout.adr-4`), so a later reader can tell broken code from a retired rule.

PROVE_IT_FAILS: before trusting a new case, break the thing it covers and watch it go red. Every case under `reqs/integration/` was verified this way — a renamed container id, removed output escaping, a changed menu cap.

## Examples

`reqs/<scope>-examples/` mirrors the folder shape of `reqs/<scope>/` one level
up: `unit-examples/shared/foo.examples.js` backs `unit/shared/foo.test.js`.

An examples file holds data and nothing else — no assertions, and no boundary
literal a constraint variable already states. Compose boundary-bearing fields
from `chrome-extension/constraints/`; leave descriptive values (a display name,
a sample sentence) as literals.
