---
paths:
  - 'chrome-extension/**/*.js'
  - 'chrome-extension/**/*.css'
  - 'chrome-extension/**/*.html'
  - 'chrome-extension/manifest.json'
---

# Working in the extension

`chrome-extension/` is what Chrome loads as the unpacked extension. Anything
the app imports at run time must live inside it — that is why
`chrome-extension/constraints/` sits here rather than at the repo root
(layout.adr-2). Plain ES modules, no build step, no framework.

Four text extensions ship, and each has one owner: `.js` for every module,
`.css` for a module's own styles beside it and shared ones in
`chrome-extension/styles/`, `.html` for the two extension pages
(`sidepanel/sidepanel.html`, `settings/settings.html`), `manifest.json` for
what Chrome reads first. `.png` under `icons/` is the only binary.
Nothing under `chrome-extension/coverage/` is source — it is a generated
report that shares the tree, and `.js.html` files there are its output.

EXPLICIT_JS_EXTENSION: ends every relative import specifier in `.js` — `from './storage.js'`, `from '../constraints/template.constraints.js'` — because Chrome's ES module loader and Vitest's browser-shaped resolution do no extension guessing and no directory-index lookup; `./storage` and `./components` both 404 at run time while ESLint stays green — otherwise the extension breaks only once loaded, where no spec is watching.
NO_BARE_SPECIFIERS: imports run-time code by relative path only, never by package name, because there is no bundler, no import map and no `node_modules` inside the packaged directory; a dependency needed at run time is vendored into `chrome-extension/` as a `.js` file — otherwise the module resolves under Vitest and fails in the shipped extension.
MODULE_SCRIPT_TAG: loads page scripts as `<script type="module" src="<name>.js"></script>` with the `.js` spelled out and no inline script body, matching `sidepanel.html` and `settings.html` — otherwise a classic script loses `import` and the extension's CSP rejects inline code.
SHARED_IS_CLOSED: imports into `background/`, `sidepanel/`, `settings/` and `content/` come from `shared/index.js` and `shared/components/index.js` only, never from a file inside `shared/`; a consumer needing an internal export widens `shared/index.js`, which is a visible diff over a quiet import — otherwise the public surface grows in private and `reqs/rules/shared.boundary.js`, which blocks both static and dynamic reaches, is the only thing left saying so.
MINIMAL_SURFACE: re-exports from the public entry only what an external caller needs, explicitly, over a wildcard — otherwise the API grows unintentionally and cannot shrink without breaking callers.
ENTRY_POINT: gives a new module one public entry point named `index.js` re-exporting its surface explicitly, with every other file reachable only through relative internal paths ending in `.js`; a sub-module takes the same shape and stays private unless the parent re-exports it — `shared/index.js`, `shared/components/index.js`, `shared/components/editor-tab/index.js`.
MODULE_FILE_NAMING: names every source file kebab-case with a single `.js` extension after the thing it holds — `template-manager.js`, `icon-helper.js`, `agent-runtime.js` — reserving `index.js` for the public entry and suffixed names (`.constraints.js`) for the trees that define them; no `.mjs`, `.cjs`, `.ts` or `.jsx` — otherwise a second module extension needs a build step this project does not have.
STRUCTURE_ON_DEMAND: adds a `<module>.css`, a `constants.js` or a `helpers.js` once the module needs it, matching neighbouring modules, over scaffolding by convention — otherwise empty files pile up that nobody maintains.
STYLES_BESIDE_OR_SHARED: keeps a page's own `.css` beside its `.html` (`sidepanel/sidepanel.css`, `settings/settings.css`, `content/content.css`) and puts anything two pages share under `chrome-extension/styles/` as `base.css`, `components.css`, `icons.css` or `variables.css` — otherwise a shared rule gets copied into both pages and they drift.
NO_RAW_BOUNDARIES: imports a boundary value from `constraints/` over writing the number; `shared/constants.js` re-exports them as `LIMITS` for existing call sites and declares none of them itself — otherwise the number drifts from the constraint that governs it.
SPLIT_BEFORE_EDIT: checks a file's length against `MAX_FILE_LINES` before editing its logic and splits it first when it exceeds that — otherwise the files already over the ceiling keep growing, which is why `max-lines` is scoped to `shared/components/**` while `sidepanel.js` 818, `template-manager.js` 816, `ai-service.js` 737, `workflow-manager.js` 548 and `settings.js` 494 stay out of scope.
DOC_IS_WHY_NOT_WHAT: records why a module exists, its contract and its gotchas over restating a signature the code already shows — otherwise the comment duplicates the code and rots against it.
RECORD_THE_PIVOT: writes an ADR entry under `reqs/adr/<scope>/` when creating, splitting or merging a module, changing a cross-module contract, or choosing a technology, and never for a routine technical choice — otherwise the pivots go unrecorded while the log fills with trivia.
COVERAGE_GAPS: writes a spec for `settings.js` or `content.js` before changing its logic — both sit at 0% coverage with no spec — otherwise the two least-covered modules keep growing unverified.
MANIFEST_IS_A_CONSUMER: updates `manifest.json` whenever a file it names moves or is renamed — `manifest.json` references `.js`, `.html`, `.css` and `.png` paths as plain strings no import graph or lint rule follows — and guards any value it duplicates with a `reqs/cross/*.spec.js` check, as `version.spec.js` does — otherwise a rename passes every gate and the extension fails to load.

## Validation

SHARED_BOUNDARY_CHECK: no file outside `shared/` imports a path inside `shared/`, statically or dynamically.
JS_EXTENSION_CHECK: every relative import and `import()` specifier under `chrome-extension/` ends in `.js`; no specifier is bare.
ENTRY_POINT_CHECK: each module has exactly one public entry named `index.js`, and it lists its exports explicitly rather than re-exporting a wildcard.
SOURCE_EXTENSION_CHECK: `chrome-extension/` holds only `.js`, `.css`, `.html`, `manifest.json` and `icons/*.png`; anything else is generated output and is not edited by hand.
MANIFEST_PATH_CHECK: every path string in `manifest.json` resolves to a file that exists.
RAW_BOUNDARY_CHECK: no boundary literal appears outside `constraints/`.
FILE_LENGTH_CHECK: every file touched in a change is at or under `MAX_FILE_LINES`, or was split in the same change.
