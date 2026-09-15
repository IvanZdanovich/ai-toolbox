---
name: create-rule
description: Use when creating, updating, or improving `.claude/rules/*.md` files by turning guidance about a file tree into compact, path-scoped, tag-based rules that say what to do while writing a file in that tree
---

# Reasoning Principles

PURPOSE: gives an agent editing files under the file's `paths` what to write, where to put it, and what to check before stopping — otherwise the file becomes background reading that changes no edit.
SIGNAL: names one action per rule that a reviewer can see taken or not taken in the diff, giving any amount as a count, a glob, or a named file — otherwise the rule drifts to taste and cannot be checked.
ACTION_FIRST: opens every Reasoning Principles and Output Shape value with the verb the agent performs on the file — declares, names, mirrors, moves, imports, covers, splits, records — over a description of a desired state; Validation states conditions instead, per VALIDATION_PHRASING — otherwise the rule reads as commentary and the agent leaves the file as it found it.
PATH_TRIGGER: earns a rule file only when the guidance applies to every file under one glob and would be wrong outside it — otherwise it belongs in a skill keyed to a task, in `docs/`, or in a linter.
TREE_LAYERING: puts a rule that holds across a wide tree in that tree's umbrella file and a rule that holds for one branch in the branch's file, so overlapping globs are the wanted shape and each rule still lives in exactly one layer — otherwise the umbrella is narrowed away, or a rule is restated in every branch file and the copies drift.
NON_OBVIOUS_ACTION: keeps a rule only for a placement, naming, or boundary choice a capable agent would get wrong from the surrounding code alone — otherwise the agent loads context to be told what the neighbouring files already show.
INCLUSION_GATE: keeps a point only when it changes what the next edit under the glob writes — otherwise a true-but-idle fact becomes noise.
LOCAL_ROUTING: names the destination tree whenever a rule turns work away, as `sends <the excluded case> to <tree>`, over a bare prohibition — otherwise the rejected work has nowhere to go and lands back in the wrong tree.
ANCHORED_IN_THE_REPO: cites the real path, filename, variable, or ADR entry id the action touches over a generic noun — otherwise the agent guesses a plausible location and the tree grows a second convention.
SELF_CONTAINMENT: keeps glob, actions, destinations, and checks inside the rule file, citing other rule files and ADR entries only for a rule they own — otherwise a correct edit depends on a skill or memory that is not loaded.
REASONING: ends non-default rules with `— otherwise <the specific defect the next edit introduces>` and leaves plain conventions bare — otherwise rules fall back to model defaults and edge cases lose the intent.
COMPARATIVE_PREFERENCE: states every preference and every limit as `<wanted action> over <tempting alternative action>`, so the habit being beaten is named and the replacement is given — otherwise a blocked habit stays active with no target to aim at.
KNOWN_EXCEPTION: records a standing exception inside the rule that owns it, naming the file and what unblocks it, over leaving the tree silently inconsistent — otherwise the next agent "fixes" the exception and breaks what it was protecting.

# Output Shape

SCOPE_PATH: writes one file per tree at `.claude/rules/<tree-or-concern>.md`, named for what it governs.
FRONTMATTER: holds `paths` and nothing else — a quoted list of globs relative to the repo root — otherwise prose rules hide in YAML.
GLOB_SCOPE: writes globs that match every file the rules govern and no file they would contradict, wide for an umbrella layer and down to the file suffix for a specialization, and states in the file when a glob covers a tree not yet written — otherwise the rules fire on neighbouring files, or a rule written ahead of its tree reads as broken.
SECTION_SET: opens with a single `# <plain name of the tree>` heading and no prose under it, then the three required `#` sections — `# Reasoning Principles`, `# Output Shape`, `# Validation` — with optional `##` subheadings inside a section to group related tags — otherwise an intro paragraph grows into untagged rules and a long tag list stays hard to scan.
SECTION_SPLIT: puts why-and-when judgments in Reasoning Principles, concrete paths, names and file layouts in Output Shape, and post-edit checks in Validation — otherwise a naming rule and the check for it drift apart.
TAG_FORMAT: writes each rule as `TAG_NAME: active rule value` on one line with no prose between tags, giving an UPPER_SNAKE_CASE noun name and a value stating the action, its destination, and its trigger condition using verbs such as names, mirrors, moves, declares, covers, imports, or records — otherwise tags become plain labels with no shaping force.
TAG_NAMING: names each tag for the subject it governs, sharing one prefix across the file when the file governs one subject and using per-subject names when it governs several, and always prefixing a tag another file cites — otherwise a citation resolves to either of two files, or a forced prefix pads every name in a mixed file.
VALIDATION_PHRASING: writes each Validation value as the observable condition a finished file meets over repeating its rule as an instruction — otherwise the check costs a line and adds nothing to the rule it follows.
PATH_EXAMPLE_INLINE: shows a mapping as an inline `<source path> → <destination path>` pair inside the tag value over a fenced block — otherwise the example costs a block for one line of signal.
BLOCK_POLICY: earns a table or fenced block only for a shape no single tag can carry — a choice across several columns, a required field list, a nesting the reader must copy — and places it under the `##` subheading whose tags it serves — otherwise a block illustrates what its tag already said and the file pays a screen for it.
EVIDENCE_WITHOUT_COUNTS: cites the file, tree, or decision a rule came from and leaves out the measurement that will drift — a line count, a case total, a coverage percentage — over pinning the rule to a number nothing updates — otherwise the rule reads as stale the first time the code moves and its point gets discarded with its arithmetic.
CREATION_GATE: creates a rule file when the guidance is keyed to a path, a skill under `.claude/skills/` when it is keyed to a task the user asks for, and a `docs/` page for orientation or static reference — otherwise rules and skills fire on the same work and repeat each other.
AMEND_OVER_ADD: edits the tag that already owns the behaviour, and adds a tag only for an action no existing tag covers; splits the file by branch when one tree's tags outgrow the rest — otherwise a second tag half-covers the first and the two disagree on the next edit.
STALE_ANCHOR: repoints or deletes a rule whose cited path, variable, or ADR entry no longer exists rather than keeping the citation — otherwise a rule defends a boundary nothing declares any more.
DEDUP_POLICY: folds overlapping rules into the single strongest action, and lifts a rule two branches both need into their umbrella file over copying it — otherwise the copies drift and no reader can tell which is current.

# Validation

FRONTMATTER_CHECK: the frontmatter holds `paths` and nothing else, each glob quoted and relative to the repo root.
PATH_CHECK: each glob matches files that exist, or the file states that it governs a tree not yet written.
HEADING_CHECK: the first heading after the frontmatter is a `# ` title naming the tree, followed by the three required `#` sections and no prose outside a tag line.
TAG_CHECK: tag names are UPPER_SNAKE_CASE nouns; tag values hold a checkable predicate, not a noun-only fragment.
ACTION_CHECK: each Reasoning Principles and Output Shape value opens with a verb naming something an agent does to a file; each Validation value states a condition the finished file meets.
LAYER_CHECK: no rule appears in two files whose globs overlap; a rule both need lives in the umbrella file only.
ROUTING_CHECK: every rule that turns work away names the tree that work goes to instead.
ANCHOR_CHECK: each path, filename, variable, or ADR entry id cited in a rule exists in the workspace, or the rule marks it as pending.
DELETION_CHECK: each rule answers which specific future edit goes wrong if it is removed; rules without a specific defect are dropped or merged.
DENSITY_CHECK: the file holds only tag lines, section headings, optional `##` subheadings, and blocks that pass BLOCK_POLICY, with a tag count near the tree's real rule count rather than padded with generic writing advice.
DRIFT_CHECK: no rule rests on a count, percentage, or measurement that the next code change falsifies.
