---
name: solution-architecture
description: Use when structuring a new component/module or restructuring an existing one along with its tests and docs, when making and recording a pivot-level architectural decision (an ADR, including how a boundary should be enforced) and its motivation, or when a conversation surfaces a business rule that should be captured as an executable constraint/example/spec requirement. Routine or low-level technical decisions are never recorded — only pivots and business rules are.
---

# Reference tree

```
app
  module1/...
test
  unit/
    module1/...            # mirrors app/module1
  integration/
    module2/...             # mirrors the app path of the primary module under test
  e2e/                       # flat — a user/system flow, not one module
  unit-examples/
    module1/...              # mirrors test/unit/module1
  integration-examples/
    module2/...               # mirrors test/integration/module2
  e2e-examples/                # flat, mirrors test/e2e
adr/
  ADR-001.yaml                 # flat — ADRs form a dependency graph, not a tree
```

# Principles

MODULE_BOUNDARY: every component/module is self-contained behind one public entry point — otherwise internal details leak and callers couple to implementation instead of contract
MINIMAL_SURFACE: the public entry re-exports only what external callers need, explicitly, never a wildcard — otherwise the public API grows unintentionally and can't shrink without breaking callers
STRUCTURE_ON_DEMAND: add an optional file (styles, constants, utils, sub-module) only once the module actually needs it — otherwise scaffolding by convention produces empty or near-empty files nobody maintains
TEST_WITH_MODULE: every module ships unit coverage under `test/unit`, and cross-module behavior under `test/integration` — otherwise structure changes silently drop coverage
TEST_MIRRORS_APP: `test/unit/<path>` and `test/integration/<path>` mirror the app tree at `app/<path>` — same relative folder path, one test file per source item, named with a suffix on that item's own name (e.g. `foo.ts` → `foo.test.ts`); `test/e2e` stays flat because an e2e case exercises a flow, not one module — otherwise a renamed or moved source file leaves its test orphaned and undiscoverable
EXAMPLES_MIRROR_TESTS: `test/unit-examples`, `test/integration-examples`, `test/e2e-examples` mirror the folder shape of their matching test root one level up — otherwise example data drifts out of sync with the specs that consume it and nobody can tell which example backs which test
DOC_IS_WHY_NOT_WHAT: a module's doc records why it exists, its contract, and its gotchas; it never restates a signature or logic the code already expresses — otherwise the doc duplicates the code and rots the first time either changes
ADR_IS_WHY_NOT_WHAT: an ADR captures the problem, the choice, and the basis/motivation for it — not an implementation walkthrough, which belongs in the code and its PR
ADR_SCOPE: a decision is architectural only if it changes system boundaries, module responsibilities, or cross-module contracts (module creation/deletion/merge/split, interface definitions, technology selection, cross-cutting concerns, performance/scalability/determinism constraints, workflow orchestration, domain invariants with architectural impact); a decision affecting only internal implementation detail is never an ADR — otherwise the log fills with technical trivia that drowns the decisions that actually matter
ADR_ATOMIC: one ADR records one concern, one change, one file; a decision with multiple consequences is split into multiple ADRs — otherwise rollback, dependency graphs, and AI-safe reasoning over the log all break down
ADR_BAR: record an ADR only when it clears ADR_SCOPE, is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area — otherwise the log fills with routine choices nobody needs to look up
SCOPE_MATCH: file a doc, ADR, or requirement at the smallest scope that fully contains it — module doc for one module, ADR for a one-time cross-cutting pivot, requirement file trio for a business-rule constraint — otherwise a local trap hides in a global doc, a systemic decision hides in one module, or a granular constraint clutters an ADR
REQUIREMENT_BAR: capture an implementation-level detail as a requirement only when it clears ADR_SCOPE's spirit (it encodes a business rule, not a technical implementation detail), is non-obvious from reading the resulting code, would cost real rework or a defect if forgotten, and would recur for the next person touching this area — otherwise routine implementation chatter piles up as noise nobody reads
REQUIREMENT_SOURCE: capture a requirement from a decision actually made in conversation — a stated business rule, an agreed tradeoff, a discovered domain edge case, a rejected alternative — never from an assumption about what "should" be true — otherwise the log records guesses instead of ground truth
EPHEMERAL_EXCLUSION: exclude task-local detail that dies with the task (a variable name picked this session, a temporary workaround, a one-off data fix) in favor of anything reusable beyond the current change — otherwise the requirements log fills with scratch notes
DERIVABLE_EXCLUSION: exclude anything a future reader could recover by reading the code, tests, or types — otherwise the log duplicates the code and rots the first time either changes
ATOMIC_UNIT: split a compound ask into one requirement per independently testable rule — otherwise a bundled spec can be half-satisfied and no one notices
SINGLE_OWNER: check the constraints file for an existing variable stating the same boundary before adding a new one, and import it instead of redeclaring it — otherwise two variables drift apart and no reader knows which is canonical
BOUNDARY_ENFORCEMENT_MECHANICAL: back every module/architectural boundary with an automated lint or dependency-graph rule (e.g. dependency-cruiser, ArchUnitTS), not prose alone — otherwise context pressure erodes agent compliance over a long session and the boundary quietly regresses to whatever the code happens to do
REVERSE_BOUNDARY: pair a module's public-entry allow-list with a reverse deny-rule blocking external files from importing anything but that entry point — otherwise an external consumer reaches past the public API unnoticed
BOUNDARY_ROLLOUT: land a new enforcement rule scoped to one directory or module at a time, expanding to siblings only after the first is green — otherwise a codebase-wide enforcement change stalls in merge conflicts across every team touching the tree
BOUNDARY_PERMANENCE: block any change that deletes or weakens an existing boundary rule file unless it links a superseding ADR — otherwise deadline pressure quietly strips guardrails to get code merged
EMPTY_RULE_GUARD: make a boundary or requirement rule fail loud when its file pattern matches zero files, never pass silently — otherwise a path typo turns the rule into a no-op that stays green forever
COMPLEXITY_PRECHECK: split a file above the project's size/complexity threshold into smaller units before editing its logic — otherwise large, tangled edits and any later automated processing of that file degrade sharply
ADR_ANTI_FEATURE: reject an ADR that introduces hidden coupling, implicit behavior, non-deterministic behavior, unnecessary complexity, technology lock-in without justification, or an architecture that cannot be tested or validated by AI — otherwise the log legitimizes exactly the decisions it exists to keep out
ADR_ESSENTIAL_COMPLEXITY: before acceptance, ask whether the complexity the decision introduces is essential to the domain or accidental to the implementation — accept only if essential — otherwise architecture drifts away from lean and deterministic

# Method

## Component level

DISCOVER: inspect neighbouring modules for the project's existing folder shape, public-entry convention, and test-location convention before adding a new one
ENTRY_POINT: give the module one public entry point that re-exports its public surface explicitly; keep every other file reachable only through relative/internal paths
COLOCATE_OPTIONAL: add a styles/constants/utils/sub-module file next to the entry point only once the module needs it, matching the shape of neighbouring modules
NEST_RECURSIVELY: a sub-module gets the same folder-plus-entry-point shape as its parent; keep it private unless the parent's entry point re-exports it
TEST_SCENARIOS: cover happy path, every conditional branch, edge cases (empty/null/zero/undefined), error/rejection paths, and boundary values — a single passing example is not a test suite
MIRROR_PLACEMENT: place a unit test at `test/unit/<app-relative-path>` and an integration test at `test/integration/<app-relative-path-of-primary-module>`, each named `<sourceBaseName><projectTestSuffix>`; place an e2e case flat under `test/e2e` — never in an ad hoc test folder
DOC_SCALE: give every top-level module a short doc (why it exists, its contract, its consumers, its gotchas); fold a trivial private sub-module's doc into its parent instead of duplicating a near-empty file
SPLIT_BEFORE_EDIT: check a file's size/complexity against the project's threshold before modifying its logic; split it into smaller functions or files first if it exceeds that threshold

## ADR level

ADR_TRIGGER: draft an ADR when any of — (A) a module/boundary is created, deleted, merged, or split (service, domain aggregate, repository, adapter); (B) a contract changes (API, interface, schema, event); (C) a constraint changes (determinism, performance SLA, reliability target, security requirement); (D) a workflow changes (new workflow, state machine, orchestration logic); (E) a technology is chosen (framework, library, protocol, storage engine); (F) an anti-feature is removed (unnecessary complexity, implicit behavior, hidden coupling)
ADR_STRUCTURE: write every ADR to this shape, all fields mandatory —
```yaml
adr_id: ADR-XXX
title: Short, atomic decision name
status: proposed | accepted | rejected | deprecated | superseded
date: YYYY-MM-DD

context:
  - problem statement
  - constraints
  - domain impact
  - architectural impact

decision:
  - explicit choice
  - alternatives considered
  - non-chosen alternatives and why

consequences:
  - positive outcomes
  - negative outcomes
  - risks
  - mitigations

spec_changes:
  domain: [] # domain spec files affected
  architecture: [] # architecture spec files affected
  workflows: [] # workflow spec files affected
  functional: [] # functional spec files affected
  implementation: [] # implementation spec files affected

tests_affected:
  - unit
  - integration
  - e2e
  - mutation
  - contract

links:
  - related ADRs
  - superseded ADRs
  - upstream/downstream dependencies
```
ADR_STORAGE: store every ADR at `adr/ADR-XXX.yaml`, file name equal to ADR id, no inline diagrams (store diagrams separately and link them); an ADR is immutable once `status: accepted` — a later change is a new ADR that supersedes it, never an edit in place
ADR_DAG: ADRs form a directed acyclic graph — an ADR may depend on or supersede earlier ADRs but must never create a cycle, and must declare both its upstream dependencies and its downstream consequences in `links`
ADR_WORKFLOW: (1) detect a trigger from ADR_TRIGGER; (2) draft the ADR against ADR_STRUCTURE; (3) validate it against ADR_VALIDATION below; (4) a human or governance agent accepts or rejects it; (5) apply the `spec_changes` and code; (6) reference the ADR id from the commit(s) that apply it
INDEX_THEN_DETAIL: keep a short index (id → one-line summary → link) separate from the full ADR detail, so future readers scan the index and open only the relevant record
ENFORCE_NOT_DOCUMENT: when an ADR records a boundary decision, add or update the matching lint/dependency-graph rule in the same change — an ADR alone does not stop the boundary from drifting
SCOPE_ROLLOUT: roll a new enforcement rule out to one directory or module first, then expand to siblings once that first rule is green

## Requirement level

CONSTRAINT_AS_VARIABLE: declare each boundary value, format, or enum once as a named variable/constant in the app module it governs, never as a prose sentence — otherwise the boundary has no single machine-checkable source and drifts from whatever code enforces it
EXAMPLE_OWN_FILE: place named example data instances under `test/<scope>-examples/<mirrored-path>/<area>.examples.<ext>` (scope = unit/integration/e2e), each instance composed from constraint variables and never a raw literal — otherwise example data and boundary truth are edited independently and go out of sync
SPEC_IS_EXECUTABLE: express the requirement as a runnable test/check under `test/<scope>/<mirrored-path>/<area>.spec.<ext>`, with a title stating the rule in plain language and an assertion that references the example instance and constraint variable directly — otherwise the requirement is unverifiable prose that silently goes stale as the code changes under it
CHAIN_INTEGRITY: carry a constraint variable unbroken through the example's fields into the spec's title and assertion, referencing it rather than restating its value as a bare literal at any point — otherwise a mid-chain literal becomes an orphan value no constraint governs and a later boundary change misses it
OUTCOME_TITLE: name the spec's title after the rule or outcome it enforces, not the steps taken to satisfy it — otherwise the title reads as mechanics and hides which requirement it actually records
REQUIREMENT_LAYOUT: place the trio of files for one area at the smallest scope that fully contains the requirement — `<area>.constraints.<ext>` colocated with the app module, `test/<scope>-examples/<mirrored-path>/<area>.examples.<ext>`, `test/<scope>/<mirrored-path>/<area>.spec.<ext>`
FILE_SEPARATION: never mix roles inside one file — a constraints file holds no example data, an examples file holds no assertions, a spec file holds no raw boundary literals — otherwise a single file drifts back into an unstructured notes file and the chain breaks
REQUIREMENT_INDEX: keep a short index (one line per area: area name, one-line rule summary, links to its three files) at `requirements/INDEX.md`, separate from the files it points to — otherwise future readers must open every spec file to find the relevant requirement
STAY_LEAN: fold a requirement that no longer applies into routine convention or retire it — a requirement index only gets read while it stays short enough to read

# Validation

BOUNDARY_CHECK: no external import reaches past a module's public entry point into its internals
SURFACE_CHECK: the public entry re-exports nothing beyond what an external caller actually needs
TEST_CHECK: the module's test suite exercises happy path, branches, edge cases, and error paths, not just a render/smoke check
MIRROR_CHECK: each unit/integration test file's path mirrors its source item's app path under `test/unit`/`test/integration` respectively, its name is the source item's base name plus the project's test suffix, and `test/e2e` cases stay flat
EXAMPLES_MIRROR_CHECK: each `<scope>-examples` entry's path mirrors the matching `test/<scope>` path one level up
DOC_CHECK: the module doc states why/contract/gotchas and does not restate a signature or type the code already shows
ADR_SCOPE_CHECK: the ADR changes a system boundary, module responsibility, or cross-module contract — not only an internal implementation detail
ADR_ATOMIC_CHECK: the ADR records exactly one concern; a multi-consequence decision is split into multiple ADR files
ADR_BAR_CHECK: the ADR clears ADR_SCOPE, is non-obvious, costly if unknown, and recurring; routine technical choices are left out
ADR_STRUCTURE_CHECK: the ADR file has every field from ADR_STRUCTURE populated — no field left blank or omitted
ADR_VALIDATION_CHECK: the decision is explicit (not implied), the justification is deterministic (not subjective), alternatives are listed with reasons for rejection, consequences include risks and mitigations, `spec_changes` and `tests_affected` are enumerated, and the ADR traces to a use case or domain invariant
ADR_DAG_CHECK: the ADR's `links` declare upstream dependencies and downstream consequences, and following supersede/depend edges across the adr/ folder never cycles back to this ADR
ADR_STORAGE_CHECK: the file lives at `adr/ADR-XXX.yaml` named by its id, contains no inline diagram, and — once `status: accepted` — is never edited in place; a change appears as a new ADR marking `superseded` on the old one
ADR_ANTI_FEATURE_CHECK: the ADR introduces no hidden coupling, implicit behavior, non-determinism, unjustified complexity, unjustified lock-in, or untestable/unvalidatable architecture
ADR_ESSENTIAL_COMPLEXITY_CHECK: the complexity the ADR introduces is essential to the domain, not accidental to the implementation; an accidental-complexity ADR is rejected
SCOPE_CHECK: the artifact (doc, ADR, or requirement trio) sits at the file matching SCOPE_MATCH; a system-level tradeoff with alternatives considered is filed as an ADR, not a requirement spec
INDEX_CHECK: the ADR/requirement index entry is one line and links to detail, not the detail inlined into the index
REQUIREMENT_BAR_CHECK: each requirement clears REQUIREMENT_BAR — a business rule (not a technical detail), non-obvious, costly if forgotten, and recurring; requirements that fail are dropped or folded into a code comment instead
VARIABLE_CHECK: each constraint is a single named variable in the constraints file, not a literal hardcoded elsewhere
FILE_SEPARATION_CHECK: constraints, examples, and specs live in three separate files; none mixes another's role
EXECUTABLE_CHECK: the spec is a runnable test that fails when the behavior it describes breaks; a prose-only description with no assertion is incomplete
ATOMIC_CHECK: each spec states one independently testable rule; a compound spec is split
CHAIN_CHECK: every value asserted in a spec traces constraint variable → example field → spec assertion unbroken; a literal that could trace to a constraint but doesn't is extracted into the constraints file instead of left as an orphan
TRACE_CHECK: each spec carries its source context via the project's test-metadata mechanism (tag, decorator, annotation object, or adjacent comment); a spec with no traceable origin is rejected
SINGLE_OWNER_CHECK: no two constraint variables state the same boundary; a duplicate is merged into the existing variable and imports replace the copy
TITLE_CHECK: the spec title names the rule or outcome, not the implementation steps used to meet it
REQUIREMENT_INDEX_CHECK: the requirement index entry is one line and links to the spec file, not the detail inlined into the index
BOUNDARY_ENFORCEMENT_CHECK: a recorded boundary decision has a matching automated rule (lint config, dependency-graph rule), not prose alone
REVERSE_CHECK: each module's public-entry allow-list has a matching reverse rule blocking external files from importing its internals directly
ROLLOUT_CHECK: a new enforcement rule targets one directory/module rather than a codebase-wide sweep, unless it has already proven green elsewhere
PERMANENCE_CHECK: a change deleting or weakening an existing boundary rule file links a superseding ADR; otherwise it is rejected
EMPTY_MATCH_CHECK: every boundary/requirement rule fails on zero matched files/cases instead of passing silently
COMPLEXITY_CHECK: a file above the project's size/complexity threshold is split into smaller units before its logic is edited
