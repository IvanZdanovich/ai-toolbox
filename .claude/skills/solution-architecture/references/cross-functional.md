# Cross-functional requirements

Load with `SKILL.md` for EMPTY_RULE_GUARD and SCOPE_NAMED_BY_SUBJECT. This file
holds requirements that hold across many modules — latency budgets,
accessibility levels, determinism targets, security baselines — and the single
check that enforces each.

# Principles

CROSS_FUNCTIONAL_ONCE: declare a requirement that applies to many modules exactly once — one constraint variable and one check that resolves its own targets — never copied into each module's specs — otherwise the copies diverge, and a module added later silently escapes the requirement entirely
CROSS_IS_NOT_A_LEVEL: a cross-functional check is not a fourth test level; it asserts a property every target must hold, not a behavior one subject performs — so it never mirrors the app tree and never names a module in its path — otherwise it drifts into being a unit spec with a wide import list
CROSS_OUTLIVES_ITS_TARGETS: the check must keep working when a module is added, renamed, or removed, because that is the failure it exists to prevent — a check that has to be edited whenever the module list changes has already failed

# Method

CROSS_DECLARE_ONCE: declare each non-functional/cross-cutting requirement as one constraint variable in `constraints/<concern>.constraints.<ext>` and one check at `reqs/cross/<concern>.spec.<ext>`, named for the concern and never for a module
CROSS_SELECTOR: have the check resolve its own targets at run time by a stated selector — a name pattern, a module/component type, a tag, a manifest field, or a directory glob — so a module added later is picked up without editing the check
CROSS_SELECTOR_EXPLICIT: state the selector in the check's title and assert it matched at least the expected minimum, failing loud on zero matches (EMPTY_RULE_GUARD)
CROSS_PER_TARGET_REPORT: report the result per resolved target, not as one aggregate pass/fail, so a failure names the offending module instead of the requirement
CROSS_EXEMPTION: record an exemption as a named entry in the concern's constraints file citing the ADR entry that granted it, never as a skip or an inline condition in the check
CROSS_GUARDS_UNIMPORTABLE_COPIES: where a value cannot be imported by every consumer — a manifest, a JSON config, a generated artifact — the cross-functional check is what holds the copies to the constraint; it reads each copy and asserts agreement, per target

# Validation

CROSS_ONCE_CHECK: each cross-functional requirement has exactly one constraint variable and one check under `reqs/cross`; no module spec restates it
CROSS_SELECTOR_CHECK: the cross-functional check resolves its targets by a stated selector (name pattern, module/component type, tag, manifest field, glob), names that selector in its title, and picks up a newly added matching module without being edited
CROSS_ZERO_CHECK: the cross-functional check fails when its selector matches zero targets
CROSS_REPORT_CHECK: a cross-functional failure names the offending target, not just the requirement
CROSS_EXEMPTION_CHECK: every exemption is a named entry in the concern's constraints file citing the ADR entry that granted it — no skip, no inline condition in the check
CROSS_NOT_MIRRORED_CHECK: `reqs/cross` is flat and named by concern; no check sits in a module-shaped path or is named after a module
