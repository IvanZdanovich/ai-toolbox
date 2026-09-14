# Static code analysis rules

Load with `SKILL.md` for RULE_LIVENESS, RULES_IN_CI and EMPTY_RULE_GUARD, which
govern every rule here. This file holds where rules live, what they may read,
and how a boundary gets enforced.

# Principles

APPROACH_IS_EXECUTABLE: express the project's code-writing approach (naming, file size, complexity, allowed idioms, import direction) as static-analysis rules under `reqs/rules`, not as prose guidance — otherwise the approach holds only while someone remembers it, and context pressure erodes agent compliance over a long session
BOUNDARY_ENFORCEMENT_MECHANICAL: back every module/architectural boundary with an automated lint or dependency-graph rule under `reqs/rules` (e.g. dependency-cruiser, ArchUnitTS), not prose alone, added or updated in the same change that records the decision — otherwise the boundary quietly regresses to whatever the code happens to do
ENFORCE_EVERY_FORM: a rule must cover every syntactic form of the thing it blocks — static and dynamic import, require and import(), re-export and direct export, decorator and call — and the form it cannot see is named in the decision as a known gap — otherwise callers migrate to the uncovered form and the rule reports clean
REVERSE_BOUNDARY: pair a module's public-entry allow-list with a reverse deny-rule blocking external files from importing anything but that entry point — otherwise an external consumer reaches past the public API unnoticed
BOUNDARY_ROLLOUT: land a new enforcement rule scoped to one directory or module at a time, expanding to siblings only after the first is green — otherwise a codebase-wide enforcement change stalls in merge conflicts across every team touching the tree
BOUNDARY_PERMANENCE: block any change that deletes or weakens an existing rule file under `reqs/rules` unless it links a superseding ADR entry — otherwise deadline pressure quietly strips guardrails to get code merged

# Method

RULES_STORAGE: store every static-analysis and dependency-graph rule under `reqs/rules`, named after what it governs — `<module>.boundary.<ext>` for one module's allow-list and reverse deny-rule, `<concern>.rules.<ext>` for a code-writing rule that spans the codebase
RULES_THIN_LOADER: where a tool insists on discovering its config at a fixed path, leave a loader at that path that only imports and composes the files under `reqs/rules` — it declares no rule of its own — otherwise RULES_STORAGE is satisfied on paper while the rules that matter stay at the root
RULES_FROM_CONSTRAINTS: read thresholds and enumerations a rule enforces (max file size, allowed layers, permitted import roots) from `constraints/`, never as literals inside the rule config
RULES_NOT_PROSE: when the conversation settles a code-writing convention, add or extend the matching rule file in the same change rather than writing the convention into a doc — a convention with no rule file is not part of the approach
RULES_FAIL_LOUD: configure each rule to error, not warn, and to fail when its pattern matches zero files
RULES_ROLLOUT: land a new rule scoped to one directory or module, expand to siblings once green, and record the eventual codebase-wide scope as an ADR entry
RULES_PROVE_BEFORE_TRUST: after adding or editing a rule, write the violation it targets, confirm the gate exits non-zero, and revert — a rule is not landed until it has failed once on purpose (RULE_LIVENESS)

# Validation

RULES_LOCATION_CHECK: every static-analysis, lint, and dependency-graph rule the project enforces lives under `reqs/rules`, named for what it governs; any config at a tool-mandated path is a loader holding no rules of its own
RULES_SOURCE_CHECK: a rule's thresholds and enumerations import from `constraints/` rather than hardcoding literals in the rule config
RULES_SEVERITY_CHECK: each rule errors rather than warns, and fails when its pattern matches zero files
GLOB_EXPANSION_CHECK: a rule invoked through a shell or package script quotes its globs so the tool expands them, not the shell — an unquoted `**` silently narrows the file set under `sh`
THRESHOLD_DEFAULTS_CHECK: overriding a tool's include/exclude or threshold config replaces its defaults rather than extending them — the resulting file set is verified, not assumed
APPROACH_CHECK: a code-writing convention agreed in conversation appears as a rule file under `reqs/rules`, not only as prose in a doc
BOUNDARY_ENFORCEMENT_CHECK: a recorded boundary decision has a matching rule file under `reqs/rules`, not prose alone
EVERY_FORM_CHECK: the rule fires on each syntactic form of what it blocks, and any form it provably cannot see is named as a known gap in the ADR entry that records the boundary
REVERSE_CHECK: each module's public-entry allow-list has a matching reverse rule blocking external files from importing its internals directly
ROLLOUT_CHECK: a new enforcement rule targets one directory/module rather than a codebase-wide sweep, unless it has already proven green elsewhere
PERMANENCE_CHECK: a change deleting or weakening an existing rule file links a superseding ADR entry; otherwise it is rejected
