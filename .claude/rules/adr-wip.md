---
paths:
  - 'reqs/adr/**'
---

# ADR entries and WIP plans

`reqs/adr/<scope>/<scope>.adr.md` holds the decisions for exactly one subject —
one module, one domain/feature, or one non-functional concern.
`<scope>.wip.md` beside it holds intent for what is not yet built.

ADR_SCOPE: architectural only if it changes system boundaries, module responsibilities, cross-module contracts, or a cross-functional target. A decision affecting only internal implementation detail is never an entry, or the log fills with trivia that drowns what matters.

ADR_BAR: record only what clears ADR_SCOPE, is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area.

ADR_IS_WHY_NOT_WHAT: the problem, the choice, and the basis for it — never an implementation walkthrough, which belongs in the code and its PR.

ADR_ATOMIC: one concern and one change per entry. A decision with several consequences splits into sibling or child entries.

ADR_ID: `<scope>.adr-<n>[.<n>...]`; a child id extends its parent's to record a decision made _within_ the scope of an earlier one. Ids are assigned once, never renumbered or reused.

ADR_IMMUTABLE: once `status: accepted`, an entry is never edited in place. A later change is a new entry marking the old one `superseded` and linking it.

ADR_DAG: entries form a directed acyclic graph across all `.adr.md` files; `links` declares upstream dependencies and downstream consequences as fully qualified ids, and following supersede/depend edges never cycles back.

ADR_ANTI_FEATURE: reject an entry introducing hidden coupling, implicit or non-deterministic behaviour, unjustified complexity or lock-in, or an architecture that cannot be tested. Ask whether the complexity it adds is essential to the domain or accidental to the implementation; accept only if essential.

## Entry shape

```markdown
## checkout.adr-1.1 — Short, atomic decision name

- **status:** proposed | accepted | rejected | deprecated | superseded
- **date:** YYYY-MM-DD
- **context:** problem statement · constraints · domain impact · architectural impact
- **decision:** explicit choice · alternatives considered · non-chosen alternatives and why
- **consequences:** positive outcomes · negative outcomes · risks · mitigations
- **constraints:** constraint variables this decision governs or introduces
- **rules:** rule files in `reqs/rules/` this decision adds or changes
- **spec_changes:** domain · architecture · workflows · functional · implementation
- **specs_affected:** unit · integration · e2e · cross
- **links:** parent/child ids · superseded ids · upstream/downstream, fully qualified
```

ADR_DRAFT_SHAPE: a `proposed` entry may carry only `status`, `date`, `context`, `decision`, `consequences` and `links`; the rest are required before `accepted`. The full shape up front is why this log sat empty while real pivots shipped unrecorded.

ADR_VALIDATION: the decision is explicit, the justification deterministic rather than subjective, alternatives listed with reasons for rejection, and consequences include risks _and_ mitigations.

## WIP

WIP_IS_PROVISIONAL: a WIP entry states current intent and may be rewritten or dropped freely. Only a promoted ADR entry is a settled decision — nothing outside the WIP file cites a `wip` id as one.

WIP_CITES_CONSTRAINTS: name constraint variables rather than restating their values, exactly as a spec would, or the plan encodes literals already stale when implementation starts.

WIP_PROMOTION: when implemented, write it into the same scope's `.adr.md` with a fresh `adr` id linking the originating `wip` id, then remove it from the WIP file. No entry exists in both.

WIP_RETIREMENT: delete an abandoned entry; retire the file once every entry is promoted or dropped.
