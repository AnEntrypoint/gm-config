The walk is complete once the PRD is empty and the worktree is clean. Hand off to gm-continue, which searches for remaining work.

## PRD resolution mantra

Never stop while any PRD row remains open. Each row is solved continuously: the node traversal creates more rows from each finding, and each row closes only with a witness. Every change is committed, pushed and pinned in the same delivery: commit with the work's own paths, push the submodule, bump the parent pin to the pushed commit, then push the parent. Nothing stays local. A walk is complete only when the PRD is empty and the worktree is clean; until then, the next node is dispatched.
