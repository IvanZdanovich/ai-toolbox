---
paths:
  - 'chrome-extension/**'
---

# Working in the extension

`chrome-extension/` is what Chrome loads as the unpacked extension. Anything
the app imports at run time must live inside it — that is why
`chrome-extension/constraints/` sits here rather than at the repo root
(layout.adr-2). Plain ES modules, no build step, no framework.

SHARED_IS_CLOSED: `background/`, `sidepanel/`, `settings/` and `content/` import from `shared/index.js` and `shared/components/index.js` only — never from a file inside `shared/`. Both static and dynamic imports are blocked by `reqs/rules/shared.boundary.js`. A consumer needing an internal export widens `shared/index.js`, which is a visible diff rather than a quiet import.

MINIMAL_SURFACE: the public entry re-exports only what an external caller needs, explicitly — never a wildcard, or the API grows unintentionally and cannot shrink without breaking callers.

ENTRY_POINT: a new module gets one public entry point re-exporting its surface explicitly; every other file is reachable only through relative internal paths. A sub-module takes the same shape and stays private unless the parent re-exports it.

STRUCTURE_ON_DEMAND: add a styles/constants/utils file only once the module needs it, matching neighbouring modules. Scaffolding by convention produces empty files nobody maintains.

NO_RAW_BOUNDARIES: import a boundary value from `constraints/` rather than writing the number. `shared/constants.js` re-exports them as `LIMITS` for existing call sites; it declares none of them itself.

SPLIT_BEFORE_EDIT: check a file's length against `MAX_FILE_LINES` before editing its logic, and split it first if it exceeds that. Five files currently do — `sidepanel.js` 818, `template-manager.js` 816, `ai-service.js` 737, `workflow-manager.js` 548, `settings.js` 494 — which is why the `max-lines` rule is scoped to `shared/components/**` for now.

DOC_IS_WHY_NOT_WHAT: a module's comment records why it exists, its contract and its gotchas — never a restatement of a signature the code already shows.

RECORD_THE_PIVOT: creating, splitting or merging a module, changing a cross-module contract, or choosing a technology gets an ADR entry under `reqs/adr/<scope>/`. Routine technical choices never do.

Untested: `settings.js` and `content.js` have no spec and sit at 0% coverage.
