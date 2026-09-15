---
paths:
  - 'reqs/**/*.js'
  - 'reqs/**/*.md'
---

# Specs in `reqs/`

# Reasoning Principles

## What belongs here

REQS_VERIFIES_THE_APP: keeps in `reqs/` everything that verifies or justifies `chrome-extension/` and nothing the extension ships — otherwise a packaged file depends on a tree Chrome never loads.
SPECS_IMPORT_ONE_WAY: imports from `reqs/` into the app freely and never back, since nothing here is packaged — otherwise the shipped extension carries a path that exists only at test time.
CHAIN_IS_UNBROKEN: carries a requirement through three files — a named variable in `chrome-extension/constraints/` → a named instance in `reqs/<scope>-examples/` → a case in `reqs/<scope>/` whose title states the rule and whose assertion references both — referring at each hop over restating the value — otherwise a literal mid-chain is an orphan that a later boundary change silently misses.

## Choosing a level

LEVEL_BY_WHAT_STAYS_REAL: picks the level by which modules stay real over what the file is about — otherwise the filing says nothing true about the spec, as it did for a dozen specs that sat under `integration/` while doubling every collaborator.
PLATFORM_EDGE: doubles `chrome.*`, network, storage and time from `reqs/support/`, and never an app module the case is meant to exercise — otherwise the spec asserts against its own mock and the subject reports 0% coverage.
BROWSER_IS_NOT_COLLECTED: leaves `reqs/browser/` out of `vitest.config.js` and runs it with Node's test runner, sending anything jsdom _could_ cover down to a level `npm test` runs — otherwise the check nobody runs becomes the one the project depends on.

## What every case does

SPEC_IMPORTS_SUBJECT: imports the module the spec is named after and asserts against its behaviour, doubling only its _collaborators_, over a local re-implementation or a mock standing in for the subject — otherwise the suite passes while the subject reports 0% coverage, as two suites here did across a thousand lines rebuilding `background.js` and `sidepanel.js` inline.
SPEC_ASSERTS: ends every case in at least one assertion about the subject, and deletes a case that only arranges state or concedes in a comment that the outcome "may vary depending on implementation" — otherwise a green case stands in for coverage it never had.
SPEC_SCENARIOS: covers happy path, every conditional branch, empty/null/zero/undefined inputs, error and rejection paths, and boundary values — otherwise one passing example passes for a suite.
ONE_RULE_PER_CASE: asserts one independently testable rule per case, splitting a compound one — otherwise a failure names several rules and points at none.
SPEC_IMPORTS_THE_CONSTRAINT: imports the boundary from `chrome-extension/constraints/<subject>.constraints.js` — `MAX_TEMPLATES`, `STORAGE_CHUNK_SIZE` — over writing the number, and names the variable in the title when the case exists because of it (`When a value exceeds STORAGE_CHUNK_SIZE`) — otherwise the spec keeps passing against a boundary the app no longer enforces.
NO_ANONYMOUS_DATA: builds a case's inputs from a named example over an inline literal — otherwise the reader reconstructs the scenario from field values and the title is the only statement of intent.
REQUIREMENT_TRACE: names the origin of a spec that exists because of a decision in the file header (`Origin: <scope>.adr-<n>`) — otherwise a later reader cannot tell broken code from a retired rule.
PROVE_IT_FAILS: breaks the covered behaviour → watches the new case go red → restores it, before trusting the case — otherwise a case that inspects nothing ships green, which a renamed container id, removed output escaping and a changed menu cap each caught here.

# Output Shape

## File names

| Level / role | What stays real                             | File name                                                          | Collected |
| ------------ | ------------------------------------------- | ------------------------------------------------------------------ | --------- |
| unit         | exactly one module, collaborators doubled   | `reqs/unit/<app-path>/<module>.spec.js`                            | yes       |
| integration  | two or more, only the platform edge doubled | `reqs/integration/<primary-app-path>/<module>.integration.spec.js` | yes       |
| e2e          | a whole flow, no primary module             | `reqs/e2e/<flow>.e2e.spec.js` (flat)                               | yes       |
| cross        | a property every module must hold           | `reqs/cross/<concern>.cross.spec.js` (flat)                        | yes       |
| browser      | all of them, in a real Chrome               | `reqs/browser/<flow>.smoke.js` (flat)                              | no        |
| example data | —                                           | `<subject>.examples.js`                                            | no        |
| double       | —                                           | `<subject>.mock.js`                                                | no        |
| harness      | —                                           | `<runner>.setup.js`                                                | no        |
| driver       | —                                           | `<runner>.driver.js`                                               | no        |
| lint rule    | —                                           | `<concern>.rules.js`, `<module>.boundary.js`                       | no        |
| decision log | —                                           | `<scope>.adr.md`, `<scope>.wip.md`                                 | no        |

SPEC_SUFFIX_IS_THE_LEVEL: ends every collected spec in `.spec.js` and states its level in the infix before it — bare for unit, `.integration.`, `.e2e.`, `.cross.` — moving a spec's file and its infix together when its level changes, over renaming one to stand for the other — otherwise the file sits at one level, is collected as another, or drops out of the run when its suffix stops matching `vitest.config.js`.
SPEC_IMPORTS_ARE_RELATIVE_AND_EXTENSIONED: reaches the app by a relative specifier ending in `.js` — `'../../../chrome-extension/shared/providers.js'` — over the `@app`/`@constraints`/`@reqs` aliases `vitest.config.js` declares, which resolve only under Vitest — otherwise a spec's import graph stops resembling the one the extension runs, and hides a path the app itself must be able to load.

## Titles

```javascript
describe('TemplateManager: Given the template manager over a doubled storage', () => {
  describe('TemplateManager: When the template limit is reached', () => {
    it('TemplateManager: Then it refuses the next template and names the limit', ...
```

GHERKIN_BY_DEPTH: writes the outer `describe` as `Given <preconditions>`, every nested `describe` as `When <condition>`, and every `it`/`test` as `Then <expected result>` — otherwise a suite reads as three levels of unlabelled prose and nothing separates the state a case assumes from the action it takes.
GIVEN_IS_STATE_WHEN_IS_ACTION: puts what is already true in the `Given`, what happens in the `When`, and what must hold in the `Then`, over splitting one sentence across the three — otherwise the keywords are decoration and the reader still has to open the body.
TITLE_NAMES_ITS_SUBJECT: prefixes every title with the module or component a failure would blame, PascalCase and dot-separated to reach a sub-component (`EditorTab.TemplateRun`), first segment matching the spec file's own base name — otherwise a failing line in a run of several hundred cases says what broke but not what owns it, and `--reporter=verbose | grep <Subject>` stops answering what a module is held to.
OUTCOME_NOT_STEPS: states the rule the case enforces after `Then` over the call it makes — "Then it escapes a template name rather than rendering it as markup", not "Then it calls sanitizeText" — otherwise renaming the implementation invalidates the title.
TITLE_IS_UNIQUE: gives no two blocks in a file the same title, separating near-identical cases by the input that differs — otherwise a duplicate title cannot identify which rule failed.
TITLES_ARE_LINTED: leaves the three title rules to `reqs/rules/spec-titles.rules.js` over review — otherwise the convention holds only as long as the reviewer's attention does.

## Examples

EXAMPLES_MIRROR: mirrors `reqs/<scope>/` one level up at `reqs/<scope>-examples/`, naming every file `<subject>.examples.js` — `unit-examples/shared/foo.examples.js` backs `unit/shared/foo.spec.js`.
EXAMPLE_IS_A_NAMED_VARIABLE: exports each instance as a named constant describing the case it serves — `templateAtTheLimit`, `historyEntryThatFailed`, `settingsWithOpenAI` — over an anonymous literal in the case or a positional entry in an array — otherwise the case is a wall of field values and its intent lives only in the title.
EXAMPLES_HOLD_DATA_ONLY: keeps an examples file to data, composing boundary-bearing fields from `chrome-extension/constraints/` and leaving descriptive values such as a display name or a sample sentence as literals — otherwise a requirement hides in a fixture and a boundary change misses it.
EXAMPLE_NAME_IS_STABLE: names an example for what it is in the domain over the case that first needed it — `emailTemplate`, not `templateForSearchTest` — otherwise the second consumer either renames it or, more often, copies it.

# Validation

LEVEL_CHECK: each spec's level matches which modules it keeps real, per the table above.
SUFFIX_CHECK: every file under `reqs/` carries one of the file names in the table, its infix agrees with the directory it sits in, and no `.test.js` exists.
COLLECTION_CHECK: `npx vitest list --filesOnly` names every spec file that exists; a file absent from that output has the wrong suffix or the wrong path.
TITLE_CHECK: `npx eslint "reqs/**/*.js"` passes, so every title carries its subject and its keyword and no two in a file match.
SUBJECT_IMPORT_CHECK: the module named in the file name is imported for real, and no mock stands in for it.
ASSERTION_CHECK: every case ends in an assertion about the subject.
BOUNDARY_IMPORT_CHECK: no spec or examples file holds a boundary literal that a constraint variable already states.
CHAIN_CHECK: reading a case top to bottom reaches the constraint variable through a named example and an assertion that references it, with no literal restated between them.
RED_FIRST_CHECK: each new case has been seen failing against a deliberate break of the thing it covers.
