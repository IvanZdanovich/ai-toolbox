# `shared/` module decisions

## shared.adr-1 — `shared/` is reached only through its two public entry points

- **status:** accepted
- **date:** 2026-09-14
- **context:** `chrome-extension/shared/` holds the storage layer, the AI service, the template/workflow/history managers and the UI components, consumed by four independent entry points (background, sidepanel, settings, content). Without a boundary each consumer couples to whichever internal file it happens to need, and the module cannot be restructured without touching all four. A `no-restricted-imports` rule already expressed this intent, but `settings.js` reached past it with dynamic `import()` and lint stayed green, because that rule only inspects static imports.
- **decision:** `shared/index.js` and `shared/components/index.js` are the only importable paths for the four consumer directories, declared as `SHARED_PUBLIC_ENTRIES` in `constraints/shared.constraints.js`. Enforcement pairs an allow-list (deny the directory, re-allow the entry) with a reverse deny covering dynamic imports via a `no-restricted-syntax` selector on `ImportExpression`. Alternative considered: prose in a README — rejected, `APPROACH_IS_EXECUTABLE`; the previous prose-plus-partial-rule arrangement is precisely what let the dynamic imports through. Alternative considered: extend the deny to `reqs/` — rejected, specs legitimately import internals to test them in isolation.
- **consequences:** Positive — the public surface is a single reviewable list, and reaching past it now fails the build in both static and dynamic form. Negative — a consumer needing a genuinely internal export must widen `shared/index.js`, which is a visible diff rather than a quiet import. Risk — the `ImportExpression` selector is a regex over a literal path, so a computed specifier (`import(base + name)`) still escapes it. Mitigation — no consumer builds specifiers at runtime today; if one needs to, that is itself a decision worth recording.
- **constraints:** `SHARED_PUBLIC_ENTRIES`, `SHARED_CONSUMERS` in `constraints/shared.constraints.js`
- **rules:** `reqs/rules/shared.boundary.js`
- **spec_changes:** implementation — `settings.js` replaced four dynamic `import('../shared/*.js')` calls with the static exports `shared/index.js` already provided
- **specs_affected:** integration
- **links:** upstream `layout.adr-1`, `layout.adr-2`
