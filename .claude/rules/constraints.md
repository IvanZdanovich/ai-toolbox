---
paths:
  - 'chrome-extension/constraints/**/*.constraints.js'
---

# Constraints

# Reasoning Principles

CONSTRAINT_TREE_IS_INSIDE_THE_EXTENSION: keeps this tree under `chrome-extension/` over the repo root, since Chrome packages only that directory and a constraint outside it resolves under Vitest while missing from the shipped extension — do not "correct" the path to the repo root, which is a settled decision and not an oversight — otherwise the app imports a file that is not in the package and the extension fails to load.
CONSTRAINT_AS_VARIABLE: declares a boundary as a named exported constant over a prose sentence or a literal repeated at each consumer — otherwise no consumer can import the boundary and every copy drifts on its own.
NOT_EVERY_LITERAL: promotes a value here only when something outside its declaration must agree with it — the app and a spec, two modules, a rule and its threshold — leaving a single-use value, or a descriptive one such as a label, a sample sentence or a colour, where it is — otherwise this tree fills with indirection nobody needed.
SINGLE_OWNER: imports an existing variable that already states the boundary over adding a second — otherwise two variables for one boundary drift and no reader can tell which is the real one.
CONSTRAINT_REACHES_ITS_CONSUMERS: confirms every consumer can import the variable at run time, the packaged app included, before declaring it, and guards with a `reqs/cross/` check any copy that cannot — the `.json` files no ES import reaches, `package.json` and `chrome-extension/manifest.json` — otherwise an unreachable constraint leaves its copies unwatched.
CHAIN_INTEGRITY: carries the variable constraint → example field → spec title and assertion, referenced at each hop over restated — otherwise a literal mid-chain is an orphan no constraint governs, and a later boundary change misses it.

# Output Shape

CONSTRAINT_FILENAME: names every file `<subject>.constraints.js` in the flat `chrome-extension/constraints/` directory — `template.constraints.js`, `complexity.constraints.js` — with no sub-directories, no `index.js` barrel and no other extension — otherwise a consumer cannot tell a constraints file from an ordinary module, and the glob that feeds the lint configs stops matching.
CONSTRAINT_PLACEMENT: keeps one file per owning subject — `template`, `workflow`, `agent`, `history`, `storage`, `shared`, `version`, `complexity` — splitting a `limits`/`config` grab-bag by owner, and lets a consumer needing several compose them behind one aggregate re-export that declares nothing itself, as `shared/constants.js` does for `LIMITS` — otherwise a catch-all file collects unrelated boundaries and no subject owns any of them.
CONSUMERS_IMPORT_WITH_EXTENSION: reaches a constraint from outside the extension — a spec as `'../../../chrome-extension/constraints/storage.constraints.js'`, a rule config the same — by a relative specifier ending in `.js`, over the `@constraints` Vitest alias — otherwise the constraint resolves for the runner that declares the alias and 404s everywhere else.
FILE_SEPARATION: keeps example data and assertions out of a constraints file — otherwise the app imports fixtures at run time and a boundary change drags spec data with it.

# Validation

CONSTRAINT_FILENAME_CHECK: every file in the tree matches `<subject>.constraints.js`; the directory is flat and holds no barrel.
CONSTRAINT_EXPORT_CHECK: every boundary in the tree is a named export, and no file holds a prose-only limit.
CONSTRAINT_DUPLICATE_CHECK: no two variables state the same boundary.
CONSTRAINT_REACH_CHECK: each variable is importable by every consumer that must agree with it, or a `reqs/cross/` check guards the unimportable copy.
CONSTRAINT_CHAIN_CHECK: each governed boundary is referenced, not restated, in the example and the spec that use it.
