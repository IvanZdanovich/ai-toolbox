---
paths:
  - 'reqs/cross/**/*.cross.spec.js'
---

# Cross-functional checks

# Reasoning Principles

CROSS_SUBJECT: covers a requirement that holds across many modules — a latency budget, an accessibility level, a determinism target, a version three files must agree on — over a behaviour one subject performs, so the check never mirrors the app tree and never names a module in its path — otherwise it drifts into being a unit spec with a wide import list.
CROSS_FUNCTIONAL_ONCE: declares the requirement exactly once — one constraint variable in `chrome-extension/constraints/<concern>.constraints.js` and one check at `reqs/cross/<concern>.cross.spec.js` — over copies in individual module specs — otherwise the copies diverge and a module added later escapes the requirement entirely.
CROSS_SELECTOR: resolves the check's targets at run time by a stated selector — a name pattern, a directory glob, a manifest field — and asserts the selector matched at least the expected minimum, over a hand-listed set — otherwise a module added later is missed until someone edits the check, and a path typo turns the check into a no-op that stays green.
CROSS_GUARDS_UNIMPORTABLE_COPIES: holds a copy to its constraint with a cross check wherever a consumer cannot import the variable — `package.json` and `chrome-extension/manifest.json`, with `version.cross.spec.js` as the working example — otherwise the copies agree only by luck.
CROSS_EXEMPTION: records an exemption as a named entry in the concern's constraints file citing the ADR entry that granted it, over a `skip` or an inline condition in the check — otherwise the exemption is invisible to anyone reading the requirement.

# Output Shape

CROSS_FILENAME: names the check `reqs/cross/<concern>.cross.spec.js`, the `.cross.` infix stating the level exactly as `.integration.` and `.e2e.` do at theirs — otherwise a bare `<concern>.spec.js` here reads as a unit spec that lost its tree.
CROSS_READS_ANY_EXTENSION: reaches its targets with `fs` and a glob over an `import`, since the copies a cross check guards are `.json`, `.html`, `.css` and `.md` as often as `.js` — `version.cross.spec.js` reads `package.json` and `manifest.json` as text — otherwise the check can only see the one extension ES imports resolve.
CROSS_TITLE: takes the concern as the title subject and states the selector in the `Given` — `Version: Given the files matched by the selector "JSON manifests declaring a version field"` — otherwise the run output says a requirement failed without saying over what set it was checked.
CROSS_PER_TARGET_REPORT: reports one case per resolved target (`it.each`), each naming the target it ran against — otherwise a failure names only the requirement and not the offending file.

# Validation

CROSS_ONCE_CHECK: exactly one constraint variable and one check per requirement; no module spec restates it.
CROSS_SELECTOR_CHECK: targets resolve by a stated selector named in the title, and a newly added matching target is picked up without editing the check.
CROSS_ZERO_CHECK: the check fails when its selector matches zero targets.
CROSS_REPORT_CHECK: a failure names the offending target.
CROSS_NOT_MIRRORED_CHECK: `reqs/cross/` is flat and named by concern; no check sits in a module-shaped path.
