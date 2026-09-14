---
paths:
  - 'reqs/rules/**'
  - 'eslint.config.js'
  - '.stylelintrc.json'
  - '.htmlhintrc'
  - 'vitest.config.js'
---

# Static analysis rules

RULES_STORAGE: every lint, dependency-graph and boundary rule lives under `reqs/rules/`, named for what it governs — `<module>.boundary.js` for one module's allow-list and reverse deny, `<concern>.rules.js` for a code-writing rule spanning the codebase.

RULES_THIN_LOADER: `eslint.config.js` exists only because ESLint discovers that path. It imports and composes `reqs/rules/*`; it declares no rule of its own. Adding a rule there instead of in `reqs/rules/` defeats the arrangement.

RULES_FROM_CONSTRAINTS: thresholds and enumerations come from `chrome-extension/constraints/` — `MAX_FILE_LINES`, `SHARED_PUBLIC_ENTRIES`, `SHARED_CONSUMERS` — never as literals in the rule config.

RULES_FAIL_LOUD: every rule errors, never warns, and fails when its pattern matches zero files.

ENFORCE_EVERY_FORM: a rule must cover every syntactic form of what it blocks — static _and_ dynamic import, require and `import()`, re-export and direct export. `no-restricted-imports` sees only static imports, which is how `settings.js` reached past `shared/index.js` for months with lint green; `shared.boundary.js` pairs it with a `no-restricted-syntax` selector on `ImportExpression`. Name any form a rule provably cannot see as a known gap in the ADR entry recording the boundary.

REVERSE_BOUNDARY: a module's public-entry allow-list is paired with a reverse deny blocking external files from importing its internals.

RULES_ROLLOUT: land a new rule scoped to one directory, expand to siblings once green. `max-lines` is scoped to `chrome-extension/shared/components/**` because five files elsewhere still exceed the ceiling.

PERMANENCE: deleting or weakening a rule file requires a superseding ADR entry.

## Proving a rule before trusting it

A rule is not landed until it has failed on purpose: write the violation,
confirm a non-zero exit, revert. Three guardrails here were configured, green
and inspecting nothing —

- a coverage threshold nested under `global:`, a key Vitest does not read, so
  `test:coverage` exited 0 at 41.8% against a stated 70%;
- `eslint chrome-extension/**/*.js` unquoted, which `sh` collapsed to one level,
  linting 20 of 45 files while scanning generated `coverage/*.js`;
- a boundary rule blind to dynamic `import()`.

Overriding a tool's `include`/`exclude`/`thresholds` **replaces** its defaults
rather than extending them — verify the resulting file set, never assume it.

Every rule runs in CI (`.github/workflows/ci.yml`) on each push. A rule invoked
only by hand is prose with extra steps.

## esquery gotcha

esquery ends a selector's regex literal at the first bare `/`, so every dot and
slash inside one must arrive escaped. `shared.boundary.js` builds its selector
from the constraint and escapes both.
