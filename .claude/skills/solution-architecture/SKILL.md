---
name: solution-architecture
description: Use when structuring a new component/module or restructuring an existing one along with its specs and docs, when making and recording a pivot-level architectural decision (an ADR entry, including how a boundary or code-writing rule should be enforced) and its motivation, when drafting or updating the vision for something not yet implemented (a WIP plan), when declaring a cross-functional/non-functional requirement that must hold across many modules, or when a conversation surfaces a business rule that should be captured as an executable constraint/example/spec requirement. Routine or low-level technical decisions are never recorded — only pivots and business rules are.
---

# Solution architecture

How the project is shaped and why. The working rules for any one part of the
tree live in `.claude/rules/*.md` and load on their own when you touch matching
files — this skill is the map and the reasoning above them.

# Reference tree

```
app
  module1/
    ...                          # module source, reachable only through its public entry point
constraints/
  module1.constraints.<ext>      # boundaries owned by one module
  checkout.constraints.<ext>     # boundaries owned by one domain/feature
  latency.constraints.<ext>      # cross-functional boundaries: budgets, limits, targets
reqs/
  unit/
    module1/
      module1.spec.<ext>         # mirrors app/module1; one real module, collaborators doubled
  integration/
    module2/
      module2.integration.spec.<ext>   # mirrors the app path of the primary module under test
  e2e/
    checkout.e2e.spec.<ext>      # flat — a user/system flow, not one module
  unit-examples/
    module1/
      module1.examples.<ext>     # named instances backing reqs/unit/module1
  integration-examples/
    module2/...                  # mirrors reqs/integration/module2
  e2e-examples/                  # flat, mirrors reqs/e2e
  cross/
    latency.cross.spec.<ext>     # one check, resolving its own targets by a stated selector
  support/
    chrome-api.mock.<ext>        # a dependency's double, shared across levels
    vitest.setup.<ext>           # runner harness: hooks, custom matchers, globals
  rules/
    module1.boundary.<ext>       # public-entry allow-list + reverse deny-rule
    naming.rules.<ext>           # the development approach, executable
    spec-titles.rules.<ext>      # the spec-title contract, executable
    complexity.rules.<ext>
  adr/
    module1/
      module1.adr.md             # module decisions: module1.adr-1, module1.adr-1.1, ...
      module1.wip.md             # vision not yet implemented: module1.wip-1.1.3, ...
    latency/
      latency.adr.md             # non-functional decisions
```

`constraints/` holds every boundary value, because the app imports from it as
well as the specs, rules and ADR entries do; `reqs/` holds everything that
verifies or justifies the app.

NESTED_APP_ROOT: where the app root is a subdirectory packaged or deployed as a unit (a browser extension, a published package, a container build context), `constraints/` goes inside that directory — the app must import it at run time — while `reqs/` stays at the repo root, since nothing in it ships. Record the placement as an ADR entry so the next reader does not "correct" it back.

# Principles

MODULE_BOUNDARY: every component/module is self-contained behind one public entry point — otherwise internal details leak and callers couple to implementation instead of contract
MINIMAL_SURFACE: the public entry re-exports only what external callers need, explicitly, never a wildcard — otherwise the public API grows unintentionally and can't shrink without breaking callers
STRUCTURE_ON_DEMAND: add an optional file (styles, constants, utils, sub-module) only once the module actually needs it — otherwise scaffolding by convention produces empty files nobody maintains
SELF_DESCRIBING: never add an index, catalogue, or table-of-contents file; the folder path, file name, and entry id must identify the content on their own, and a name too vague to find by is renamed rather than indexed — otherwise a second source of truth is maintained by hand, falls behind the files it lists, and hides what it omits
NO_PLACEHOLDER: leave a scope with nothing to record as no directory at all — never a stub, a README, or an "empty by design" note explaining the absence — otherwise the placeholder outlives the rule that justified it and reads as a record of something
SCOPE_NAMED_BY_SUBJECT: name an ADR/WIP folder, constraints file, support file, or cross-functional spec after its actual subject — the module, the domain/feature, the dependency, or the non-functional concern — never a catch-all like `system`, `helpers`, or `misc` — otherwise one dumping-ground file accumulates unrelated content and stops being findable by subject
SCOPE_MATCH: file a doc, ADR entry, WIP entry, rule, or requirement at the smallest scope that fully contains it — otherwise a local trap hides in a global file, a systemic decision hides in one module, or a granular constraint clutters an ADR entry
SPEC_WITH_MODULE: every module ships unit coverage under `reqs/unit`, and cross-module behavior under `reqs/integration` — otherwise structure changes silently drop coverage
SPEC_SUFFIX_IS_UNIFORM: every collected spec ends `.spec.<ext>` and states its level in the infix before it (bare unit, `.integration.`, `.e2e.`, `.cross.`) — otherwise two suffixes divide one tree and a reader has to learn which directory means which
COVERAGE_IS_READABLE_FROM_NAMES: a spec's file path names the module it covers and every case title repeats that name, so what is covered — and what is not — is answerable from the run output and the tree alone, without a coverage report or an index file
TITLE_IS_THE_REQUIREMENT: each case title states one rule in the domain's words, prefixed by its subject and marked `Given`/`When`/`Then` by block depth — otherwise the suite is a set of passing functions rather than a readable statement of what the system must do
EXAMPLE_IS_A_NAMED_VARIABLE: every instance a spec consumes is a named constant in `reqs/<scope>-examples/`, composed from `constraints/` and named for what it is in the domain — otherwise the case carries anonymous literals and its intent lives only in its title
CONSTRAINTS_ARE_SHARED: every boundary value lives in `constraints/`, imported by the app, the examples, the specs, and the rules, and cited by name in ADR and WIP entries — otherwise the same boundary is restated per consumer and the copies drift
CROSS_FUNCTIONAL_ONCE: declare a requirement that applies to many modules exactly once — one constraint variable and one check resolving its own targets — otherwise the copies diverge, and a module added later silently escapes the requirement
APPROACH_IS_EXECUTABLE: express the project's code-writing approach (naming, file size, complexity, allowed idioms, import direction) as static-analysis rules under `reqs/rules`, not as prose — otherwise the approach holds only while someone remembers it, and context pressure erodes compliance over a long session
BOUNDARY_ENFORCEMENT_MECHANICAL: back every module/architectural boundary with an automated rule under `reqs/rules`, not prose alone, added in the same change that records the decision — otherwise the boundary quietly regresses to whatever the code happens to do
RULE_LIVENESS: prove a rule, check, or threshold fails before recording it as enforced — introduce the violation, confirm a non-zero exit, revert — and never trust a green run as evidence a check ran — otherwise a wrong config key, a glob the shell expands differently, or a construct the rule cannot see leaves a check that is configured, passing, and inspecting nothing
RULES_IN_CI: run every rule, spec, and threshold on an automated gate for each push — a rule that runs only when a person remembers to run it is prose with extra steps
COMPLEXITY_PRECHECK: check a file's size against the project's threshold before modifying its logic, splitting it first if it exceeds that — otherwise large, tangled edits and any later automated processing of that file degrade sharply
DOC_IS_WHY_NOT_WHAT: a module's doc records why it exists, its contract, and its gotchas; it never restates a signature or logic the code already expresses
ADR_IS_WHY_NOT_WHAT: an ADR entry captures the problem, the choice, and the basis for it — not an implementation walkthrough, which belongs in the code and its PR
ADR_SCOPE: a decision is architectural only if it changes system boundaries, module responsibilities, cross-module contracts, or a cross-functional target; one affecting only internal implementation detail is never an entry — otherwise the log fills with trivia that drowns the decisions that matter
ADR_BAR: record an entry only when it clears ADR_SCOPE, is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area
WIP_IS_PROVISIONAL: a WIP entry states current intent for something not yet built and may be rewritten or dropped freely; only a promoted ADR entry is a settled decision
REQUIREMENT_BAR: capture an implementation detail as a requirement only when it encodes a business rule rather than a technical detail, is non-obvious from the resulting code, would cost real rework if forgotten, and would recur
REQUIREMENT_SOURCE: capture a requirement from a decision actually made in conversation — a stated business rule, an agreed tradeoff, a discovered edge case, a rejected alternative — never from an assumption about what "should" be true
DERIVABLE_EXCLUSION: exclude anything a future reader could recover by reading the code, specs, or types — otherwise the record duplicates the code and rots the first time either changes

# Method

## Designing a module

DISCOVER: inspect neighbouring modules for the project's existing folder shape, public-entry convention, and spec-location convention before adding a new one
ENTRY_POINT: give the module one public entry point that re-exports its public surface explicitly; keep every other file reachable only through relative/internal paths
COLOCATE_OPTIONAL: add a styles/constants/utils/sub-module file next to the entry point only once the module needs it, matching the shape of neighbouring modules
NEST_RECURSIVELY: a sub-module gets the same folder-plus-entry-point shape as its parent; keep it private unless the parent's entry point re-exports it
DOC_SCALE: give every top-level module a short doc (why it exists, its contract, its consumers, its gotchas); fold a trivial private sub-module's doc into its parent

## Recording a decision

ADR_TRIGGER: draft an entry when any of — (A) a module/boundary is created, deleted, merged, or split; (B) a contract changes (API, interface, schema, event); (C) a constraint changes (determinism, performance, reliability, security); (D) a workflow changes (state machine, orchestration); (E) a technology is chosen; (F) an anti-feature is removed (hidden coupling, implicit behavior, unnecessary complexity); (G) a cross-functional target or its exemption is set or changed
ADR_WORKFLOW: (1) detect a trigger; (2) pick the scope file by SCOPE_MATCH and allocate the next id; (3) draft the entry; (4) validate it; (5) a human accepts or rejects it; (6) apply the constraints, rules, specs and code; (7) reference the entry id from the commit that applies it

The entry shape, id scheme, immutability and DAG rules load with the ADR tree.

## Capturing a business rule

Three files, never mixed: the boundary as a named variable in `constraints/`,
a named instance composed from it under `reqs/<scope>-examples/`, and a runnable
check under `reqs/<scope>/` whose title states the rule and whose assertion
references both. The value travels that chain unbroken — a literal restated
mid-chain is an orphan a later boundary change will miss.

```javascript
// constraints/template.constraints.js   — the boundary, declared once
export const MAX_TEMPLATES = 50;

// reqs/unit-examples/shared/template.examples.js   — the instance, named
export const libraryAtTheLimit = buildLibrary(MAX_TEMPLATES);

// reqs/unit/shared/template-manager.spec.js   — the rule, runnable
describe('TemplateManager: Given a library holding MAX_TEMPLATES templates', () => {
  describe('TemplateManager: When one more template is created', () => {
    it('TemplateManager: Then it refuses the template and names the limit it hit', ...
```

Each hop refers to the one before it: the example imports the constraint, the
case imports the example, and the title says which boundary is in play. Nothing
in the chain writes `50`.

## Naming a case

Three things the title carries, in this order: the **subject** (the module or
component a failure would indict, PascalCase and dot-separated to reach a
sub-component), the **keyword** fixed by block depth (outer `describe` =
`Given` the preconditions, nested `describe` = `When` the condition, `it` =
`Then` the expected result), and the **rule** itself in the domain's words.

Titled this way, the runner's own output is the coverage report: the suite
reads top to bottom as a specification, a failing line names its owner, and
`--reporter=verbose | grep <Subject>` answers "what do we cover here" without
a coverage tool or an index file. Hold it with a lint rule under `reqs/rules`
rather than in review, and derive the expected subject from the spec's path so
no catalogue of module names has to be maintained by hand.

## Choosing a spec's level

By what stays real, not by what the file is about: one real module with
collaborators doubled is a unit spec; two or more real modules with only the
platform edge doubled is an integration spec; a flow with no primary module is
e2e; a property every module must hold is a cross-functional check.

# Validation

BOUNDARY_CHECK: no external import reaches past a module's public entry point into its internals
SURFACE_CHECK: the public entry re-exports nothing beyond what an external caller actually needs
SPEC_CHECK: the module's spec suite exercises happy path, branches, edge cases, and error paths, not just a smoke check
SPEC_SUBJECT_CHECK: each spec imports the module it is named after, and coverage for that module is non-zero; a suite that re-implements its subject inline is rewritten against the real module
SPEC_SUFFIX_CHECK: every collected spec ends `.spec.<ext>`, its level infix agrees with the directory it sits in, and the runner's file list names every spec that exists
TITLE_CHECK: every case title carries its subject and its depth's keyword, no two titles in a file are identical, and the lint rule enforcing this has been seen to fail against a violation of each
EXAMPLE_NAME_CHECK: every instance a spec consumes is a named constant in `reqs/<scope>-examples/`, named for what it is in the domain rather than for the case that first needed it
NO_INDEX_CHECK: the change adds no index, catalogue, table-of-contents, or placeholder standing in for an empty scope
NAMED_BY_SUBJECT_CHECK: every ADR/WIP folder, constraints file, rule file, support file, and cross-functional spec is named after its subject — no `system`, `common`, `shared`, `helpers`, or `misc` catch-all
SCOPE_CHECK: the artifact sits at the file matching SCOPE_MATCH; a system-level tradeoff with alternatives considered is an ADR entry, not a requirement spec
VARIABLE_CHECK: each boundary is a single named variable in `constraints/`, not a literal hardcoded in the app, an example, a spec, or a rule config
SINGLE_OWNER_CHECK: no two constraint variables state the same boundary
RULES_LOCATION_CHECK: every rule the project enforces lives under `reqs/rules`, named for what it governs; a config at a tool-mandated path is a loader holding no rules of its own
RULE_LIVENESS_CHECK: each rule and threshold has been shown to fail against a deliberate violation — the file set it matched is known, its severity is fatal, and its config key is one the tool reads
EMPTY_MATCH_CHECK: every rule, cross-functional check, and requirement fails on zero matched files/targets instead of passing silently
COMPLEXITY_CHECK: a file above the project's size threshold is split before its logic is edited
ADR_BAR_CHECK: the entry clears ADR_SCOPE, is non-obvious, costly if unknown, and recurring; routine technical choices are left out
ADR_ANTI_FEATURE_CHECK: the entry introduces no hidden coupling, implicit behavior, non-determinism, unjustified complexity or lock-in, or untestable architecture, and the complexity it adds is essential to the domain rather than accidental to the implementation
