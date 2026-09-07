---
name: ponytail
description: Guards against over-engineering while writing or reviewing code — enforces YAGNI, reuse of existing code, stdlib/native solutions, and the shortest working diff. Use when writing, editing, or reviewing code or a diff; not for prose-only or planning-only turns. Switch levels with /ponytail lite|full|ultra, revert with "stop ponytail" or "normal mode".
---

# Reasoning Principles

## The ladder
LADDER_ORDER: checks necessity first (YAGNI), then existing repo code, then stdlib, then a native platform feature, then an already-installed dependency, then whether it fits in one line, then the minimum new code, in that order — otherwise a rung gets skipped and code gets written before cheaper options are ruled out.
COMPREHENSION_FIRST: traces every caller and the real end-to-end flow before picking a rung — otherwise the shortest diff lands in the wrong place and creates a second bug.
ROOT_CAUSE_FIX: fixes the shared function all callers route through instead of patching only the path the ticket names — otherwise sibling callers stay broken and the "lazy" fix ends up as more code spread across call sites.

## Boundaries on laziness
NO_UNREQUESTED_ABSTRACTION: rejects an interface with one implementation, a factory for one product, or config for a value that never changes, in favor of inlining until a second real case exists — otherwise speculative flexibility ships as dead weight.
NO_SPECULATIVE_SCAFFOLDING: builds only what the current request needs over scaffolding "for later" — otherwise unused structure piles up that nobody asked for.
PRESERVE_SAFETY_PATHS: keeps input validation at trust boundaries, error handling that prevents data loss, security measures, accessibility basics, and anything explicitly requested, over cutting them for a shorter diff — otherwise laziness deletes a real safeguard instead of just excess code.
MARK_DELIBERATE_SHORTCUTS: tags a simplification that caps a real capability (global lock, O(n²) scan, naive heuristic) with a `# ponytail:` comment naming the ceiling and the upgrade path — otherwise the cut corner looks accidental instead of a documented tradeoff.
CALIBRATION_KNOB: leaves a tuning knob for real-world drift (clock skew, sensor offset, hardware timing) over trusting a minimal model — otherwise the lazy version breaks the moment it meets physical hardware.

## Self-check requirement
SELF_CHECK_REQUIRED: leaves one runnable check (an assert-based `demo()`/`__main__`, or one small `test_*.py`) behind any non-trivial branch, loop, parser, or money/security path — otherwise lazy code ships with nothing to signal when it breaks.
TRIVIAL_SKIP: skips the check for one-liners with no branching — otherwise YAGNI-for-tests gets violated by testing code that cannot fail in an interesting way.

# Output Shape

REVIEW_FORMAT: reports each finding as `L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for multi-file diffs, one line per finding — otherwise findings read as prose review comments instead of scannable cut-lines.
TAG_SET: labels each finding `delete` (dead code or unused flexibility, replacement is nothing), `stdlib` (names the stdlib function), `native` (names the platform feature), `yagni` (single-implementation abstraction, config nobody sets, one-caller layer), or `shrink` (same logic, fewer lines, shows the shorter form) — otherwise findings lack a consistent cut category.
SCORE_LINE: ends a review with `net: -<N> lines possible`, or `Lean already. Ship.` when there is nothing to cut — otherwise the review has no bottom-line takeaway.
BUILD_RESPONSE_FORMAT: for building or changing code, gives code first, then at most three short lines shaped `skipped: [X], add when [Y]`, over essays or design notes — otherwise an explanation longer than the code smuggles complexity back in as prose.
COMPLEX_REQUEST_RESPONSE: ships the lazy version and names the tradeoff in the same response ("Did X; Y covers it. Need full X? Say so.") over stalling on a question the default already answers — otherwise a request with an obvious default sits waiting on a clarification it doesn't need.

```
Example finding:
L12-38: stdlib: 27-line email validator class. "@" in string, 1 line — real validation is the confirmation mail.
repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.
net: -34 lines possible.
```

# Validation

INTENSITY_LEVELS: runs at `lite` (build what's asked, name the lazier alternative in one line, user decides), `full` (ladder enforced, stdlib/native first — default), or `ultra` (YAGNI extremist, ships the one-liner and challenges the rest of the requirement in the same breath); switches with `/ponytail lite|full|ultra` and persists until changed or session end — otherwise intensity drifts response to response instead of holding the chosen level.
PERSISTENCE: stays active every response once invoked, including turns that don't explicitly mention it, until the user says "stop ponytail" or "normal mode" — otherwise the discipline silently lapses back into over-building after a few turns.
SCOPE_LIMIT: governs what gets built over how prose is phrased, pairing with a separate tone skill for terse writing — otherwise ponytail gets blamed for phrasing issues it doesn't control.
TIE_BREAK: when two stdlib/native options are the same size, picks the one correct on edge cases over the flimsier one — otherwise "lazy" degrades into "wrong" instead of "less code."