# Constraints and the requirement chain

Load with `SKILL.md` for SCOPE_MATCH and SCOPE_NAMED_BY_SUBJECT. This file holds
where a boundary value lives, what earns the right to become one, and the
constraint → example → spec chain that keeps it honest.

# Principles

CONSTRAINTS_ARE_SHARED: every boundary value lives in `constraints/`, imported by the app, the examples, the specs, and the static-analysis rules, and cited by name in ADR and WIP entries — otherwise the same boundary is restated per consumer and the copies drift
SINGLE_OWNER: check `constraints/` for an existing variable stating the same boundary before adding a new one, and import it instead of redeclaring it — otherwise two variables drift apart and no reader knows which is canonical
CHAIN_INTEGRITY: carry a constraint variable unbroken through the example's fields into the spec's title and assertion, referencing it rather than restating its value as a bare literal at any point — otherwise a mid-chain literal becomes an orphan value no constraint governs and a later boundary change misses it
FILE_SEPARATION: never mix roles inside one file — a constraints file holds no example data, an examples file holds no assertions, a spec file holds no raw boundary literals — otherwise a single file drifts back into an unstructured notes file and the chain breaks
REQUIREMENT_BAR: capture an implementation-level detail as a requirement only when it clears ADR_SCOPE's spirit (it encodes a business rule, not a technical implementation detail), is non-obvious from reading the resulting code, would cost real rework or a defect if forgotten, and would recur for the next person touching this area — otherwise routine implementation chatter piles up as noise nobody reads
REQUIREMENT_SOURCE: capture a requirement from a decision actually made in conversation — a stated business rule, an agreed tradeoff, a discovered domain edge case, a rejected alternative — never from an assumption about what "should" be true — otherwise the log records guesses instead of ground truth
EPHEMERAL_EXCLUSION: exclude task-local detail that dies with the task (a variable name picked this session, a temporary workaround, a one-off data fix) in favor of anything reusable beyond the current change — otherwise the requirements log fills with scratch notes
DERIVABLE_EXCLUSION: exclude anything a future reader could recover by reading the code, specs, or types — otherwise the log duplicates the code and rots the first time either changes
STAY_LEAN: fold a requirement that no longer applies into routine convention or retire it
NOT_EVERY_LITERAL: a value is a constraint when something outside its declaration must agree with it — the app and a spec, two modules, a rule and a threshold; a value used in exactly one place, or one that is descriptive rather than bounding (a label, a sample sentence, a colour), stays where it is — otherwise `constraints/` fills with indirection nobody needed

# Method

CONSTRAINT_AS_VARIABLE: declare each boundary value, format, or enum once as a named variable/constant in `constraints/`, never as a prose sentence — otherwise the boundary has no single machine-checkable source and drifts from whatever code enforces it
CONSTRAINT_PLACEMENT: put a boundary in the constraints file named for its owner — `<module>.constraints.<ext>`, `<domain>.constraints.<ext>`, or `<concern>.constraints.<ext>` — importing rather than redeclaring across the line
CONSTRAINT_SPLIT_BY_OWNER: when one file accumulates boundaries belonging to several subjects, split it by owning subject rather than letting a `limits`/`config` grab-bag stand; a consumer that needs several may compose them behind one aggregate re-export, which declares nothing itself
EXAMPLE_OWN_FILE: place named example data instances under `reqs/<scope>-examples/<mirrored-path>/<area>.examples.<ext>` (scope = unit/integration/e2e), each boundary-bearing field composed from constraint variables and never a raw literal — otherwise example data and boundary truth are edited independently and go out of sync
SPEC_IS_EXECUTABLE: express the requirement as a runnable check under `reqs/<scope>/<mirrored-path>/<area>.spec.<ext>`, with a title stating the rule in plain language and an assertion that references the example instance and constraint variable directly — otherwise the requirement is unverifiable prose that silently goes stale as the code changes under it
REQUIREMENT_LAYOUT: place the trio of files for one area at the smallest scope that fully contains the requirement — `constraints/<owner>.constraints.<ext>`, `reqs/<scope>-examples/<mirrored-path>/<area>.examples.<ext>`, `reqs/<scope>/<mirrored-path>/<area>.spec.<ext>`
CONSTRAINT_REACHES_ITS_CONSUMERS: before declaring a constraint, confirm every consumer can actually import it at run time — the packaged app included (NESTED_APP_ROOT); where one cannot (a manifest, a JSON config, a generated file), add a cross-functional check asserting its copy agrees, rather than leaving the copies unwatched

# Validation

VARIABLE_CHECK: each constraint is a single named variable in `constraints/`, not a literal hardcoded in the app, an example, a spec, or a rule config
CONSTRAINT_PLACEMENT_CHECK: a boundary sits in the constraints file named for its owning module, domain, or concern; none redeclares another's value
SINGLE_OWNER_CHECK: no two constraint variables state the same boundary; a duplicate is merged into the existing variable and imports replace the copy
CHAIN_CHECK: every value asserted in a spec traces constraint variable → example field → spec assertion unbroken; a literal that could trace to a constraint but doesn't is extracted into `constraints/` instead of left as an orphan
FILE_SEPARATION_CHECK: constraints, examples, and specs live in three separate files; none mixes another's role
REQUIREMENT_BAR_CHECK: each requirement clears REQUIREMENT_BAR — a business rule (not a technical detail), non-obvious, costly if forgotten, and recurring; requirements that fail are dropped or folded into a code comment instead
CONSTRAINT_REACH_CHECK: every consumer of a constraint imports it at run time, or a cross-functional check under `reqs/cross` asserts the copy it cannot import still agrees
