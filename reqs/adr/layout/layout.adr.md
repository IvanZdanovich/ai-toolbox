# Repository layout decisions

## layout.adr-1 — Specs, rules and decisions live in `reqs/` at the repo root

- **status:** accepted
- **date:** 2026-09-14
- **context:** Verification material was split across three unrelated trees — `chrome-extension/tests/` for specs, `docs/decisions/` for decisions, `chrome-extension/requirements/` for business rules — with an `INDEX.md` placeholder in each of the latter two and nothing else. Nothing tied a spec to the source file it covered, `chrome-extension/tests/unit/` existed but was empty, and an e2e suite sat inside `tests/integration/` under an `.integration.` suffix. The solution-architecture skill requires one `reqs/` tree holding everything that verifies or justifies the app, mirroring the app path.
- **decision:** Consolidate into `reqs/` at the repo root: `integration/` and `unit/` mirroring `chrome-extension/`, a flat `e2e/`, `integration-examples/` mirroring the integration specs, `cross/` for cross-functional checks, `rules/` for static analysis, and `adr/<scope>/` for decisions. Vitest's root moves from `chrome-extension/` to the repo root so both trees are reachable from one root, and `vitest.config.js` moves with it. Alternative considered: keep `tests/` inside `chrome-extension/` and only rename — rejected, because specs are not packaged into the extension and nesting them under the packaged directory is what made the app path and the spec path diverge in the first place. Alternative considered: leave decisions in `docs/` — rejected, `ADR_LOCATION_CHECK` requires `reqs/adr`.
- **consequences:** Positive — a moved source file's spec is findable by path; coverage now measures `chrome-extension/**` rather than a hand-listed set of directories; one root for the whole verification tree. Negative — every spec's relative imports gained a `chrome-extension/` segment, and any in-flight branch touching `chrome-extension/tests/` will conflict. Risk — the extension still loads only what is under `chrome-extension/`, so anything the app imports must stay there. Mitigation — `constraints/` is placed under `chrome-extension/`, not at the repo root, and layout.adr-2 records why.
- **constraints:** none introduced
- **rules:** `reqs/rules/shared.boundary.js`, `reqs/rules/complexity.rules.js`, `reqs/rules/naming.rules.js` (moved out of the root `eslint.config.js`, which is now a loader only)
- **spec_changes:** architecture — all 15 integration specs re-pathed; the e2e suite moved to `reqs/e2e/workflows.e2e.test.js` and renamed off the `.integration.` suffix
- **specs_affected:** integration · e2e · cross
- **links:** downstream `layout.adr-2`, `shared.adr-1`

## layout.adr-2 — `constraints/` sits under `chrome-extension/`, not the repo root

- **status:** accepted
- **date:** 2026-09-14
- **context:** The skill's reference tree puts `constraints/` at the repo root "because the app imports from it as well as the specs, rules and ADR entries do". That reasoning assumes the app root and the repo root coincide. Here they do not: Chrome loads `chrome-extension/` as the unpacked extension, and a module outside that directory is not packaged, so `import '../../constraints/x.js'` from `chrome-extension/shared/` would resolve in Vitest and fail at runtime in the browser.
- **decision:** Place the constraints tree at `chrome-extension/constraints/`, keeping every other element of the reference layout. Specs import it across the boundary (`../../../chrome-extension/constraints/<owner>.constraints.js`), which is fine in the other direction — nothing in `reqs/` is packaged. Alternative considered: repo-root `constraints/` with a build step copying it into the extension — rejected, it introduces a generated file that can drift from its source and a build the project does not otherwise need. Alternative considered: duplicate the values in both places — rejected outright by `SINGLE_OWNER`.
- **consequences:** Positive — one declaration per boundary, importable by the app at runtime and by the specs at test time. Negative — the layout deviates from the skill's tree, so a reader following the skill literally will look in the wrong place. Risk — a future contributor "corrects" the path back to the repo root and silently breaks the packaged extension. Mitigation — this entry, and the header comment in each constraints file.
- **constraints:** introduces `template`, `workflow`, `agent`, `history`, `storage`, `version`, `shared`, `complexity` constraints files; `shared/constants.js` now re-exports them instead of declaring them
- **rules:** `reqs/rules/shared.boundary.js` and `reqs/rules/complexity.rules.js` both read their values from this tree
- **spec_changes:** implementation — four integration specs import their boundary values from `constraints/` instead of `shared/constants.js`
- **specs_affected:** integration · cross (`reqs/cross/version.spec.js`)
- **links:** upstream `layout.adr-1`
