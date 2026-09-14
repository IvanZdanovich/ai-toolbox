---
paths:
  - 'chrome-extension/constraints/**/*.constraints.js'
---

# Constraints

Every boundary value the project enforces, declared once and imported by the
app, the examples, the specs and the rule configs alike.

This tree sits **inside** `chrome-extension/` rather than at the repo root:
Chrome packages only that directory, so a constraint outside it would resolve
under Vitest and be missing from the shipped extension. Do not "correct" the
path (layout.adr-2).

CONSTRAINT_FILENAME: names every file `<subject>.constraints.js` in the flat `chrome-extension/constraints/` directory — `template.constraints.js`, `complexity.constraints.js` — with no sub-directories, no `index.js` barrel and no other extension — otherwise a consumer cannot tell a constraints file from an ordinary module, and the glob that feeds the lint configs stops matching.
CONSTRAINT_AS_VARIABLE: declares a boundary as a named exported constant over a prose sentence or a literal repeated at each consumer — otherwise no consumer can import the boundary and every copy drifts on its own.
CONSTRAINT_PLACEMENT: keeps one file per owning subject — `template`, `workflow`, `agent`, `history`, `storage`, `shared`, `version`, `complexity` — splitting a `limits`/`config` grab-bag by owner, and lets a consumer needing several compose them behind one aggregate re-export that declares nothing itself, as `shared/constants.js` does for `LIMITS` — otherwise a catch-all file collects unrelated boundaries and no subject owns any of them.
SINGLE_OWNER: checks whether a variable already states the same boundary and imports it over adding a second — otherwise two variables for one boundary drift and no reader can tell which is canonical.
NOT_EVERY_LITERAL: promotes a value to a constraint only when something outside its declaration must agree with it — the app and a spec, two modules, a rule and its threshold — and leaves a single-use value, or a descriptive one such as a label, a sample sentence or a colour, where it is — otherwise this tree fills with indirection nobody needed.
CONSUMERS_IMPORT_WITH_EXTENSION: every consumer reaches a constraint by a relative specifier ending in `.js` — the app as `'../constraints/storage.constraints.js'`, a spec as `'../../../chrome-extension/constraints/storage.constraints.js'`, a rule config the same — over the `@constraints` Vitest alias, which only exists under Vitest and would strand the app — otherwise the same import works in one runner and 404s in the browser.
CONSTRAINT_REACHES_ITS_CONSUMERS: confirms every consumer can import the variable at run time, the packaged app included, before declaring it, and adds a check under `reqs/cross/` asserting the copy agrees wherever one cannot — the `.json` files no ES import reaches, `package.json` and `chrome-extension/manifest.json` — otherwise an unreachable constraint leaves its copies unwatched.
CHAIN_INTEGRITY: carries the variable unbroken into the example's fields and the spec's title and assertion, referenced over restated — otherwise a literal mid-chain becomes an orphan no constraint governs and a later boundary change misses it.
FILE_SEPARATION: a constraints file holds no example data and no assertions.

## Validation

CONSTRAINT_FILENAME_CHECK: every file in the tree matches `<subject>.constraints.js`; the directory is flat and holds no barrel.
CONSTRAINT_EXPORT_CHECK: every boundary in the tree is a named export, and no file holds a prose-only limit.
CONSTRAINT_DUPLICATE_CHECK: no two variables state the same boundary.
CONSTRAINT_REACH_CHECK: each variable is importable by every consumer that must agree with it, or a `reqs/cross/` check guards the unimportable copy.
CONSTRAINT_CHAIN_CHECK: each governed boundary is referenced, not restated, in the example and the spec that use it.
