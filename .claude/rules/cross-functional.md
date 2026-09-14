---
paths:
  - 'reqs/cross/**'
---

# Cross-functional checks

A requirement that holds across many modules — a latency budget, an
accessibility level, a determinism target, a version that three files must
agree on.

CROSS_IS_NOT_A_LEVEL: this is not a fourth test level. A cross-functional check asserts a property every target must hold, not a behaviour one subject performs — so it never mirrors the app tree and never names a module in its path, or it drifts into being a unit spec with a wide import list.

CROSS_FUNCTIONAL_ONCE: declare the requirement exactly once — one constraint variable in `chrome-extension/constraints/<concern>.constraints.js` and one check at `reqs/cross/<concern>.spec.js`. Never copy it into individual module specs: the copies diverge, and a module added later escapes the requirement entirely.

CROSS_SELECTOR: the check resolves its own targets at run time by a stated selector — a name pattern, a directory glob, a manifest field — so a module added later is picked up without editing the check.

CROSS_SELECTOR_EXPLICIT: name the selector in the check's title and assert it matched at least the expected minimum. A path typo or a renamed module must fail loud, never turn the check into a no-op that stays green.

CROSS_PER_TARGET_REPORT: one case per resolved target (`it.each`), so a failure names the offending file rather than just the requirement.

CROSS_EXEMPTION: record an exemption as a named entry in the concern's constraints file citing the ADR entry that granted it — never a `skip` and never an inline condition in the check.

CROSS_GUARDS_UNIMPORTABLE_COPIES: where a value cannot be imported by every consumer — `package.json`, `chrome-extension/manifest.json` — the cross check is what holds the copies to the constraint. `version.spec.js` is the working example.

## Validation

CROSS_ONCE_CHECK: exactly one constraint variable and one check per requirement; no module spec restates it.
CROSS_SELECTOR_CHECK: targets resolve by a stated selector named in the title, and a newly added matching target is picked up without editing the check.
CROSS_ZERO_CHECK: the check fails when its selector matches zero targets.
CROSS_REPORT_CHECK: a failure names the offending target.
CROSS_NOT_MIRRORED_CHECK: `reqs/cross/` is flat and named by concern; no check sits in a module-shaped path.
