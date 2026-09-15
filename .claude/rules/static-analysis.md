---
paths:
  - 'reqs/rules/**/*.js'
  - 'eslint.config.js'
  - '.stylelintrc.json'
  - '.htmlhintrc'
  - 'vitest.config.js'
---

# Static analysis rules

# Reasoning Principles

EXTENSION_HAS_AN_OWNER: routes a rule to the tool that owns the extension it targets — ESLint owns `.js` through `reqs/rules/*.js`, Stylelint `.css` through `.stylelintrc.json`, HTMLHint `.html` through `.htmlhintrc`, Prettier formats those plus `.json` and `.md` — and gives a new file type an owner before it spreads, sending a requirement over `.json` or `.md` content to a `reqs/cross/*.cross.spec.js` check instead — otherwise the rule is declared where its files never reach it, and inspects nothing.
RULES_GOVERN_REQS_TOO: aims a rule at `reqs/` as readily as at `chrome-extension/` when the convention would otherwise live in a reviewer's head — `spec-titles.rules.js` holds all four spec levels to `Subject: Given/When/Then …` and to the subject each file is named after — otherwise a spec convention survives exactly as long as the reviewer's attention does.
SPEC_RULE_READS_THE_PATH: derives a rule over `reqs/` from the file's own path and name over a hand-kept catalogue of module names, as `spec-titles.rules.js` derives the expected subject from the spec's base name — otherwise the catalogue becomes a second source of truth that falls behind the tree.
RULES_FROM_CONSTRAINTS: takes thresholds and enumerations from `chrome-extension/constraints/` — `MAX_FILE_LINES`, `SHARED_PUBLIC_ENTRIES`, `SHARED_CONSUMERS` — over literals in the rule config — otherwise the rule and the app enforce different numbers.
RULES_FAIL_LOUD: errors over warns on every rule, and fails when its pattern matches zero files — otherwise a rule that inspects nothing stays green forever.
ENFORCE_EVERY_FORM: covers every syntactic form of what a rule blocks — static _and_ dynamic import, `require` and `import()`, re-export and direct export — and records any form the rule cannot see as a known gap in the ADR entry for that boundary — otherwise a partial rule passes while the boundary leaks, as `no-restricted-imports` did for months until `shared.boundary.js` paired it with a `no-restricted-syntax` selector on `ImportExpression`.
REVERSE_BOUNDARY: pairs a module's public-entry allow-list with a reverse deny blocking external files from importing its internals — otherwise the allow-list constrains only the module's own imports.
RULES_ROLLOUT: lands a new rule scoped to one directory and widens it to siblings once green — `max-lines` covers `chrome-extension/shared/components/**` only, because `sidepanel.js`, `template-manager.js`, `ai-service.js`, `workflow-manager.js` and `settings.js` still exceed `MAX_FILE_LINES` — otherwise a repo-wide rule lands red and gets disabled instead of fixed.
PERMANENCE: requires a superseding ADR entry to delete or weaken a rule file — otherwise a guardrail disappears with no record of who decided it should.
RULES_RUN_IN_CI: runs every rule in CI (`.github/workflows/ci.yml`) on each push — otherwise a rule invoked only by hand is prose with extra steps.
RULES_PROVEN_RED_FIRST: writes the violation → confirms a non-zero exit → reverts, before trusting a rule, and prints the resulting file set after overriding a tool's `include`/`exclude`/`thresholds`, since an override **replaces** the defaults over extending them — otherwise the rule is configured, green and inspecting nothing, as three guardrails here were: a coverage threshold nested under `global:`, a key Vitest does not read, so `test:coverage` exited 0 well under its stated floor; an unquoted `eslint chrome-extension/**/*.js` that `sh` collapsed to one directory level, linting a fraction of the tree while scanning generated `coverage/`; and a boundary rule blind to dynamic `import()`.

# Output Shape

RULES_STORAGE: keeps every lint, dependency-graph and boundary rule under `reqs/rules/` as a `.js` module named for what it governs — `<module>.boundary.js` for one module's allow-list and reverse deny, `<concern>.rules.js` for a code-writing rule spanning the codebase.
RULES_THIN_LOADER: leaves `eslint.config.js` importing and composing `reqs/rules/*` and declaring no rule of its own, since it exists only because ESLint discovers that path — otherwise rules split across two homes and the arrangement stops holding.
GLOB_NAMES_THE_EXTENSION: writes every lint target as a quoted, extension-bearing glob — `"chrome-extension/**/*.js"`, `"chrome-extension/**/*.css"` — so the shell hands the pattern to the tool over expanding it — otherwise an unquoted or extension-less glob collapses to one directory level or drags in `.json` and generated `.js.html`, which is exactly how less than half the tree came to be linted.
ESQUERY_ESCAPING: escapes every dot and slash inside an esquery selector's regex literal, as `shared.boundary.js` does when it builds its selector from the constraint — esquery ends the literal at the first bare `/` — otherwise the selector silently matches nothing.

# Validation

RULE_LOCATION_CHECK: every rule is declared under `reqs/rules/` as a `.js` module; the loader configs declare none.
EXTENSION_COVERAGE_CHECK: `npm run lint` exits non-zero for all three tools after a deliberate violation is added to one `.js`, one `.css` and one `.html` file that ships in `chrome-extension/`.
GENERATED_EXCLUSION_CHECK: no tool's file set includes `chrome-extension/coverage/**`, `coverage/**` or `node_modules/**`.
RULE_LITERAL_CHECK: no threshold or enumeration is hard-coded in a rule config.
RULE_ZERO_MATCH_CHECK: each rule fails when its pattern matches zero files.
RULE_RED_FIRST_CHECK: each rule has been seen exiting non-zero on a deliberate violation.
RULE_FILE_SET_CHECK: each tool's effective file set has been printed and matches what the rule claims to cover.
RULE_CI_CHECK: every rule is invoked by `.github/workflows/ci.yml`.
