---
name: solution-architecture
description: Use when structuring a new component/module or restructuring an existing one along with its tests and docs, when making and recording a system-level architectural decision (including how a boundary should be enforced) and its motivation, or when a conversation surfaces a non-obvious implementation constraint that should be captured as an executable constraint/example/spec requirement.
---

# Principles

MODULE_BOUNDARY: every component/module is self-contained behind one public entry point — otherwise internal details leak and callers couple to implementation instead of contract
MINIMAL_SURFACE: the public entry re-exports only what external callers need, explicitly, never a wildcard — otherwise the public API grows unintentionally and can't shrink without breaking callers
STRUCTURE_ON_DEMAND: add an optional file (styles, constants, utils, sub-module) only once the module actually needs it — otherwise scaffolding by convention produces empty or near-empty files nobody maintains
TEST_WITH_MODULE: every module ships a test suite covering it, placed per the project's test-location convention — otherwise structure changes silently drop coverage
TEST_MIRRORS_APP: lay the test tree out as a mirror of the app tree — same relative folder path, one test file per source item, named with a suffix on that item's own name (e.g. `foo.ts` → `foo.test.ts`) — otherwise a renamed or moved source file leaves its test orphaned and undiscoverable
DOC_IS_WHY_NOT_WHAT: a module's doc records why it exists, its contract, and its gotchas; it never restates a signature or logic the code already expresses — otherwise the doc duplicates the code and rots the first time either changes
DECISION_IS_WHY_NOT_WHAT: an architecture decision record captures the problem, the choice, and the basis/motivation for it — not an implementation walkthrough, which belongs in the code and its PR
DECISION_BAR: record a decision only when it is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area — otherwise decision logs fill with routine choices nobody needs to look up
SCOPE_MATCH: file a doc, decision, or requirement at the smallest scope that fully contains it — module doc for one module, area doc for a recurring pattern, decision record for a one-time cross-cutting choice, requirement file trio for an implementation-level constraint — otherwise a local trap hides in a global doc, a systemic decision hides in one module, or a granular constraint clutters a decision record
DECISIONS_MIRROR_APP: file each decision record under a decisions tree that mirrors the app tree, at the path of the module/area the decision governs, not dropped into one flat undifferentiated folder — otherwise a decision becomes disconnected from the code it governs and nobody working in that area finds it
REQUIREMENT_BAR: capture an implementation-level detail as a requirement only when it is non-obvious from reading the resulting code, would cost real rework or a defect if forgotten, and would recur for the next person touching this area — otherwise routine implementation chatter piles up as noise nobody reads
REQUIREMENT_SOURCE: capture a requirement from a decision actually made in conversation — a stated constraint, an agreed tradeoff, a discovered edge case, a rejected alternative — never from an assumption about what "should" be true — otherwise the log records guesses instead of ground truth
EPHEMERAL_EXCLUSION: exclude task-local detail that dies with the task (a variable name picked this session, a temporary workaround, a one-off data fix) in favor of anything reusable beyond the current change — otherwise the requirements log fills with scratch notes
DERIVABLE_EXCLUSION: exclude anything a future reader could recover by reading the code, tests, or types — otherwise the log duplicates the code and rots the first time either changes
ATOMIC_UNIT: split a compound ask into one requirement per independently testable rule — otherwise a bundled spec can be half-satisfied and no one notices
SINGLE_OWNER: check the constraints file for an existing variable stating the same boundary before adding a new one, and import it instead of redeclaring it — otherwise two variables drift apart and no reader knows which is canonical
BOUNDARY_ENFORCEMENT_MECHANICAL: back every module/architectural boundary with an automated lint or dependency-graph rule (e.g. dependency-cruiser, ArchUnitTS), not prose alone — otherwise context pressure erodes agent compliance over a long session and the boundary quietly regresses to whatever the code happens to do
REVERSE_BOUNDARY: pair a module's public-entry allow-list with a reverse deny-rule blocking external files from importing anything but that entry point — otherwise an external consumer reaches past the public API unnoticed
BOUNDARY_ROLLOUT: land a new enforcement rule scoped to one directory or module at a time, expanding to siblings only after the first is green — otherwise a codebase-wide enforcement change stalls in merge conflicts across every team touching the tree
BOUNDARY_PERMANENCE: block any change that deletes or weakens an existing boundary rule file unless it links a superseding decision record — otherwise deadline pressure quietly strips guardrails to get code merged
EMPTY_RULE_GUARD: make a boundary or requirement rule fail loud when its file pattern matches zero files, never pass silently — otherwise a path typo turns the rule into a no-op that stays green forever
COMPLEXITY_PRECHECK: split a file above the project's size/complexity threshold into smaller units before editing its logic — otherwise large, tangled edits and any later automated processing of that file degrade sharply

# Method

## Component level

DISCOVER: inspect neighbouring modules for the project's existing folder shape, public-entry convention, and test-location convention before adding a new one
ENTRY_POINT: give the module one public entry point that re-exports its public surface explicitly; keep every other file reachable only through relative/internal paths
COLOCATE_OPTIONAL: add a styles/constants/utils/sub-module file next to the entry point only once the module needs it, matching the shape of neighbouring modules
NEST_RECURSIVELY: a sub-module gets the same folder-plus-entry-point shape as its parent; keep it private unless the parent's entry point re-exports it
TEST_SCENARIOS: cover happy path, every conditional branch, edge cases (empty/null/zero/undefined), error/rejection paths, and boundary values — a single passing example is not a test suite
MIRROR_PLACEMENT: place a new test at the path that mirrors its source item's path, and name the file `<sourceBaseName><projectTestSuffix>` — never in a flat or ad hoc test folder
DOC_SCALE: give every top-level module a short doc (why it exists, its contract, its consumers, its gotchas); fold a trivial private sub-module's doc into its parent instead of duplicating a near-empty file
SPLIT_BEFORE_EDIT: check a file's size/complexity against the project's threshold before modifying its logic; split it into smaller functions or files first if it exceeds that threshold

## System / general level

RECORD_SHAPE: state the problem being solved, the decision made, the basis/motivation for it, the alternatives considered, and the consequences accepted
RECORD_TRIGGER: write a decision record when a choice constrains future work, forecloses an alternative, or would otherwise be silently re-litigated or re-broken by a later change
INDEX_THEN_DETAIL: keep a short index (area or trigger → one-line summary → link) separate from the full decision detail, so future readers scan the index and open only the relevant record
MIRROR_DECISION_PLACEMENT: place a new decision record at the path in the decisions tree that mirrors the module/area it concerns, and link it from the flat index rather than let the index carry the detail itself
SUPERSEDE_DONT_EDIT: when a decision or requirement changes, add a new record/spec that supersedes the old one and link or mark back to it — otherwise editing history in place erases the reasoning that justified the original choice
STAY_LEAN: merge or retire decision records that no longer apply or have been folded into routine convention — a decision log only gets read while it stays short enough to read
ENFORCE_NOT_DOCUMENT: when recording a boundary decision, add or update the matching lint/dependency-graph rule in the same change — a decision record alone does not stop the boundary from drifting
SCOPE_ROLLOUT: roll a new enforcement rule out to one directory or module first, then expand to siblings once that first rule is green

## Requirement level

CONSTRAINT_AS_VARIABLE: declare each boundary value, format, or enum once as a named variable/constant, never as a prose sentence — otherwise the boundary has no single machine-checkable source and drifts from whatever code enforces it
EXAMPLE_OWN_FILE: place named example data instances in a file separate from both constraints and specs, each instance composed from constraint variables and never a raw literal — otherwise example data and boundary truth are edited independently and go out of sync
SPEC_IS_EXECUTABLE: express the requirement as a runnable test/check in the project's own test framework, with a title stating the rule in plain language and an assertion that references the example instance and constraint variable directly — otherwise the requirement is unverifiable prose that silently goes stale as the code changes under it
CHAIN_INTEGRITY: carry a constraint variable unbroken through the example's fields into the spec's title and assertion, referencing it rather than restating its value as a bare literal at any point — otherwise a mid-chain literal becomes an orphan value no constraint governs and a later boundary change misses it
OUTCOME_TITLE: name the spec's title after the rule or outcome it enforces, not the steps taken to satisfy it — otherwise the title reads as mechanics and hides which requirement it actually records
REQUIREMENT_LAYOUT: place the trio of files per area at the smallest scope that fully contains the requirement — `<area>.constraints.<ext>` for named boundary variables, `<area>.examples.<ext>` for named instances composed from them, `<area>.spec.<ext>` (or the project's existing test-suite location) for the executable tests importing both
FILE_SEPARATION: never mix roles inside one file — a constraints file holds no example data, an examples file holds no assertions, a spec file holds no raw boundary literals — otherwise a single file drifts back into an unstructured notes file and the chain breaks
REQUIREMENT_INDEX: keep a short index (one line per area: area name, one-line rule summary, links to its three files) at `requirements/INDEX.md`, separate from the files it points to — otherwise future readers must open every spec file to find the relevant requirement

# Validation

BOUNDARY_CHECK: no external import reaches past a module's public entry point into its internals
SURFACE_CHECK: the public entry re-exports nothing beyond what an external caller actually needs
TEST_CHECK: the module's test suite exercises happy path, branches, edge cases, and error paths, not just a render/smoke check
MIRROR_CHECK: each test file's path mirrors its source item's path and its name is the source item's base name plus the project's test suffix
DOC_CHECK: the module doc states why/contract/gotchas and does not restate a signature or type the code already shows
DECISION_CHECK: each recorded decision states problem, choice, basis, alternatives, and consequences
BAR_CHECK: each recorded decision clears the non-obvious + costly + recurring bar; routine choices are left out
SCOPE_CHECK: the artifact (doc, decision, or requirement trio) sits at the file matching SCOPE_MATCH; a system-level tradeoff with alternatives considered is filed as a decision, not a requirement spec
DECISION_MIRROR_CHECK: each decision record's file path mirrors the path of the module/area it governs, not sitting in one flat undifferentiated decisions folder
SUPERSEDE_CHECK: a changed decision or requirement appears as a new record/spec linking back to or marking the one it supersedes, not a silent edit of the original
INDEX_CHECK: the index entry is one line and links to detail, not the detail inlined into the index
REQUIREMENT_BAR_CHECK: each requirement clears REQUIREMENT_BAR — non-obvious, costly if forgotten, and recurring; requirements that fail are dropped or folded into a code comment instead
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
PERMANENCE_CHECK: a change deleting or weakening an existing boundary rule file links a superseding decision record; otherwise it is rejected
EMPTY_MATCH_CHECK: every boundary/requirement rule fails on zero matched files/cases instead of passing silently
COMPLEXITY_CHECK: a file above the project's size/complexity threshold is split into smaller units before its logic is edited
