---
paths:
  - 'reqs/**/*.js'
  - 'reqs/**/*.md'
---

# Specs in `reqs/`

`reqs/` holds everything that verifies or justifies `chrome-extension/`.
Nothing here is packaged, so specs import across into the app freely; the app
never imports back.

Every file here is `.js` except the ADR log, which is `.md`. The suffix before
`.js` is what states a file's level and role, and `vitest.config.js` collects
on exactly these:

| Role         | File name                                    | Collected as a spec |
| ------------ | -------------------------------------------- | ------------------- |
| unit         | `<source>.test.js`                           | yes                 |
| integration  | `<primary>.integration.test.js`              | yes                 |
| e2e          | `<flow>.e2e.test.js`                         | yes                 |
| cross        | `<concern>.spec.js`                          | yes                 |
| example data | `<subject>.examples.js`                      | no                  |
| double       | `<subject>.mock.js`                          | no                  |
| harness      | `<runner>.setup.js`                          | no                  |
| lint rule    | `<concern>.rules.js`, `<module>.boundary.js` | no                  |
| decision log | `<scope>.adr.md`, `<scope>.wip.md`           | no                  |

## Which level a spec belongs at

LEVEL_BY_WHAT_STAYS_REAL: picks the level by which modules stay real over what the file is about — otherwise the filing says nothing true about the spec, as it did for twelve specs that sat under `integration/` while doubling every collaborator (layout.adr-4).

| Real app modules in the case                | Level       | Path                                                                      |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| exactly one, collaborators doubled          | unit        | `reqs/unit/<app-path>/<module>.test.js`                                   |
| two or more, only the platform edge doubled | integration | `reqs/integration/<primary-module-app-path>/<module>.integration.test.js` |
| a whole flow, no primary module             | e2e         | `reqs/e2e/<flow>.e2e.test.js` (flat)                                      |
| a property every module must hold           | cross       | `reqs/cross/<concern>.spec.js` (flat, by concern)                         |

PLATFORM_EDGE: doubles `chrome.*`, network, storage and time from `reqs/support/`, and never an app module the case is meant to exercise — otherwise the spec becomes an assertion about its own mock.
SUFFIX_IS_THE_LEVEL: takes the suffix from the table above when adding a file and never renames one to move a spec — a level change moves the file _and_ its suffix together — otherwise a spec sits at one level and is collected as another, or drops out of the run entirely when its suffix stops matching `vitest.config.js`.

## Every spec, at every level

SPEC_IMPORTS_SUBJECT: imports the module the spec is named after and asserts against its behaviour, doubling only its _collaborators_, over a local re-implementation, an inline copy of the logic, or a mock standing in for the subject — otherwise the suite passes while the subject reports 0% coverage, as two suites here did across a thousand lines rebuilding `background.js` and `sidepanel.js` inline.
SPEC_ASSERTS: ends every case in at least one assertion about the subject, and deletes a case that only arranges state or concedes in a comment that the outcome "may vary depending on implementation" — otherwise a green case stands in for coverage it never had.
SPEC_SCENARIOS: covers happy path, every conditional branch, edge cases (empty/null/zero/undefined), error and rejection paths, and boundary values — otherwise one passing example passes for a suite.
ATOMIC_UNIT: asserts one independently testable rule per case, splitting a compound one — otherwise a failure names several rules and localises none.
OUTCOME_TITLE: titles the case after the rule or outcome it enforces over the steps it takes — "escapes a template name rather than rendering it as markup", not "calls sanitizeText" — otherwise a rename of the implementation invalidates the title.
SPEC_IMPORTS_ARE_RELATIVE_AND_EXTENSIONED: reaches the app by a relative specifier ending in `.js` — `'../../../chrome-extension/shared/providers.js'` — over the `@app`/`@constraints`/`@reqs` aliases `vitest.config.js` declares, which resolve only under Vitest and hide a path the app itself must be able to load — otherwise a spec's import graph stops resembling the one the extension runs.
NO_RAW_BOUNDARIES: imports the constraint variable from `chrome-extension/constraints/<subject>.constraints.js` — `MAX_TEMPLATES`, `STORAGE_CHUNK_SIZE` — over the number, in any spec asserting a boundary — otherwise the spec keeps passing against a boundary the app no longer enforces.
REQUIREMENT_TRACE: names the origin of a spec that exists because of a decision in the file header (`Origin: layout.adr-4`) — otherwise a later reader cannot tell broken code from a retired rule.
PROVE_IT_FAILS: breaks the thing a new case covers and watches it go red before trusting it, as every case under `reqs/integration/` was verified — a renamed container id, removed output escaping, a changed menu cap — otherwise a case that inspects nothing ships green.

## Examples

EXAMPLES_MIRROR: `reqs/<scope>-examples/` mirrors the folder shape of `reqs/<scope>/` one level up, and every file in it is named `<subject>.examples.js` — `unit-examples/shared/foo.examples.js` backs `unit/shared/foo.test.js`.
EXAMPLES_HOLD_DATA_ONLY: keeps an examples file to data — no assertions, and no boundary literal a constraint variable already states — composing boundary-bearing fields from `chrome-extension/constraints/` and leaving descriptive values such as a display name or a sample sentence as literals — otherwise a requirement hides in a fixture and a boundary change misses it.

## Validation

LEVEL_CHECK: each spec's level matches which modules it keeps real, per the table above.
SUFFIX_CHECK: every file under `reqs/` carries one of the suffixes in the role table, and its suffix agrees with the directory it sits in.
COLLECTION_CHECK: `npx vitest list --filesOnly` names every spec file that exists; a file that should run and is absent from that output has the wrong suffix or the wrong path.
SUBJECT_IMPORT_CHECK: the module named in the file name is imported for real, and no mock stands in for it.
ASSERTION_CHECK: every case ends in an assertion about the subject.
BOUNDARY_IMPORT_CHECK: no spec or examples file contains a boundary literal that a constraint variable already states.
RED_FIRST_CHECK: each new case has been observed failing against a deliberate break of the thing it covers.
