---
name: solution-architecture
description: Use when structuring a new component/module or restructuring an existing one along with its specs and docs, when making and recording a pivot-level architectural decision (an ADR entry, including how a boundary or code-writing rule should be enforced) and its motivation, when drafting or updating the vision for something not yet implemented (a WIP plan), when declaring a cross-functional/non-functional requirement that must hold across many modules, or when a conversation surfaces a business rule that should be captured as an executable constraint/example/spec requirement. Routine or low-level technical decisions are never recorded — only pivots and business rules are.
---

# Reference tree

```
app
  module1/
    ...                          # module source, reachable only through its public entry point
constraints/
  module1.constraints.<ext>      # boundaries owned by one module
  checkout.constraints.<ext>     # boundaries owned by one domain/feature
  latency.constraints.<ext>      # cross-functional boundaries: budgets, limits, targets, levels
reqs/
  unit/
    module1/...                  # mirrors app/module1
  integration/
    module2/...                  # mirrors the app path of the primary module under test
  e2e/                           # flat — a user/system flow, not one module
  unit-examples/
    module1/...                  # mirrors reqs/unit/module1
  integration-examples/
    module2/...                  # mirrors reqs/integration/module2
  e2e-examples/                  # flat, mirrors reqs/e2e
  cross/
    latency.spec.<ext>           # one check, resolving its own targets by name or module type
    accessibility.spec.<ext>
  rules/
    module1.boundary.<ext>       # public-entry allow-list + reverse deny-rule for one module
    naming.rules.<ext>           # the development approach, executable: naming, size, idioms
    complexity.rules.<ext>
  adr/
    module1/
      module1.adr.md             # module decisions: module1.adr-1, module1.adr-1.1, ...
      module1.wip.md             # module vision not yet implemented: module1.wip-1.1.3, ...
    checkout/
      checkout.adr.md            # domain/feature decisions
      checkout.wip.md
    latency/
      latency.adr.md             # non-functional decisions
```

`constraints/` sits at the repo root because the app imports from it as well as the specs, rules, and ADR entries do; `reqs/` holds everything that verifies or justifies the app — specs, examples, cross-functional checks, static-analysis rules, decisions, and plans.

NESTED_APP_ROOT: where the app root is a subdirectory that is packaged or deployed as a unit (a browser extension, a published package, a container build context), `constraints/` goes inside that directory — the app must be able to import it at run time — while `reqs/` stays at the repo root, since nothing in it ships; record the placement as an ADR entry so the next reader does not "correct" it back — otherwise the constraints tree resolves in the test runner and is missing from the artifact the user actually runs

# Principles

MODULE_BOUNDARY: every component/module is self-contained behind one public entry point — otherwise internal details leak and callers couple to implementation instead of contract
MINIMAL_SURFACE: the public entry re-exports only what external callers need, explicitly, never a wildcard — otherwise the public API grows unintentionally and can't shrink without breaking callers
STRUCTURE_ON_DEMAND: add an optional file (styles, constants, utils, sub-module) only once the module actually needs it — otherwise scaffolding by convention produces empty or near-empty files nobody maintains
SELF_DESCRIBING: never add an index, catalogue, or table-of-contents file; the folder path, file name, and entry id must identify the content on their own, and a name too vague to find by is renamed rather than indexed — otherwise a second source of truth is maintained by hand, falls behind the files it lists, and hides what it omits
NO_PLACEHOLDER: leave a scope with nothing to record as no directory at all — never a stub, a README, or an "empty by design" note explaining the absence — otherwise the placeholder outlives the rule that justified it and reads as a record of something
SCOPE_NAMED_BY_SUBJECT: name an ADR/WIP folder, constraints file, or cross-functional spec after its actual subject — the module, the domain/feature, or the non-functional concern (`checkout`, `latency`, `accessibility`) — never a catch-all like `system` or `misc` — otherwise one dumping-ground file accumulates unrelated decisions and stops being findable by subject
SPEC_WITH_MODULE: every module ships unit coverage under `reqs/unit`, and cross-module behavior under `reqs/integration` — otherwise structure changes silently drop coverage
SPECS_MIRROR_APP: `reqs/unit/<path>` and `reqs/integration/<path>` mirror the app tree at `app/<path>` — same relative folder path, one spec file per source item, named with a suffix on that item's own name (e.g. `foo.ts` → `foo.test.ts`); `reqs/e2e` stays flat because an e2e case exercises a flow, not one module — otherwise a renamed or moved source file leaves its spec orphaned and undiscoverable
EXAMPLES_MIRROR_SPECS: `reqs/unit-examples`, `reqs/integration-examples`, `reqs/e2e-examples` mirror the folder shape of their matching spec root one level up — otherwise example data drifts out of sync with the specs that consume it and nobody can tell which example backs which spec
ADR_MIRRORS_SUBJECT: `reqs/adr/<scope>/` holds the decisions for exactly one subject — one module, one domain/feature, or one non-functional concern — otherwise a reader must scan every file to learn what was decided about the thing in front of them
CONSTRAINTS_ARE_SHARED: every boundary value lives in `constraints/`, imported by the app, the examples, the specs, and the static-analysis rules, and cited by name in ADR and WIP entries — otherwise the same boundary is restated per consumer and the copies drift
CROSS_FUNCTIONAL_ONCE: declare a requirement that applies to many modules exactly once — one constraint variable and one check that resolves its own targets — never copied into each module's specs — otherwise the copies diverge, and a module added later silently escapes the requirement entirely
APPROACH_IS_EXECUTABLE: express the project's code-writing approach (naming, file size, complexity, allowed idioms, import direction) as static-analysis rules under `reqs/rules`, not as prose guidance — otherwise the approach holds only while someone remembers it, and context pressure erodes agent compliance over a long session
RULE_LIVENESS: prove a rule, cross-functional check, or threshold fails before recording it as enforced — introduce the violation it targets, confirm a non-zero exit, revert — and never trust a green run as evidence a check ran — otherwise a wrong config key, a glob the shell expands differently, or a construct the rule cannot see leaves a check that is configured, passing, and inspecting nothing
RULES_IN_CI: run every rule, spec, and threshold on an automated gate for each push — a rule that runs only when a person remembers to run it is prose with extra steps
DOC_IS_WHY_NOT_WHAT: a module's doc records why it exists, its contract, and its gotchas; it never restates a signature or logic the code already expresses — otherwise the doc duplicates the code and rots the first time either changes
ADR_IS_WHY_NOT_WHAT: an ADR entry captures the problem, the choice, and the basis/motivation for it — not an implementation walkthrough, which belongs in the code and its PR
ADR_SCOPE: a decision is architectural only if it changes system boundaries, module responsibilities, cross-module contracts, or a cross-functional target (module creation/deletion/merge/split, interface definitions, technology selection, cross-cutting concerns, performance/scalability/determinism constraints, workflow orchestration, domain invariants with architectural impact); a decision affecting only internal implementation detail is never an ADR entry — otherwise the log fills with technical trivia that drowns the decisions that actually matter
ADR_ATOMIC: one ADR entry records one concern and one change; a decision with multiple consequences is split into multiple sibling or child entries, never bundled into one — otherwise rollback, dependency graphs, and AI-safe reasoning over the log all break down
ADR_BAR: record an ADR entry only when it clears ADR_SCOPE, is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area — otherwise the log fills with routine choices nobody needs to look up
WIP_IS_PROVISIONAL: a WIP entry states current intent for something not yet built and may be rewritten or dropped freely; only a promoted ADR entry is a settled decision — otherwise a plan gets cited as a commitment and the log loses the line between intent and record
SCOPE_MATCH: file a doc, ADR entry, WIP entry, rule, or requirement at the smallest scope that fully contains it — module doc for one module, `<scope>.adr.md` for a decision about that subject, a cross-functional check for a rule spanning modules, a constraint trio for a business-rule constraint — otherwise a local trap hides in a global file, a systemic decision hides in one module, or a granular constraint clutters an ADR entry
REQUIREMENT_BAR: capture an implementation-level detail as a requirement only when it clears ADR_SCOPE's spirit (it encodes a business rule, not a technical implementation detail), is non-obvious from reading the resulting code, would cost real rework or a defect if forgotten, and would recur for the next person touching this area — otherwise routine implementation chatter piles up as noise nobody reads
REQUIREMENT_SOURCE: capture a requirement from a decision actually made in conversation — a stated business rule, an agreed tradeoff, a discovered domain edge case, a rejected alternative — never from an assumption about what "should" be true — otherwise the log records guesses instead of ground truth
EPHEMERAL_EXCLUSION: exclude task-local detail that dies with the task (a variable name picked this session, a temporary workaround, a one-off data fix) in favor of anything reusable beyond the current change — otherwise the requirements log fills with scratch notes
DERIVABLE_EXCLUSION: exclude anything a future reader could recover by reading the code, specs, or types — otherwise the log duplicates the code and rots the first time either changes
ATOMIC_UNIT: split a compound ask into one requirement per independently testable rule — otherwise a bundled spec can be half-satisfied and no one notices
SINGLE_OWNER: check `constraints/` for an existing variable stating the same boundary before adding a new one, and import it instead of redeclaring it — otherwise two variables drift apart and no reader knows which is canonical
BOUNDARY_ENFORCEMENT_MECHANICAL: back every module/architectural boundary with an automated lint or dependency-graph rule under `reqs/rules` (e.g. dependency-cruiser, ArchUnitTS), not prose alone, added or updated in the same change that records the decision — otherwise the boundary quietly regresses to whatever the code happens to do
ENFORCE_EVERY_FORM: a rule must cover every syntactic form of the thing it blocks — static and dynamic import, require and import(), re-export and direct export, decorator and call — and the form it cannot see is named in the decision as a known gap — otherwise callers migrate to the uncovered form and the rule reports clean
REVERSE_BOUNDARY: pair a module's public-entry allow-list with a reverse deny-rule blocking external files from importing anything but that entry point — otherwise an external consumer reaches past the public API unnoticed
BOUNDARY_ROLLOUT: land a new enforcement rule scoped to one directory or module at a time, expanding to siblings only after the first is green — otherwise a codebase-wide enforcement change stalls in merge conflicts across every team touching the tree
BOUNDARY_PERMANENCE: block any change that deletes or weakens an existing rule file under `reqs/rules` unless it links a superseding ADR entry — otherwise deadline pressure quietly strips guardrails to get code merged
EMPTY_RULE_GUARD: make a rule, cross-functional check, or requirement fail loud when its file pattern or target selector matches zero items, never pass silently — otherwise a path typo or a renamed module turns the check into a no-op that stays green forever
COMPLEXITY_PRECHECK: check a file's size/complexity against the project's threshold before modifying its logic, splitting it into smaller functions or files first if it exceeds that threshold — otherwise large, tangled edits and any later automated processing of that file degrade sharply
ADR_ANTI_FEATURE: reject an ADR entry that introduces hidden coupling, implicit behavior, non-deterministic behavior, unnecessary complexity, technology lock-in without justification, or an architecture that cannot be tested or validated by AI — otherwise the log legitimizes exactly the decisions it exists to keep out
ADR_ESSENTIAL_COMPLEXITY: before acceptance, ask whether the complexity the decision introduces is essential to the domain or accidental to the implementation — accept only if essential — otherwise architecture drifts away from lean and deterministic

# Method

## Component level

DISCOVER: inspect neighbouring modules for the project's existing folder shape, public-entry convention, and spec-location convention before adding a new one
ENTRY_POINT: give the module one public entry point that re-exports its public surface explicitly; keep every other file reachable only through relative/internal paths
COLOCATE_OPTIONAL: add a styles/constants/utils/sub-module file next to the entry point only once the module needs it, matching the shape of neighbouring modules
NEST_RECURSIVELY: a sub-module gets the same folder-plus-entry-point shape as its parent; keep it private unless the parent's entry point re-exports it
SPEC_IMPORTS_SUBJECT: a spec must import the module it is named after and assert against that module's behavior — never against a local re-implementation, an inline copy of the logic, or a mock standing in for the subject itself (mocking the subject's _collaborators_ is fine) — otherwise the suite passes forever while the module it names is never loaded, and coverage reports it at zero
SPEC_SCENARIOS: cover happy path, every conditional branch, edge cases (empty/null/zero/undefined), error/rejection paths, and boundary values — a single passing example is not a spec suite
SPEC_ASSERTS: every case ends in at least one assertion about the subject; a case whose body only arranges state, or whose comment concedes the outcome "may vary depending on implementation", is deleted rather than left green
MIRROR_PLACEMENT: place a unit spec at `reqs/unit/<app-relative-path>` and an integration spec at `reqs/integration/<app-relative-path-of-primary-module>`, each named `<sourceBaseName><projectTestSuffix>`; place an e2e case flat under `reqs/e2e` — never in an ad hoc folder
DOC_SCALE: give every top-level module a short doc (why it exists, its contract, its consumers, its gotchas); fold a trivial private sub-module's doc into its parent instead of duplicating a near-empty file

## Rules level

RULES_STORAGE: store every static-analysis and dependency-graph rule under `reqs/rules`, named after what it governs — `<module>.boundary.<ext>` for one module's allow-list and reverse deny-rule, `<concern>.rules.<ext>` for a code-writing rule that spans the codebase
RULES_FROM_CONSTRAINTS: read thresholds and enumerations a rule enforces (max file size, allowed layers, permitted import roots) from `constraints/`, never as literals inside the rule config
RULES_NOT_PROSE: when the conversation settles a code-writing convention, add or extend the matching rule file in the same change rather than writing the convention into a doc — a convention with no rule file is not part of the approach
RULES_FAIL_LOUD: configure each rule to error, not warn, and to fail when its pattern matches zero files
RULES_ROLLOUT: land a new rule scoped to one directory or module, expand to siblings once green, and record the eventual codebase-wide scope as an ADR entry

## Cross-functional level

CROSS_DECLARE_ONCE: declare each non-functional/cross-cutting requirement as one constraint variable in `constraints/<concern>.constraints.<ext>` and one check at `reqs/cross/<concern>.spec.<ext>` — never restated inside individual module specs
CROSS_SELECTOR: have the check resolve its own targets at run time by a stated selector — a name pattern, a module/component type, a tag, a manifest field, or a directory glob — so a module added later is picked up without editing the check
CROSS_SELECTOR_EXPLICIT: state the selector in the check's title and assert it matched at least the expected minimum, failing loud on zero matches (EMPTY_RULE_GUARD)
CROSS_PER_TARGET_REPORT: report the result per resolved target, not as one aggregate pass/fail, so a failure names the offending module instead of the requirement
CROSS_EXEMPTION: record an exemption as a named entry in the concern's constraints file citing the ADR entry that granted it, never as a skip or an inline condition in the check

## ADR level

ADR_TRIGGER: draft an ADR entry when any of — (A) a module/boundary is created, deleted, merged, or split (service, domain aggregate, repository, adapter); (B) a contract changes (API, interface, schema, event); (C) a constraint changes (determinism, performance SLA, reliability target, security requirement); (D) a workflow changes (new workflow, state machine, orchestration logic); (E) a technology is chosen (framework, library, protocol, storage engine); (F) an anti-feature is removed (unnecessary complexity, implicit behavior, hidden coupling); (G) a cross-functional target or its exemption is set or changed
ADR_STORAGE: store decisions about one subject in one markdown file at `reqs/adr/<scope>/<scope>.adr.md`, where `<scope>` is a module, a domain/feature, or a non-functional concern named by SCOPE_NAMED_BY_SUBJECT; no inline diagrams (store diagrams separately and link them)
ADR_ID: give every entry a hierarchical id `<scope>.adr-<n>[.<n>...]` — a child id extends its parent's (`checkout.adr-1` → `checkout.adr-1.1` → `checkout.adr-1.1.2`) to record a decision made _within_ the scope of an earlier one; ids are assigned once and never renumbered or reused
ADR_ENTRY_STRUCTURE: write every entry to this shape — every field present, none omitted; a list field is empty only where it genuinely has no entries, and `status`, `date`, `context`, `decision`, `consequences` are never empty —

```markdown
## checkout.adr-1.1 — Short, atomic decision name

- **status:** proposed | accepted | rejected | deprecated | superseded
- **date:** YYYY-MM-DD
- **context:** problem statement · constraints · domain impact · architectural impact
- **decision:** explicit choice · alternatives considered · non-chosen alternatives and why
- **consequences:** positive outcomes · negative outcomes · risks · mitigations
- **constraints:** constraint variables in `constraints/` this decision governs or introduces
- **rules:** rule files in `reqs/rules` this decision adds or changes
- **spec_changes:** domain · architecture · workflows · functional · implementation specs affected
- **specs_affected:** unit · integration · e2e · cross · mutation · contract
- **links:** parent/child entry ids · superseded ids · upstream/downstream dependencies, each fully qualified (`latency.adr-3.1`)
```

ADR_DRAFT_SHAPE: a `proposed` entry may carry only `status`, `date`, `context`, `decision`, `consequences` and `links`; the remaining fields are required before it reaches `accepted` — otherwise the full ten-field shape becomes the reason no entry is ever written and the log stays empty while real pivots ship unrecorded
ADR_IMMUTABLE: an entry is immutable once `status: accepted` — a later change is a new entry that marks the old one `superseded` and links it, never an edit in place; only a non-accepted entry may be revised
ADR_DAG: entries form a directed acyclic graph across all `.adr.md` files — an entry may depend on or supersede earlier entries but must never create a cycle, and must declare both upstream dependencies and downstream consequences in `links`
ADR_WORKFLOW: (1) detect a trigger from ADR_TRIGGER; (2) pick the scope file by SCOPE_MATCH and allocate the next id by ADR_ID; (3) draft the entry against ADR_ENTRY_STRUCTURE; (4) validate it against every `ADR_*_CHECK` in Validation below; (5) a human or governance agent accepts or rejects it; (6) apply the `constraints`, `rules`, `spec_changes`, and code; (7) reference the entry id from the commit(s) that apply it

## WIP level

WIP_PURPOSE: record the current vision for something planned but not yet implemented — intended boundaries and responsibilities, the constraints it must honour, and the decisions already taken — so the plan is reviewable before any code exists
WIP_STORAGE: store the plan alongside that subject's decisions at `reqs/adr/<scope>/<scope>.wip.md`, using the same entry shape and hierarchical ids with the `wip` marker (`checkout.wip-1.1.3`)
WIP_CITES_CONSTRAINTS: reference constraint variables from `constraints/` by name in a WIP entry rather than restating their values, exactly as a spec would — otherwise the plan encodes literals that are already stale when implementation starts
WIP_PROMOTION: when a WIP entry is implemented, write it into the same scope's `.adr.md` as a new entry with a fresh `adr` id linking the originating `wip` id, then remove it from the WIP file — a WIP entry is never cited as a settled decision and never left behind as a duplicate of the ADR entry
WIP_RETIREMENT: delete a WIP entry whose plan was abandoned, and retire the WIP file once every entry is promoted or dropped — otherwise a stale plan reads as current intent

## Requirement level

CONSTRAINT_AS_VARIABLE: declare each boundary value, format, or enum once as a named variable/constant in `constraints/`, never as a prose sentence — otherwise the boundary has no single machine-checkable source and drifts from whatever code enforces it
CONSTRAINT_PLACEMENT: put a boundary in the constraints file named for its owner — `<module>.constraints.<ext>`, `<domain>.constraints.<ext>`, or `<concern>.constraints.<ext>` — importing rather than redeclaring across the line
EXAMPLE_OWN_FILE: place named example data instances under `reqs/<scope>-examples/<mirrored-path>/<area>.examples.<ext>` (scope = unit/integration/e2e), each instance composed from constraint variables and never a raw literal — otherwise example data and boundary truth are edited independently and go out of sync
SPEC_IS_EXECUTABLE: express the requirement as a runnable check under `reqs/<scope>/<mirrored-path>/<area>.spec.<ext>`, with a title stating the rule in plain language and an assertion that references the example instance and constraint variable directly — otherwise the requirement is unverifiable prose that silently goes stale as the code changes under it
CHAIN_INTEGRITY: carry a constraint variable unbroken through the example's fields into the spec's title and assertion, referencing it rather than restating its value as a bare literal at any point — otherwise a mid-chain literal becomes an orphan value no constraint governs and a later boundary change misses it
REQUIREMENT_TRACE: attach the requirement's origin (the ADR or WIP entry id, ticket, or the conversation decision that produced it) to the spec via the project's existing test-metadata mechanism — a tag, decorator, annotation object, or an adjacent comment where the framework offers nothing else — otherwise a spec outlives the reason it exists and nobody can tell whether a failure means broken code or a retired rule
OUTCOME_TITLE: name the spec's title after the rule or outcome it enforces, not the steps taken to satisfy it — otherwise the title reads as mechanics and hides which requirement it actually records
REQUIREMENT_LAYOUT: place the trio of files for one area at the smallest scope that fully contains the requirement — `constraints/<owner>.constraints.<ext>`, `reqs/<scope>-examples/<mirrored-path>/<area>.examples.<ext>`, `reqs/<scope>/<mirrored-path>/<area>.spec.<ext>`
FILE_SEPARATION: never mix roles inside one file — a constraints file holds no example data, an examples file holds no assertions, a spec file holds no raw boundary literals — otherwise a single file drifts back into an unstructured notes file and the chain breaks
STAY_LEAN: fold a requirement that no longer applies into routine convention or retire it

# Validation

BOUNDARY_CHECK: no external import reaches past a module's public entry point into its internals
SURFACE_CHECK: the public entry re-exports nothing beyond what an external caller actually needs
SPEC_CHECK: the module's spec suite exercises happy path, branches, edge cases, and error paths, not just a render/smoke check
SPEC_SUBJECT_CHECK: each spec imports the module it is named after, and coverage for that module is non-zero; a suite that re-implements its subject inline is rewritten against the real module
SPEC_ASSERT_CHECK: no case reaches its end without asserting on the subject; a case that only arranges state, or that documents an outcome it declines to pin down, is deleted
NO_PLACEHOLDER_CHECK: the change adds no stub, README, or "empty by design" note standing in for a scope with nothing to record; the directory is simply absent
MIRROR_CHECK: each unit/integration spec file's path mirrors its source item's app path under `reqs/unit`/`reqs/integration` respectively, its name is the source item's base name plus the project's test suffix, and `reqs/e2e` cases stay flat
EXAMPLES_MIRROR_CHECK: each `reqs/<scope>-examples` entry's path mirrors the matching `reqs/<scope>` path one level up
NO_INDEX_CHECK: the change adds no index, catalogue, or table-of-contents file; anything that was hard to find is renamed or re-filed instead
NAMED_BY_SUBJECT_CHECK: every ADR/WIP folder, constraints file, rule file, and cross-functional spec is named after its module, domain/feature, or non-functional concern — no `system`, `common`, `shared`, or `misc` catch-all
DOC_CHECK: the module doc states why/contract/gotchas and does not restate a signature or type the code already shows
RULES_LOCATION_CHECK: every static-analysis, lint, and dependency-graph rule the project enforces lives under `reqs/rules`, named for what it governs
RULES_SOURCE_CHECK: a rule's thresholds and enumerations import from `constraints/` rather than hardcoding literals in the rule config
RULES_SEVERITY_CHECK: each rule errors rather than warns, and fails when its pattern matches zero files
RULE_LIVENESS_CHECK: each rule, check and threshold has been shown to fail against a deliberate violation — the file set it actually matched is known, its severity is fatal, and its config key is one the tool reads; a green run is never accepted as proof it ran
RULES_IN_CI_CHECK: an automated gate runs the rules, specs and thresholds on every push; a rule invoked only by hand does not count as enforced
GLOB_EXPANSION_CHECK: a rule invoked through a shell or package script quotes its globs so the tool expands them, not the shell — an unquoted `**` silently narrows the file set under `sh`
THRESHOLD_DEFAULTS_CHECK: overriding a tool's include/exclude or threshold config replaces its defaults rather than extending them — the resulting file set is verified, not assumed
APPROACH_CHECK: a code-writing convention agreed in conversation appears as a rule file under `reqs/rules`, not only as prose in a doc
CROSS_ONCE_CHECK: each cross-functional requirement has exactly one constraint variable and one check under `reqs/cross`; no module spec restates it
CROSS_SELECTOR_CHECK: the cross-functional check resolves its targets by a stated selector (name pattern, module/component type, tag, manifest field, glob), names that selector in its title, and picks up a newly added matching module without being edited
CROSS_ZERO_CHECK: the cross-functional check fails when its selector matches zero targets
CROSS_REPORT_CHECK: a cross-functional failure names the offending target, not just the requirement
CROSS_EXEMPTION_CHECK: every exemption is a named entry in the concern's constraints file citing the ADR entry that granted it — no skip, no inline condition in the check
ADR_LOCATION_CHECK: the entry lives in `reqs/adr/<scope>/<scope>.adr.md` for the subject it concerns; no ADR file sits outside `reqs/adr`
ADR_ID_CHECK: each entry id is `<scope>.adr-<n>[.<n>...]`, matches its file's scope, is unique across the repo, extends its parent's id where it records a sub-decision, and is never a renumbering of an existing id
ADR_SCOPE_CHECK: the entry changes a system boundary, module responsibility, cross-module contract, or cross-functional target — not only an internal implementation detail
ADR_ATOMIC_CHECK: the entry records exactly one concern; a multi-consequence decision is split into sibling or child entries
ADR_BAR_CHECK: the entry clears ADR_SCOPE, is non-obvious, costly if unknown, and recurring; routine technical choices are left out
ADR_STRUCTURE_CHECK: an accepted entry carries every field from ADR_ENTRY_STRUCTURE — none omitted; a proposed entry carries at least the ADR_DRAFT_SHAPE fields; `status`, `date`, `context`, `decision` and `consequences` hold real content, and a list field is empty only where it genuinely has no entries
ADR_VALIDATION_CHECK: the decision is explicit (not implied), the justification is deterministic (not subjective), alternatives are listed with reasons for rejection, consequences include risks and mitigations, `constraints`, `rules`, `spec_changes` and `specs_affected` are enumerated, and the entry traces to a use case or domain invariant
ADR_DAG_CHECK: the entry's `links` declare upstream dependencies and downstream consequences as fully qualified ids, and following supersede/depend edges across `reqs/adr` never cycles back to this entry
ADR_IMMUTABLE_CHECK: no `status: accepted` entry is edited in place; a change appears as a new entry marking `superseded` on the old one and linking it
ADR_ANTI_FEATURE_CHECK: the entry introduces no hidden coupling, implicit behavior, non-determinism, unjustified complexity, unjustified lock-in, or untestable/unvalidatable architecture
ADR_ESSENTIAL_COMPLEXITY_CHECK: the complexity the entry introduces is essential to the domain, not accidental to the implementation; an accidental-complexity entry is rejected
WIP_LOCATION_CHECK: every plan entry lives at `reqs/adr/<scope>/<scope>.wip.md` with a `<scope>.wip-<n>[.<n>...]` id, and carries the ADR_ENTRY_STRUCTURE fields
WIP_PROMOTION_CHECK: no implemented plan remains a WIP entry — it appears as an ADR entry linking its `wip` id, and the WIP entry is gone; no entry exists in both files
WIP_CITATION_CHECK: nothing outside the WIP file cites a `wip` id as a settled decision, and no WIP entry restates a constraint value instead of naming its variable
SCOPE_CHECK: the artifact (doc, ADR entry, WIP entry, rule, or requirement trio) sits at the file matching SCOPE_MATCH; a system-level tradeoff with alternatives considered is filed as an ADR entry, not a requirement spec
REQUIREMENT_BAR_CHECK: each requirement clears REQUIREMENT_BAR — a business rule (not a technical detail), non-obvious, costly if forgotten, and recurring; requirements that fail are dropped or folded into a code comment instead
VARIABLE_CHECK: each constraint is a single named variable in `constraints/`, not a literal hardcoded in the app, an example, a spec, or a rule config
CONSTRAINT_PLACEMENT_CHECK: a boundary sits in the constraints file named for its owning module, domain, or concern; none redeclares another's value
FILE_SEPARATION_CHECK: constraints, examples, and specs live in three separate files; none mixes another's role
EXECUTABLE_CHECK: the spec is a runnable check that fails when the behavior it describes breaks; a prose-only description with no assertion is incomplete
ATOMIC_CHECK: each spec states one independently testable rule; a compound spec is split
CHAIN_CHECK: every value asserted in a spec traces constraint variable → example field → spec assertion unbroken; a literal that could trace to a constraint but doesn't is extracted into `constraints/` instead of left as an orphan
TRACE_CHECK: each spec carries its source context via the project's test-metadata mechanism (tag, decorator, annotation object, or adjacent comment); a spec with no traceable origin is rejected
SINGLE_OWNER_CHECK: no two constraint variables state the same boundary; a duplicate is merged into the existing variable and imports replace the copy
TITLE_CHECK: the spec title names the rule or outcome, not the implementation steps used to meet it
BOUNDARY_ENFORCEMENT_CHECK: a recorded boundary decision has a matching rule file under `reqs/rules`, not prose alone
REVERSE_CHECK: each module's public-entry allow-list has a matching reverse rule blocking external files from importing its internals directly
ROLLOUT_CHECK: a new enforcement rule targets one directory/module rather than a codebase-wide sweep, unless it has already proven green elsewhere
PERMANENCE_CHECK: a change deleting or weakening an existing rule file links a superseding ADR entry; otherwise it is rejected
EMPTY_MATCH_CHECK: every rule, cross-functional check, and requirement fails on zero matched files/targets instead of passing silently
COMPLEXITY_CHECK: a file above the project's size/complexity threshold is split into smaller units before its logic is edited
