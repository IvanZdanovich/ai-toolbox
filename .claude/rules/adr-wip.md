---
paths:
  - 'reqs/adr/**/*.adr.md'
  - 'reqs/adr/**/*.wip.md'
---

# ADR entries and WIP plans

# Reasoning Principles

## What earns an entry

ADR_TREE_STARTS_EMPTY: writes the first entry into a `reqs/adr/` that currently holds no file, the earlier log having been retired once its content moved into `.claude/rules/` — so these globs match nothing until a pivot is recorded, and an empty tree is the starting state over a sign the practice lapsed — otherwise the next agent reads the gap as permission to stop logging pivots, or restores a log that was deliberately cleared.

ADR_SCOPE: records a decision only when it changes system boundaries, module responsibilities, cross-module contracts, or a cross-functional target — otherwise a choice about internal implementation detail lands in the log and buries what matters.
ADR_BAR: keeps an entry only when it clears ADR_SCOPE, is non-obvious, would cost real time or cause a defect if unknown, and would recur for the next person touching this area — otherwise the log fills with entries nobody rereads.
ADR_IS_WHY_NOT_WHAT: states the problem, the choice, and the basis for it over an implementation walkthrough, which belongs in the code and its PR — otherwise the entry ages out the moment the code it narrates changes.
ADR_ATOMIC: covers one concern and one change per entry, splitting a decision with several consequences into sibling or child entries — otherwise superseding one part disturbs unrelated decisions filed with it.
ADR_ANTI_FEATURE: rejects an entry introducing hidden coupling, implicit or non-deterministic behaviour, unjustified complexity or lock-in, or an architecture that cannot be tested, accepting complexity only when the domain requires it rather than the implementation — otherwise accidental complexity enters the system as an accepted decision.
ADR_IMMUTABLE: leaves an entry untouched once `status: accepted`, recording a later change as a new entry that marks the old one `superseded` and links it — otherwise editing in place overwrites the history of why the system looks the way it does.

## WIP plans

WIP_IS_PROVISIONAL: treats a WIP entry as current intent that may be rewritten or dropped freely, and cites only a promoted ADR entry as a settled decision — otherwise a `wip` id gets quoted as a commitment nobody made.
WIP_PROMOTION: on implementation, writes the entry into the same scope's `.adr.md` under a fresh `adr` id linking the originating `wip` id, then removes it from the WIP file — otherwise the same decision exists in two places and the copies drift.
WIP_RETIREMENT: deletes an abandoned entry and retires the file once every entry is promoted or dropped — otherwise a stale plan outlives the work and reads as pending.

# Output Shape

ADR_FILENAME: gives each subject — one module, one domain/feature, or one non-functional concern — its own directory `reqs/adr/<scope>/` holding `<scope>.adr.md` and, while intent is unbuilt, `<scope>.wip.md`, with `<scope>` kebab-case and matching the directory name (`<scope>/<scope>.adr.md`) and no other extension in the tree — otherwise a `README.md`, a `notes.md` or a second `.md` per scope splits the log and no file reads as the one to trust.
ADR_ID: numbers each entry `<scope>.adr-<n>[.<n>...]`, a child id extending its parent's to record a decision made _within_ the scope of an earlier one, assigned once and never renumbered or reused.
ADR_DAG: declares upstream dependencies and downstream consequences in `links` as fully qualified ids across all `.adr.md` files, with supersede and depend edges never cycling back — otherwise a supersede chain loops and no entry reads as current.
WIP_CITES_CONSTRAINTS: names constraint variables over restating their values, exactly as a spec would — otherwise the plan encodes literals already stale when implementation starts.

```markdown
## checkout.adr-1.1 — Short, atomic decision name

- **status:** proposed | accepted | rejected | deprecated | superseded
- **date:** YYYY-MM-DD
- **context:** problem statement · constraints · domain impact · architectural impact
- **decision:** explicit choice · alternatives considered · non-chosen alternatives and why
- **consequences:** positive outcomes · negative outcomes · risks · mitigations
- **constraints:** constraint variables this decision governs or introduces, with their `chrome-extension/constraints/<subject>.constraints.js` file
- **rules:** `reqs/rules/*.rules.js` or `*.boundary.js` files this decision adds or changes
- **spec_changes:** domain · architecture · workflows · functional · implementation
- **specs_affected:** unit · integration · e2e · cross
- **links:** parent/child ids · superseded ids · upstream/downstream, fully qualified
```

ADR_DRAFT_SHAPE: allows a `proposed` entry to carry only `status`, `date`, `context`, `decision`, `consequences` and `links`, requiring the rest before `accepted` — otherwise demanding the full shape up front stalls recording and real pivots ship unlogged, which is why this log sat empty.

# Validation

ADR_JUSTIFICATION_CHECK: the decision is explicit, the justification testable rather than a matter of taste, alternatives are listed with reasons for rejection, and consequences include risks _and_ mitigations.
ADR_SCOPE_CHECK: each entry changes a boundary, a responsibility, a cross-module contract, or a cross-functional target; implementation-detail entries are dropped.
ADR_FILENAME_CHECK: every file under `reqs/adr/` is `<scope>/<scope>.adr.md` or `<scope>/<scope>.wip.md`; no other file or extension sits in the tree.
ADR_ID_CHECK: every id is unique, never reused, and each child id extends its parent's.
ADR_DAG_CHECK: following `links` from any entry terminates; no supersede or depend chain cycles.
ADR_ACCEPTED_SHAPE_CHECK: every `accepted` entry carries all fields in the entry shape; a `proposed` one carries at least the draft set.
WIP_EXCLUSIVITY_CHECK: no entry appears in both a `.wip.md` and a `.adr.md`.
