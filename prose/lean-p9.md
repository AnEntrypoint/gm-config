# LEAN-P9 CONVERGENCE

CONVERGENCE decides whether the sweep has reached its least fixed point. The sweep re-walks the whole artifact after the contract is recorded (G_DONE to G_SWEEP), and each sweep is checked for monotonic improvement, for regressions against earlier sweeps, for a variant that decreases, and for bounded retries. The phase ends in exactly one of two lean terminals. G_FIXPOINT is reached when a sweep changed nothing. G_SURFACE is reached when the variant did not decrease, or when one condition fired twice with no new information, and the ambiguity then belongs to a person and is not swept again. The walk stops only at phase COMPLETE with prd_pending of zero, reached through `transition to=COMPLETE`, and the final dispatch of the turn is `Skill(skill="gm-continue")`.

Principles in this phase are applied as work, from the lean method (AnEntrypoint/lean, skills/lean/SKILL.md). Each principle's book and attribution is the label in its H3 heading, taken from fsm/graph.json.

## Verbs

A sweep begins with `phase-status`, which reports the current phase and `prd_pending`. Every sweep reads the open set with `mutable-list` and `prd-list`, and records the counts. The measures of each sweep are recorded with `memorize-fire` only as a dated sweep record, and they are re-derived from the ledger on each sweep rather than supplied from memory. Re-run any witness the regression set names by its exact original dispatch: an `exec_js` run, a `codesearch` literal with its path scope, or a `callers` call. A proxy witness is not accepted in its place.

When a sweep's claim depends on a policy or strategy choice, the incumbent is replayed against each challenger with `dream-replay`, over the same recorded worlds. A profile is taken with `exec_js` using `profile:true` to locate a cost, and then a live measurement confirms it. `codeinsight {action:"hotspots"}` and `{action:"orphans"}` answer the cleanup side of the sweep. Resolve each condition with `mutable-resolve {mutable_id, witness_evidence}` or `prd-resolve {id, witness_evidence}`, and resolve a resource-bound mutable with a `measured_value` that is checked against its bound.

Before the walk stops, dispatch `residual-scan`. It refuses without its fired marker and its denial names `residual-scan` as the next dispatch. `claim-audit` checks the claims the walk made. Then `transition to=COMPLETE`. A gate that is false is answered by the recovery verb it names (`git_finalize`, `residual-scan`, `claim-audit`, or the CI-watching verb), never by a bare retry of the transition.

Nothing in this phase dispatches Glob, Grep, `find`, a shell `grep`, Bash git or PowerShell. Search goes through `codesearch`, `grep` and `codeinsight`. Git goes through the `git_*` verbs, and execution goes through `exec_js`.

## PRD rows

A condition that a sweep finds open is a PRD row at the moment it is found, added with `prd-add`. The row names the condition, the gate or measure it breaks, and the witness that closes it. Each row is closed only by `prd-resolve` with a witness that is re-run on the live tree. A need is either a row now or it is not a need. A row or transition note in this phase never carries deferral wording: no phrase that pushes the work to an unnamed time, to another session, or outside the scope, and no hedge. A row that cannot close keeps its witness condition and its reason inside the row, and stays pending. The sweep does not close while a row is pending.

## Mutables

The variant is measured over the open mutables and the open PRD rows. A condition in a sweep becomes a mutable with `mutable-add`, using the `obligation_kind` of the phase that discharges it. This phase owns no obligation kind. Set `depends_on` so that resolution runs in dependency order, because `mutable-resolve` refuses to resolve a row while a `depends_on` id is still pending, and it names the blocking id. The sweep closure needs zero pending rows.

The two-pass rule is the bounded-retry rule of this phase. A mutable that survives two genuine resolution attempts without a witness is not attempted a third time under the same approach. It is re-added as a new mutable with a new id naming the gap, and the reclassification routes the walk to the CONTRACT gate (G_CONTRACT). A condition that fires twice in a row with no new information is not re-added. It goes to G_SURFACE, where the ambiguity becomes an ADR row for a person. The gate-repeat escalation is a separate rule: an identical gate denial repeated up to `gate_repeat_escalate_threshold` (default 3) escalates, and the walk stops retrying that transition blind.

## Principles

### FIXPOINT - Least Fixed Point - Kleene and Tarski

Each sweep recomputes the measures of the whole artifact: the current predicate of each lean gate, the open mutables, the open PRD rows, the `residual-scan` result, the tension count, and the context-spend measure. The sweep is recorded with its measures and its sha. A sweep that changed nothing is one whose measures equal the previous sweep's measures exactly. When that holds, the walk takes FIXPOINT to G_FIXPOINT. A change is routed to MONOTONE (the edge "the sweep produced a change"), and the sweep repeats after the change is witnessed. Witness: the two consecutive recorded measure sets, with the diff between them empty for G_FIXPOINT.

### MONOTONE - Monotonic Improvement Only

A sweep's change is accepted only when every measure that improved stays improved and no fixed condition has been traded for a new one. The phase compares each measure with the previous sweep's value. A measure that moved the wrong way is the backreference MONOTONE to REGRESSGUARD ("a measure moved the wrong way"). Where the change selects a policy or strategy, the incumbent is replayed with `dream-replay` against each challenger on the same recorded worlds. A challenger replaces the incumbent only with a strictly higher score over those worlds, and a tie keeps the incumbent. Witness: the measure diff with no wrong-way entry, or the `dream-replay` scores of the incumbent and the challenger over the same world set.

### REGRESSGUARD - No Regression Across Sweeps

The phase keeps a regression set: each condition that an earlier sweep closed with a witness. Each sweep re-runs the exact witness for each member of that set, using the original dispatch: the `exec_js` run, the literal search with its path scope, or the `callers` call. A member that fails again is the backreference REGRESSGUARD to INVARIANTRUN ("an earlier sweep's gain was lost"), and the invariant is run over the call sequence that broke it. Witness: the recorded re-run output for every member, and any failing member is named with its `file:line`.

### VARIANT - Well-Founded Variant - Robert Floyd

The variant is the count of open conditions: open mutables, open PRD rows and unresolved tension firings. The count is taken by the same query on every sweep (`mutable-list`, `prd-list`, and the tension count from the sweep), and it is recorded as a non-negative integer. A sweep that does not reduce it has the backreference VARIANT to BOUNDEDRETRY ("the open-condition count did not fall"). The variant is what makes the loop terminate, so the phase computes it and does not describe it in prose. The graph draws VARIANT to G_SURFACE as its forward edge, so the decrease is checked at VARIANT: the walk goes to G_SURFACE when the count did not fall, and the next sweep runs when it did. Witness: the two recorded counts with the query that produced each.

### BOUNDEDRETRY - Bounded Retry, Then Surface

This is the two-pass rule as a principle. A mutable or PRD row that survives two genuine resolution attempts without a witness is not attempted a third time. It is re-added with `mutable-add` as a new row with a new id naming the gap, and its reclassification routes the walk to the CONTRACT gate. When the same condition fires twice with no new information, the backreference BOUNDEDRETRY to G_SURFACE ("the same condition fired twice with no new information") is taken. G_SURFACE is a terminal. The ambiguity is recorded as an ADR row, which the graph routes through G_SURFACE to ADRN ("the ambiguity is human-owned"), and the sweep is not run again. Witness: the attempt count per mutable id from `mutable-list`, and for a surfaced condition the ADR row that names the decision a person must make.

### RICE - Rice's Theorem - Henry Gordon Rice

No analyser decides an arbitrary semantic property, so a sweep can confirm the absence of found defects but never the absence of defects. Each property the sweep claims is recorded with the decider that establishes it: the type checker, the linter, a literal search with `exhaustive: true`, or a live `exec_js` witness on the real artifact. A claim that no decider establishes and no live witness covers is not counted as closed. The graph routes it through the backreference RICE to BOUNDEDRETRY ("no analyser decides the property"). Witness: the claim list in which every entry names its decider, and each unnamed claim is an open mutable.

### HALTING - Halting Problem - Alan Turing

The sweep's termination is not established by running it longer. It is established by the variant (the backreference HALTING to VARIANT, "no analyser decides termination of the sweep"). Every iteration has a declared bound. Each exhaustive search carries `max_matches`, `max_files` or a `path` scope. Each indexing call carries its file limit. The sweep carries a maximum number of iterations. A sweep that hits a bound without a decreasing variant is routed to VARIANT, and it is not run again without a new condition. Witness: each sweep records the bound on each dispatch and the `exhaustive` value of each search, and the variant record shows the bound was not the reason the count fell.

### LEHMAN - Lehman's Laws of Software Evolution - Meir Lehman

A fixed point is provisional. It holds only while the environment it was reached in holds. The phase records the environment as a list of items with a hash each: the dependency versions named in the manifest, the platforms in the CI matrix, the consumers `callers` returns for the changed symbols, and the tool and model versions in the project config. Each sweep compares the recorded hashes with the current ones. When any item changed, the backreference LEHMAN to G_START ("the environment changed under a converged system") is taken, and the walk re-enters with one task in flight. Witness: the environment record with its hashes, and the comparison result recorded on each sweep.

### KNUTHOPT - Premature Optimization - Donald Knuth

An optimization is admitted only by a measurement. `exec_js` with `profile:true` returns the worst-N `file:line` self-time, which locates the cost. A live measurement of the change confirms the gain on the same input the profile used. A resource-bound mutable carries a numeric `bound`, and `mutable-resolve` accepts a `measured_value` and refuses the resolution when the value exceeds the bound, naming both numbers. A budget that sits above its known floor fires the backreference G_SWEEP to KNUTHOPT ("a budget sits above its floor"), and the profile either supports the floor or contradicts it, in which case the walk takes the backreference KNUTHOPT to G_SWEEP ("the profile contradicts the assumption"). Witness: the profile output and the `measured_value` with its bound, both recorded on the mutable.

### LOWERBOUND - Lower Bound Reached - information-theoretic argument

A cost that sits at its floor is not improved further. The floor is the minimum the contract requires: the single owning copy of a fact, the minimal set of conditions a proof needs, the smallest size a measured artifact can reach. The phase states the floor with its argument and the measured value that reaches it. The forward edge KNUTHOPT to LOWERBOUND takes the walk here once a floor is measured. The backreference LOWERBOUND to G_FIXPOINT ("the bound is already reached, stop here") is then taken, so the terminal stands. A floor claimed without a measured value is rejected and returns to KNUTHOPT. Witness: the measured value, the argument that names it as the floor, and the sweep record that accepts it.

## Witness

The phase closes at one of its two terminals, and each has its own witness. G_FIXPOINT requires that the measure set of two consecutive sweeps is identical, that the regression set re-ran with every member passing, that `residual-scan` returned an empty result, and that `prd_pending` is zero. G_SURFACE requires the variant values of the last two sweeps, the condition that fired twice, and the ADR row that hands the decision to a person. A generic "converged", "complete" or "all good" is rejected. The terminal reached is the terminal recorded, and no other word stands in for it.

## Memorize

`memorize-fire` records the surfaced ambiguity with the decision a person must make, in the project memory type, so that a resuming session does not sweep it again blind. It records the environment hashes of LEHMAN so that a following comparison has its baseline, and the measure set of a fixed point with its sha. `memorize-prune {key}` removes a recorded sweep or environment entry that the live tree has contradicted. Not memorized: the sweep counts themselves, which are re-derived from the ledger on each sweep, the PRD text (which lives in `prd.yml`), and the gate states, which the gates report.

## Transition

The sweep is entered from G_DONE, and G_DONE is reached only through its gate `lean-contract-recorded`, which refuses while a PRD row is open or the worktree is dirty. From G_SWEEP every backreference that fires is taken, and the walk re-walks from where it lands: G_START when a gate reopened, G_INDEP when a property was falsified, KNUTHOPT when a budget sits above its floor, G_NET when the artifact grew, SMALLESTSET when context spend rose per unit of change, and OUSTERHOUTC when a tension fired. The forward edge G_SWEEP to FIXPOINT starts the measure of this sweep. FIXPOINT leads to G_FIXPOINT when nothing changed, and G_FIXPOINT leads back to G_SWEEP when a subsequent sweep reopened a gate.

COMPLETE rule. The walk stops only when the chain reports phase COMPLETE with `prd_pending` of zero. Reaching G_FIXPOINT or G_SURFACE is the lean terminal, and it is not the end of the chain by itself. Every turn that is not at COMPLETE with zero pending rows ends in a verb dispatch, never in a summary, a recap, or a sentence that names the next move without making it. A turn that wants to stop first dispatches `phase-status`. If the phase is not COMPLETE or rows are pending, the walk is in flight: dispatch `instruction` and keep walking. At G_FIXPOINT, dispatch `residual-scan`, then `transition to=COMPLETE`. The handler accepts the transition only when the closure set holds: prd-all-closed, mutables-all-resolved, worktree-clean, residual-scan-fired, ci-validated-fresh, submodules-clean, claim-audit-clean, no-hedge-language-in-diff and split-context-swept. When a closure gate is false, dispatch the recovery verb it names. When `transition to=COMPLETE` returns phase COMPLETE, the last dispatch of the turn is `Skill(skill="gm-continue")`. That skill checks for remaining work and either reloads gm or confirms the loop closed, and the turn ends only after it.

At G_SURFACE the walk does not sweep again. The ambiguity is recorded as an ADR row with `prd-add`, which names the decision a person must make. The turn then ends with the `Skill(skill="gm-continue")` dispatch, which confirms that the open row belongs to a person and does not reopen the sweep. A gate denial anywhere in this phase names its `next_dispatch` in its reason. Dispatch that verb next. Repeated identical denials escalate at `gate_repeat_escalate_threshold` (default 3), and at that point the walk stops retrying the transition and dispatches the recovery the escalation names.
