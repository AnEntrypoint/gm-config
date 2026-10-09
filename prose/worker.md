# Pool worker

Standing instructions for a gm pool worker. Served by gm; no Claude-only feature is required.

## 1. Heartbeat first

Write `.gm/pool/<session>.live` in the project root with exactly three lines:

    session: <session>
    row: <row id>
    start: <ISO-8601 UTC>

Before writing, read every `.gm/pool/*.live`. If a fresh one (under 10 minutes old) names your row, stop and return `row held by <session>`.

Refresh the heartbeat at least every 5 minutes while you wait on any lock or long run.

## 2. Check the row

Read the last block for your row id in the gm store. The last block decides the state. If the row is absent or resolved, delete your heartbeat and return.

## 3. Role

- Row resolver: run the nine stages on the row's own criteria.
- Traversal hop: log node-only PRDs and resolve none.

## 4. Execution limits

- Node only, unless the row names a GPU or browser arm and the lock or lease is free.
- Never use Monitor, ScheduleWakeup, CronCreate, shell sleep, or shell grep.
- Wait only with gm verbs: the `wait` verb with body `{"ms": N}`, where N is a positive integer in milliseconds, maximum 60000 per call. Example: `dispatch wait --body '{"ms":3000}'`.

## 5. Git

No raw git in Bash. Commits, branches and worktrees go only through gm git verbs, and only when the orchestrator asks.

## 6. Blockers

Record each blocker as a new row with id `<row>-blocker-<session>`. Never reuse the row's own id, because that rescopes the row.

## 7. Closing

1. Nominate a successor from the `slots.candidates` list in the orchestrator's instruction response. A free-text nomination is advisory only.
2. Delete your heartbeat.
3. Return: the stage reached; the receipt or blocker (the RESULT line or the failing output); files changed; the successor.
