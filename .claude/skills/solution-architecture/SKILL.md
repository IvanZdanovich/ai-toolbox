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
  support/
    chrome-api.mock.<ext>        # a dependency's double, shared across levels
    vitest.setup.<ext>           # runner harness: hooks, custom matchers, globals
    seed-fixtures.<ext>          # scripts/commands the specs or the gate invoke
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

`constraints/` sits at the repo root because the app imports from it as well as the specs, rules, and ADR entries do; `reqs/` holds everything that verifies or justifies the app — specs, examples, cross-functional checks, shared support, static-analysis rules, decisions, and plans.

NESTED_APP_ROOT: where the app root is a subdirectory that is packaged or deployed as a unit (a browser extension, a published package, a container build context), `constraints/` goes inside that directory — the app must be able to import it at run time — while `reqs/` stays at the repo root, since nothing in it ships; record the placement as an ADR entry so the next reader does not "correct" it back — otherwise the constraints tree resolves in the test runner and is missing from the artifact the user actually runs

# Domain references

This file holds what every domain shares. Load the reference for the domain being touched — its placement, naming, and validation rules live there, not here.

| Touching                                               | Load                        |
| ------------------------------------------------------ | --------------------------- |
| a unit spec or its example data                        | `references/unit.md`        |
| an integration spec or its example data                | `references/integration.md` |
| an e2e case or its example data                        | `references/e2e.md`         |
| a decision or a plan for something unbuilt             | `references/adr-wip.md`     |
| a lint, dependency-graph, or boundary rule             | `references/rules.md`       |
| a boundary value, or the constraint→example→spec chain | `references/constraints.md` |

# Principles

MODULE_BOUNDARY: every component/module is self-contained behind one public entry point — otherwise internal details leak and callers couple to implementation instead of contract
MINIMAL_SURFACE: the public entry re-exports only what external callers need, explicitly, never a wildcard — otherwise the public API grows unintentionally and can't shrink without breaking callers
STRUCTURE_ON_DEMAND: add an optional file (styles, constants, utils, sub-module) only once the module actually needs it — otherwise scaffolding by convention produces empty or near-empty files nobody maintains
SELF_DESCRIBING: never add an index, catalogue, or table-of-contents file; the folder path, file name, and entry id must identify the content on their own, and a name too vague to find by is renamed rather than indexed — otherwise a second source of truth is maintained by hand, falls behind the files it lists, and hides what it omits
NO_PLACEHOLDER: leave a scope with nothing to record as no directory at all — never a stub, a README, or an "empty by design" note explaining the absence — otherwise the placeholder outlives the rule that justified it and reads as a record of something
SCOPE_NAMED_BY_SUBJECT: name an ADR/WIP folder, constraints file, support file, or cross-functional spec after its actual subject — the module, the domain/feature, the dependency, or the non-functional concern (`checkout`, `latency`, `chrome-api`) — never a catch-all like `system`, `helpers`, or `misc` — otherwise one dumping-ground file accumulates unrelated content and stops being findable by subject
SCOPE_MATCH: file a doc, ADR entry, WIP entry, rule, or requirement at the smallest scope that fully contains it — module doc for one module, `<scope>.adr.md` for a decision about that subject, a cross-functional check for a rule spanning modules, a constraint trio for a business-rule constraint — otherwise a local trap hides in a global file, a systemic decision hides in one module, or a granular constraint clutters an ADR entry
DOC_IS_WHY_NOT_WHAT: a module's doc records why it exists, its contract, and its gotchas; it never restates a signature or logic the code already expresses — otherwise the doc duplicates the code and rots the first time either changes
SPEC_WITH_MODULE: every module ships unit coverage under `reqs/unit`, and cross-module behavior under `reqs/integration` — otherwise structure changes silently drop coverage
COMPLEXITY_PRECHECK: check a file's size/complexity against the project's threshold before modifying its logic, splitting it into smaller functions or files first if it exceeds that threshold — otherwise large, tangled edits and any later automated processing of that file degrade sharply
RULE_LIVENESS: prove a rule, cross-functional check, or threshold fails before recording it as enforced — introduce the violation it targets, confirm a non-zero exit, revert — and never trust a green run as evidence a check ran — otherwise a wrong config key, a glob the shell expands differently, or a construct the rule cannot see leaves a check that is configured, passing, and inspecting nothing
RULES_IN_CI: run every rule, spec, and threshold on an automated gate for each push — a rule that runs only when a person remembers to run it is prose with extra steps
EMPTY_RULE_GUARD: make a rule, cross-functional check, or requirement fail loud when its file pattern or target selector matches zero items, never pass silently — otherwise a path typo or a renamed module turns the check into a no-op that stays green forever

## Shared support

SUPPORT_STORAGE: store under `reqs/support` every method, script, command, harness, double, or helper that exists to serve the specs rather than to state a requirement — dependency mocks and fakes, runner setup and custom matchers, seed/reset commands, and anything resolving cross-module relations or an external dependency for more than one level — otherwise each level grows its own copy and they drift
SUPPORT_NOT_SPEC: a support file asserts nothing and owns no requirement; it holds no `it`/`test` case and no boundary literal, importing any value it needs from `constraints/` — otherwise a requirement hides where no one looks for it and the gate cannot tell coverage from scaffolding
SUPPORT_NAMED_BY_SUBJECT: name a support file after what it doubles or drives (`chrome-api.mock`, `vitest.setup`, `seed-fixtures`), never after its role alone (`helpers`, `utils`, `common`) — otherwise SCOPE_NAMED_BY_SUBJECT is lost exactly where sprawl starts
SUPPORT_ON_DEMAND: add a support file when a second consumer needs it, not in anticipation of one; a double used by exactly one spec stays beside that spec — otherwise `reqs/support` becomes the project's junk drawer

## Specs, at every level

SPEC_IMPORTS_SUBJECT: a spec must import the module it is named after and assert against that module's behavior — never against a local re-implementation, an inline copy of the logic, or a mock standing in for the subject itself (mocking the subject's _collaborators_ is fine) — otherwise the suite passes forever while the module it names is never loaded, and coverage reports it at zero
SPEC_SCENARIOS: cover happy path, every conditional branch, edge cases (empty/null/zero/undefined), error/rejection paths, and boundary values — a single passing example is not a spec suite
SPEC_ASSERTS: every case ends in at least one assertion about the subject; a case whose body only arranges state, or whose comment concedes the outcome "may vary depending on implementation", is deleted rather than left green
SPEC_IS_EXECUTABLE: express the requirement as a runnable check whose title states the rule in plain language and whose assertion references the example instance and constraint variable directly — otherwise the requirement is unverifiable prose that silently goes stale as the code changes under it
ATOMIC_UNIT: split a compound ask into one requirement per independently testable rule — otherwise a bundled spec can be half-satisfied and no one notices
OUTCOME_TITLE: name the spec's title after the rule or outcome it enforces, not the steps taken to satisfy it — otherwise the title reads as mechanics and hides which requirement it actually records
REQUIREMENT_TRACE: attach the requirement's origin (the ADR or WIP entry id, ticket, or the conversation decision that produced it) to the spec via the project's existing test-metadata mechanism — a tag, decorator, annotation object, or an adjacent comment where the framework offers nothing else — otherwise a spec outlives the reason it exists and nobody can tell whether a failure means broken code or a retired rule
EXAMPLES_MIRROR_SPECS: `reqs/unit-examples`, `reqs/integration-examples`, `reqs/e2e-examples` mirror the folder shape of their matching spec root one level up — otherwise example data drifts out of sync with the specs that consume it and nobody can tell which example backs which spec

# Method

## Component level

DISCOVER: inspect neighbouring modules for the project's existing folder shape, public-entry convention, and spec-location convention before adding a new one
ENTRY_POINT: give the module one public entry point that re-exports its public surface explicitly; keep every other file reachable only through relative/internal paths
COLOCATE_OPTIONAL: add a styles/constants/utils/sub-module file next to the entry point only once the module needs it, matching the shape of neighbouring modules
NEST_RECURSIVELY: a sub-module gets the same folder-plus-entry-point shape as its parent; keep it private unless the parent's entry point re-exports it
DOC_SCALE: give every top-level module a short doc (why it exists, its contract, its consumers, its gotchas); fold a trivial private sub-module's doc into its parent instead of duplicating a near-empty file

## Cross-functional level

CROSS_FUNCTIONAL_ONCE: declare a requirement that applies to many modules exactly once — one constraint variable and one check that resolves its own targets — never copied into each module's specs — otherwise the copies diverge, and a module added later silently escapes the requirement entirely
CROSS_DECLARE_ONCE: declare each non-functional/cross-cutting requirement as one constraint variable in `constraints/<concern>.constraints.<ext>` and one check at `reqs/cross/<concern>.spec.<ext>` — never restated inside individual module specs
CROSS_SELECTOR: have the check resolve its own targets at run time by a stated selector — a name pattern, a module/component type, a tag, a manifest field, or a directory glob — so a module added later is picked up without editing the check
CROSS_SELECTOR_EXPLICIT: state the selector in the check's title and assert it matched at least the expected minimum, failing loud on zero matches (EMPTY_RULE_GUARD)
CROSS_PER_TARGET_REPORT: report the result per resolved target, not as one aggregate pass/fail, so a failure names the offending module instead of the requirement
CROSS_EXEMPTION: record an exemption as a named entry in the concern's constraints file citing the ADR entry that granted it, never as a skip or an inline condition in the check

# Validation

BOUNDARY_CHECK: no external import reaches past a module's public entry point into its internals
SURFACE_CHECK: the public entry re-exports nothing beyond what an external caller actually needs
SPEC_CHECK: the module's spec suite exercises happy path, branches, edge cases, and error paths, not just a render/smoke check
SPEC_SUBJECT_CHECK: each spec imports the module it is named after, and coverage for that module is non-zero; a suite that re-implements its subject inline is rewritten against the real module
SPEC_ASSERT_CHECK: no case reaches its end without asserting on the subject; a case that only arranges state, or that documents an outcome it declines to pin down, is deleted
EXECUTABLE_CHECK: the spec is a runnable check that fails when the behavior it describes breaks; a prose-only description with no assertion is incomplete
ATOMIC_CHECK: each spec states one independently testable rule; a compound spec is split
TITLE_CHECK: the spec title names the rule or outcome, not the implementation steps used to meet it
TRACE_CHECK: each spec carries its source context via the project's test-metadata mechanism (tag, decorator, annotation object, or adjacent comment); a spec with no traceable origin is rejected
EXAMPLES_MIRROR_CHECK: each `reqs/<scope>-examples` entry's path mirrors the matching `reqs/<scope>` path one level up
SUPPORT_CHECK: every shared double, harness, matcher, and spec-driving script sits under `reqs/support`, named for its subject, holding no assertion and no boundary literal; nothing under `reqs/support` is counted as coverage
NO_INDEX_CHECK: the change adds no index, catalogue, or table-of-contents file; anything that was hard to find is renamed or re-filed instead
NO_PLACEHOLDER_CHECK: the change adds no stub, README, or "empty by design" note standing in for a scope with nothing to record; the directory is simply absent
NAMED_BY_SUBJECT_CHECK: every ADR/WIP folder, constraints file, rule file, support file, and cross-functional spec is named after its module, domain/feature, dependency, or non-functional concern — no `system`, `common`, `shared`, `helpers`, or `misc` catch-all
DOC_CHECK: the module doc states why/contract/gotchas and does not restate a signature or type the code already shows
SCOPE_CHECK: the artifact (doc, ADR entry, WIP entry, rule, or requirement trio) sits at the file matching SCOPE_MATCH; a system-level tradeoff with alternatives considered is filed as an ADR entry, not a requirement spec
COMPLEXITY_CHECK: a file above the project's size/complexity threshold is split into smaller units before its logic is edited
RULE_LIVENESS_CHECK: each rule, check and threshold has been shown to fail against a deliberate violation — the file set it actually matched is known, its severity is fatal, and its config key is one the tool reads; a green run is never accepted as proof it ran
RULES_IN_CI_CHECK: an automated gate runs the rules, specs and thresholds on every push; a rule invoked only by hand does not count as enforced
EMPTY_MATCH_CHECK: every rule, cross-functional check, and requirement fails on zero matched files/targets instead of passing silently
CROSS_ONCE_CHECK: each cross-functional requirement has exactly one constraint variable and one check under `reqs/cross`; no module spec restates it
CROSS_SELECTOR_CHECK: the cross-functional check resolves its targets by a stated selector (name pattern, module/component type, tag, manifest field, glob), names that selector in its title, and picks up a newly added matching module without being edited
CROSS_ZERO_CHECK: the cross-functional check fails when its selector matches zero targets
CROSS_REPORT_CHECK: a cross-functional failure names the offending target, not just the requirement
CROSS_EXEMPTION_CHECK: every exemption is a named entry in the concern's constraints file citing the ADR entry that granted it — no skip, no inline condition in the check
