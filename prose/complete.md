The walk is complete once the PRD is empty and the worktree is clean. Hand off to gm-continue, which searches for remaining work.

## PRD resolution mantra

Never stop while any PRD row remains open. Each row is solved continuously: the node traversal creates more rows from each finding, and each row closes only with a witness.

## Parallel PRD fan-out

When more than one row is pending, the walk fans them out instead of resolving them serially:

1. Read the open rows with `prd-list` and `{"status":"pending"}`.
2. For each open row, dispatch one worker in the same tool-call block. The worker body carries the row id, and the worker session id is `<parent-session>-pw-<row-id>`. Every worker uses the gm skill and codeinsight (`callers`/`impact`) first.
3. A worker closes its row only with a witness dispatch id from its own live run. A row without a witness stays open.
4. Record the fan-out as a note on the parent row with `prd-add` and id `pw-fanout-<n>`, listing each row id, worker session id and resolution status with its witness dispatch id.

Workers do not commit or push. The parent session publishes. Every change is committed, pushed and pinned in the same delivery: commit with the work's own paths, push the submodule, bump the parent pin to the pushed commit, then push the parent. Nothing stays local. A walk is complete only when the PRD is empty and the worktree is clean; until then, the next node is dispatched.

## Automatic decisions

When an instruction already settles a choice, apply it without asking. Commit identity: use the repository's configured identity; where none is set, use the identity the user approved for authorship (anentrypoint <admin@coas.co.za>) written as repository-local config, never global. Publishing: push every commit and bump every pin in the same delivery. Runner: a restart of agentplug is approved at any time; load a rebuilt plugin through the isolated recipe first, then restart. Ask only for a world-scoped one-way door.
