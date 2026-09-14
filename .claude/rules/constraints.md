---
paths:
  - 'chrome-extension/constraints/**'
---

# Constraints

Every boundary value the project enforces, declared once and imported by the
app, the examples, the specs and the rule configs alike.

This tree sits **inside** `chrome-extension/` rather than at the repo root:
Chrome packages only that directory, so a constraint outside it would resolve
under Vitest and be missing from the shipped extension. Do not "correct" the
path (layout.adr-2).

CONSTRAINT_AS_VARIABLE: a named exported constant, never a prose sentence and never a literal repeated at each consumer.

CONSTRAINT_PLACEMENT: one file per owning subject — `template`, `workflow`, `agent`, `history`, `storage`, `shared`, `version`, `complexity`. A `limits`/`config` grab-bag is split by owner; a consumer needing several composes them behind one aggregate re-export that declares nothing itself (`shared/constants.js` does this for `LIMITS`).

SINGLE_OWNER: before adding a variable, check whether one already states the same boundary and import it instead. Two variables for one boundary drift, and no reader can tell which is canonical.

NOT_EVERY_LITERAL: a value is a constraint when something outside its declaration must agree with it — the app and a spec, two modules, a rule and its threshold. A value used in exactly one place, or one that is descriptive rather than bounding (a label, a sample sentence, a colour), stays where it is. Otherwise this tree fills with indirection nobody needed.

CONSTRAINT_REACHES_ITS_CONSUMERS: before declaring one, confirm every consumer can import it at run time — the packaged app included. Where one cannot (`package.json`, `manifest.json`), add a check under `reqs/cross/` asserting the copy agrees, rather than leaving the copies unwatched.

CHAIN_INTEGRITY: the variable travels unbroken into the example's fields and the spec's title and assertion, referenced rather than restated. A literal mid-chain becomes an orphan no constraint governs, and a later boundary change misses it.

FILE_SEPARATION: a constraints file holds no example data and no assertions.
