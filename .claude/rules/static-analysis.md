---
paths:
  - 'reqs/rules/**/*.js'
  - 'eslint.config.js'
  - '.stylelintrc.json'
  - '.htmlhintrc'
  - 'vitest.config.js'
---

# Static analysis rules

Four tools split the codebase by extension and none of them overlaps:
ESLint owns `.js`, Stylelint owns `.css`, HTMLHint owns `.html`, Prettier
formats all of those plus `.json` and `.md`. A file type with no owner is
unchecked, and a rule aimed at the wrong tool's extension inspects nothing.

RULES_STORAGE: keeps every lint, dependency-graph and boundary rule under `reqs/rules/` as a `.js` module, named for what it governs — `<module>.boundary.js` for one module's allow-list and reverse deny, `<concern>.rules.js` for a code-writing rule spanning the codebase.
EXTENSION_HAS_AN_OWNER: routes a new rule to the tool that owns the extension it targets — a `.js` rule to `reqs/rules/*.js` under ESLint, a `.css` rule to `.stylelintrc.json`, a `.html` rule to `.htmlhintrc` — and gives a new file type an owner before it spreads; `.json` and `.md` are formatted by Prettier and otherwise unchecked, so a requirement over their content becomes a `reqs/cross/*.spec.js` check instead — otherwise the rule is declared where its files never reach it.
GLOB_NAMES_THE_EXTENSION: writes every lint target as a quoted, extension-bearing glob — `"chrome-extension/**/*.js"`, `"chrome-extension/**/*.css"` — and quotes it in `package.json` so the shell hands the pattern to the tool rather than expanding it — otherwise an unquoted or extension-less glob collapses to one directory level or drags in `.json` and generated `.js.html`, which is exactly how 20 of 45 files came to be linted.
RULES_THIN_LOADER: leaves `eslint.config.js` importing and composing `reqs/rules/*` and declaring no rule of its own — it exists only because ESLint discovers that path — otherwise rules split across two homes and the arrangement stops holding.
RULES_FROM_CONSTRAINTS: takes thresholds and enumerations from `chrome-extension/constraints/` — `MAX_FILE_LINES`, `SHARED_PUBLIC_ENTRIES`, `SHARED_CONSUMERS` — over literals in the rule config — otherwise the rule and the app enforce different numbers.
RULES_FAIL_LOUD: errors rather than warns on every rule, and fails when its pattern matches zero files — otherwise a rule that inspects nothing stays green forever.
ENFORCE_EVERY_FORM: covers every syntactic form of what a rule blocks — static _and_ dynamic import, require and `import()`, re-export and direct export — and names any form the rule provably cannot see as a known gap in the ADR entry recording the boundary — otherwise a partial rule passes while the boundary leaks, as `no-restricted-imports` did for months until `shared.boundary.js` paired it with a `no-restricted-syntax` selector on `ImportExpression`.
REVERSE_BOUNDARY: pairs a module's public-entry allow-list with a reverse deny blocking external files from importing its internals — otherwise the allow-list constrains only the module's own imports.
RULES_ROLLOUT: lands a new rule scoped to one directory and expands to siblings once green — `max-lines` is scoped to `chrome-extension/shared/components/**` because five files elsewhere still exceed the ceiling — otherwise a repo-wide rule lands red and gets disabled instead of fixed.
PERMANENCE: requires a superseding ADR entry to delete or weaken a rule file — otherwise a guardrail disappears with no record of who decided it should.
PROVE_THE_RULE: writes the violation, confirms a non-zero exit and reverts before trusting a rule — otherwise it is configured, green and inspecting nothing, as three guardrails here were: a coverage threshold nested under `global:`, a key Vitest does not read, so `test:coverage` exited 0 at 41.8% against a stated 70%; `eslint chrome-extension/**/*.js` unquoted, which `sh` collapsed to one level, linting 20 of 45 files while scanning generated `coverage/*.js`; and a boundary rule blind to dynamic `import()`.
VERIFY_THE_FILE_SET: verifies the resulting file set after overriding a tool's `include`/`exclude`/`thresholds` — an override **replaces** the defaults rather than extending them — otherwise the rule silently runs over a fraction of the codebase.
RULES_RUN_IN_CI: runs every rule in CI (`.github/workflows/ci.yml`) on each push — otherwise a rule invoked only by hand is prose with extra steps.
ESQUERY_ESCAPING: escapes every dot and slash inside an esquery selector's regex literal — esquery ends the literal at the first bare `/`, and `shared.boundary.js` builds its selector from the constraint and escapes both — otherwise the selector silently matches nothing.

## Validation

RULE_LOCATION_CHECK: every rule is declared under `reqs/rules/` as a `.js` module; the loader configs declare none.
EXTENSION_COVERAGE_CHECK: every `.js`, `.css` and `.html` file that ships in `chrome-extension/` is reached by its owning tool — `npm run lint` after adding a deliberate violation to one file of each extension exits non-zero for all three.
GENERATED_EXCLUSION_CHECK: no tool's file set includes `chrome-extension/coverage/**`, `coverage/**` or `node_modules/**`; the `.js.html` and `.js` files there are generated output.
RULE_LITERAL_CHECK: no threshold or enumeration is hard-coded in a rule config.
RULE_ZERO_MATCH_CHECK: each rule fails when its pattern matches zero files.
RULE_RED_FIRST_CHECK: each rule has been observed exiting non-zero on a deliberate violation.
RULE_FILE_SET_CHECK: each tool's effective file set has been printed and matches what the rule claims to cover.
RULE_CI_CHECK: every rule is invoked by `.github/workflows/ci.yml`.
