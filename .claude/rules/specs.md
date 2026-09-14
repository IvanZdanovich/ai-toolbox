---
paths:
  - 'reqs/**/*.js'
  - 'reqs/**/*.md'
---

# Specs in `reqs/`

`reqs/` holds everything that verifies or justifies `chrome-extension/`.
Nothing here is packaged, so specs import across into the app freely; the app
never imports back.

A requirement travels one chain, three files, never mixed: the boundary is a
named variable in `chrome-extension/constraints/`, the instance built from it
is a named variable in `reqs/<scope>-examples/`, and the check is a case in
`reqs/<scope>/` whose title states the rule and whose assertion references
both. Constraints → examples → specs, referenced at every hop, never restated.

Every file here is `.js` except the ADR log, which is `.md`. The suffix before
`.js` is what states a file's level and role, and `vitest.config.js` collects
on exactly these:

| Role         | File name                                    | Collected as a spec |
| ------------ | -------------------------------------------- | ------------------- |
| unit         | `<source>.spec.js`                           | yes                 |
| integration  | `<primary>.integration.spec.js`              | yes                 |
| e2e          | `<flow>.e2e.spec.js`                         | yes                 |
| cross        | `<concern>.cross.spec.js`                    | yes                 |
| browser      | `<flow>.smoke.js`                            | no (see below)      |
| example data | `<subject>.examples.js`                      | no                  |
| double       | `<subject>.mock.js`                          | no                  |
| harness      | `<runner>.setup.js`                          | no                  |
| driver       | `<runner>.driver.js`                         | no                  |
| lint rule    | `<concern>.rules.js`, `<module>.boundary.js` | no                  |
| decision log | `<scope>.adr.md`, `<scope>.wip.md`           | no                  |

SPEC_SUFFIX: ends every collected spec in `.spec.js` and states its level in the infix before it — bare for unit, `.integration.`, `.e2e.`, `.cross.` — because one suffix for all four means a file is a spec or it is not, and the infix says which level without a reader opening it; `.test.js` collects nothing (layout.adr-7) — otherwise two suffixes divide the same tree and the level has to be read off the directory alone.

## Which level a spec belongs at

LEVEL_BY_WHAT_STAYS_REAL: picks the level by which modules stay real over what the file is about — otherwise the filing says nothing true about the spec, as it did for twelve specs that sat under `integration/` while doubling every collaborator (layout.adr-4).

| Real app modules in the case                | Level       | Path                                                                      |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| exactly one, collaborators doubled          | unit        | `reqs/unit/<app-path>/<module>.spec.js`                                   |
| two or more, only the platform edge doubled | integration | `reqs/integration/<primary-module-app-path>/<module>.integration.spec.js` |
| a whole flow, no primary module             | e2e         | `reqs/e2e/<flow>.e2e.spec.js` (flat)                                      |
| a property every module must hold           | cross       | `reqs/cross/<concern>.cross.spec.js` (flat, by concern)                   |
| all of them, in a real Chrome               | browser     | `reqs/browser/<flow>.smoke.js` (flat, `npm run test:smoke`)               |

BROWSER_IS_NOT_COLLECTED: leaves `reqs/browser/` out of `vitest.config.js` and runs it with Node's test runner, because those cases need a real Chrome and the `chrome-devtools` CLI (layout.adr-5); everything they cover that jsdom _could_ cover belongs at a level `npm test` runs — otherwise the check nobody runs becomes the one the project depends on.

PLATFORM_EDGE: doubles `chrome.*`, network, storage and time from `reqs/support/`, and never an app module the case is meant to exercise — otherwise the spec becomes an assertion about its own mock.
SUFFIX_IS_THE_LEVEL: takes the suffix from the table above when adding a file and never renames one to move a spec — a level change moves the file _and_ its suffix together — otherwise a spec sits at one level and is collected as another, or drops out of the run entirely when its suffix stops matching `vitest.config.js`.

## Titles

Every block title is `Subject[.Component]: <keyword> <clause>`, the keyword
fixed by the block's depth. `reqs/rules/spec-titles.rules.js` enforces all
three lines below, so a violation is a lint error rather than a review note.

```javascript
describe('TemplateManager: Given the template manager over a doubled storage', () => {
  describe('TemplateManager: When the template limit is reached', () => {
    it('TemplateManager: Then it refuses the next template and says which limit was hit', ...)
```

GHERKIN_BY_DEPTH: writes the outer `describe` as `Given <preconditions>`, every nested `describe` as `When <condition>`, and every `it`/`test` as `Then <expected result>` — otherwise a suite reads as three levels of unlabelled prose and nothing distinguishes the state a case assumes from the action it takes.
GIVEN_IS_STATE_WHEN_IS_ACTION: puts what is already true in the `Given` ("the storage layer fails"), what happens in the `When` ("a workflow is persisted and read back"), and what must hold in the `Then` — over splitting one sentence across the three — otherwise the keywords are decoration and the reader still has to open the body.
TITLE_NAMES_ITS_SUBJECT: prefixes every title with the module or component the case indicts, PascalCase and dot-separated to reach a sub-component (`EditorTab.TemplateRun`), with the first segment matching the spec file's own name — so `vitest run` output, a CI log and a coverage conversation all name coverage the same way, and `--reporter=verbose | grep TemplateManager` is a coverage query — otherwise a failing line in a 363-case run says what broke but not what owns it.
ONE_RULE_PER_TITLE: asserts one independently testable rule per case, splitting a compound one — otherwise a failure names several rules and localises none.
OUTCOME_NOT_STEPS: states the rule or outcome the case enforces after `Then`, never the call it makes — "Then it escapes a template name rather than rendering it as markup", not "Then it calls sanitizeText" — otherwise renaming the implementation invalidates the title.
TITLE_IS_UNIQUE: gives no two blocks in a file the same title, distinguishing near-identical cases by the input that differs — otherwise a duplicate title cannot identify which rule failed.

## Every spec, at every level

SPEC_IMPORTS_SUBJECT: imports the module the spec is named after and asserts against its behaviour, doubling only its _collaborators_, over a local re-implementation, an inline copy of the logic, or a mock standing in for the subject — otherwise the suite passes while the subject reports 0% coverage, as two suites here did across a thousand lines rebuilding `background.js` and `sidepanel.js` inline.
SPEC_ASSERTS: ends every case in at least one assertion about the subject, and deletes a case that only arranges state or concedes in a comment that the outcome "may vary depending on implementation" — otherwise a green case stands in for coverage it never had.
SPEC_SCENARIOS: covers happy path, every conditional branch, edge cases (empty/null/zero/undefined), error and rejection paths, and boundary values — otherwise one passing example passes for a suite.
SPEC_IMPORTS_ARE_RELATIVE_AND_EXTENSIONED: reaches the app by a relative specifier ending in `.js` — `'../../../chrome-extension/shared/providers.js'` — over the `@app`/`@constraints`/`@reqs` aliases `vitest.config.js` declares, which resolve only under Vitest and hide a path the app itself must be able to load — otherwise a spec's import graph stops resembling the one the extension runs.
NO_RAW_BOUNDARIES: imports the constraint variable from `chrome-extension/constraints/<subject>.constraints.js` — `MAX_TEMPLATES`, `STORAGE_CHUNK_SIZE` — over the number, in any spec asserting a boundary, and names it in the title where the case exists because of it (`When a value exceeds STORAGE_CHUNK_SIZE`) — otherwise the spec keeps passing against a boundary the app no longer enforces.
NO_ANONYMOUS_DATA: builds the case's inputs from a named example over an inline literal, so the assertion reads as the rule and not as a shape — otherwise the reader reconstructs the scenario from field values.
REQUIREMENT_TRACE: names the origin of a spec that exists because of a decision in the file header (`Origin: layout.adr-4`) — otherwise a later reader cannot tell broken code from a retired rule.
PROVE_IT_FAILS: breaks the thing a new case covers and watches it go red before trusting it, as every case under `reqs/integration/` was verified — a renamed container id, removed output escaping, a changed menu cap — otherwise a case that inspects nothing ships green.

## Examples

EXAMPLES_MIRROR: `reqs/<scope>-examples/` mirrors the folder shape of `reqs/<scope>/` one level up, and every file in it is named `<subject>.examples.js` — `unit-examples/shared/foo.examples.js` backs `unit/shared/foo.spec.js`.
EXAMPLE_IS_A_NAMED_VARIABLE: exports each instance as a named constant describing the case it serves — `templateAtTheLimit`, `historyEntryThatFailed`, `settingsWithOpenAI` — over an anonymous literal in the case or a positional entry in an array, so the spec body reads as the scenario it states — otherwise the case is a wall of field values and its intent lives only in the title.
EXAMPLES_HOLD_DATA_ONLY: keeps an examples file to data — no assertions, and no boundary literal a constraint variable already states — composing boundary-bearing fields from `chrome-extension/constraints/` and leaving descriptive values such as a display name or a sample sentence as literals — otherwise a requirement hides in a fixture and a boundary change misses it.
EXAMPLE_NAME_IS_STABLE: names an example for what it _is_ in the domain, never for the case that first needed it (`emailTemplate`, not `templateForSearchTest`) — otherwise the second consumer either renames it or, more often, copies it.

## Validation

LEVEL_CHECK: each spec's level matches which modules it keeps real, per the table above.
SUFFIX_CHECK: every file under `reqs/` carries one of the suffixes in the role table, and its suffix agrees with the directory it sits in; no `.test.js` exists.
COLLECTION_CHECK: `npx vitest list --filesOnly` names every spec file that exists; a file that should run and is absent from that output has the wrong suffix or the wrong path.
TITLE_CHECK: `npx eslint "reqs/**/*.js"` passes, so every title carries its subject, its keyword, and no duplicate.
SUBJECT_IMPORT_CHECK: the module named in the file name is imported for real, and no mock stands in for it.
ASSERTION_CHECK: every case ends in an assertion about the subject.
BOUNDARY_IMPORT_CHECK: no spec or examples file contains a boundary literal that a constraint variable already states.
CHAIN_CHECK: reading a case top to bottom reaches the constraint variable through a named example and an assertion that references it, with no literal restated in between.
RED_FIRST_CHECK: each new case has been observed failing against a deliberate break of the thing it covers.
