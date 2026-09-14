# ADR entries and WIP plans

Load with `SKILL.md` for SCOPE_MATCH, SCOPE_NAMED_BY_SUBJECT and
DOC_IS_WHY_NOT_WHAT. This file holds the decision log and the plans that feed
it.

# Principles

ADR_MIRRORS_SUBJECT: `reqs/adr/<scope>/` holds the decisions for exactly one subject — one module, one domain/feature, or one non-functional concern — otherwise a reader must scan every file to learn what was decided about the thing in front of them
ADR_IS_WHY_NOT_WHAT: an ADR entry captures the problem, the choice, and the basis/motivation for it — not an implementation walkthrough, which belongs in the code and its PR
ADR_SCOPE: a decision is architectural only if it changes system boundaries, module responsibilities, cross-module contracts, or a cross-functional target (module creation/deletion/merge/split, interface definitions, technology selection, cross-cutting concerns, performance/scalability/determinism constraints, workflow orchestration, domain invariants with architectural impact); a decision affecting only internal implementation detail is never an ADR entry — otherwise the log fills with technical trivia that drowns the decisions that actually matter
ADR_ATOMIC: one ADR entry records one concern and one change; a decision with multiple consequences is split into multiple sibling or child entries, never bundled into one — otherwise rollback, dependency graphs, and AI-safe reasoning over the log all break down
ADR_BAR: record an ADR entry only when it clears ADR_SCOPE, is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area — otherwise the log fills with routine choices nobody needs to look up
ADR_ANTI_FEATURE: reject an ADR entry that introduces hidden coupling, implicit behavior, non-deterministic behavior, unnecessary complexity, technology lock-in without justification, or an architecture that cannot be tested or validated by AI — otherwise the log legitimizes exactly the decisions it exists to keep out
ADR_ESSENTIAL_COMPLEXITY: before acceptance, ask whether the complexity the decision introduces is essential to the domain or accidental to the implementation — accept only if essential — otherwise architecture drifts away from lean and deterministic
WIP_IS_PROVISIONAL: a WIP entry states current intent for something not yet built and may be rewritten or dropped freely; only a promoted ADR entry is a settled decision — otherwise a plan gets cited as a commitment and the log loses the line between intent and record

# Method

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
ADR_WORKFLOW: (1) detect a trigger from ADR_TRIGGER; (2) pick the scope file by SCOPE_MATCH and allocate the next id by ADR_ID; (3) draft the entry against ADR_ENTRY_STRUCTURE; (4) validate it against every `ADR_*_CHECK` below; (5) a human or governance agent accepts or rejects it; (6) apply the `constraints`, `rules`, `spec_changes`, and code; (7) reference the entry id from the commit(s) that apply it

## WIP level

WIP_PURPOSE: record the current vision for something planned but not yet implemented — intended boundaries and responsibilities, the constraints it must honour, and the decisions already taken — so the plan is reviewable before any code exists
WIP_STORAGE: store the plan alongside that subject's decisions at `reqs/adr/<scope>/<scope>.wip.md`, using the same entry shape and hierarchical ids with the `wip` marker (`checkout.wip-1.1.3`)
WIP_CITES_CONSTRAINTS: reference constraint variables from `constraints/` by name in a WIP entry rather than restating their values, exactly as a spec would — otherwise the plan encodes literals that are already stale when implementation starts
WIP_PROMOTION: when a WIP entry is implemented, write it into the same scope's `.adr.md` as a new entry with a fresh `adr` id linking the originating `wip` id, then remove it from the WIP file — a WIP entry is never cited as a settled decision and never left behind as a duplicate of the ADR entry
WIP_RETIREMENT: delete a WIP entry whose plan was abandoned, and retire the WIP file once every entry is promoted or dropped — otherwise a stale plan reads as current intent

# Validation

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
