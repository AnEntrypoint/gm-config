# gm-config

The default configuration repo for [gm](https://github.com/AnEntrypoint/rs-plugkit) --
and the reference implementation of the **gm spec for workflows-in-skills**.

## This repo is generated

Every artifact under `prose/`, `gates/`, `residual/`, `fsm/` and `hooks/` is a
generated snapshot of gm's own compiled-in defaults. Nothing here is authored by
hand, and a hand edit to any of those paths is overwritten by the next sync.

`scripts/sync-from-plugkit.mjs` produces the snapshot. It materializes the
compiled defaults by dispatching gm's `fsm-vendor` verb into a scratch directory,
then maps the resulting `.gm/instructions/` tree onto the layout this repo's own
`gm.config.json` declares. `.github/workflows/sync-from-plugkit.yml` runs it daily
and on manual dispatch, opening a pull request whenever the snapshot moves.

### Where each artifact comes from

| Artifact | Source of truth |
| --- | --- |
| `prose/*.md` | `crates/plugkit-core/src/orchestrator/instructions/prose/*.md` in rs-plugkit, `include_str!`'d into the binary at build time. |
| `gates/*.md` | Rust string constants in `crates/plugkit-core/src/gates.rs`, bound to their key by the `prose::resolve_and_mark("gates/<key>", ...)` call site. |
| `residual/*.md` | Rust string constants in `crates/plugkit-core/src/orchestrator/residual.rs`, bound the same way. |
| `fsm/graph.json` | `fsm.rs::default_graph()`, serialized by `default_graph_json_pretty()`. There is no graph file in rs-plugkit -- the graph is compiled Rust, and `fsm-vendor` is the only thing that ever writes it to disk. |
| `fsm/predicates.md` | Generated from `transitions::known_predicates()`, the same registry `predicate_result()` dispatches on. |
| `hooks/example.js` | Scaffolded by `fsm-vendor` alongside the graph. |

Only `prose/*.md` exists as a file upstream. Everything else is compiled data with
no source file to copy, which is why the generator drives `fsm-vendor` rather than
copying a directory.

### Why the generator drives a released build, and what checks that

`fsm-vendor` reads the defaults out of the running `plugkit.wasm`, which reaches a
machine through the release cascade rather than from a local checkout. Between an
rs-plugkit push and the matching published build, the two legitimately disagree.

So the generator takes an optional `--rs-plugkit <checkout>` and compares every
prose key against that checkout before writing anything. A mismatch aborts the run
with the keys named, rather than recording a lagging build's text as authoritative.
CI always passes it. Run `--check` to report drift without writing, exiting non-zero
when the snapshot is behind.

## How gm consumes this repo

Point a project or a whole user at it by writing `.gm/config.source.json`:

```json
{ "repo": "https://github.com/AnEntrypoint/gm-config", "reference": "main", "path": "" }
```

Write it in the project (project-wide) or under your home directory (user-wide).
gm clones the repo into `.gm/config-source-cache` and re-checks it on a debounce:
a cheap remote-ref probe, and a fetch only when the sha actually moved. Offline,
the last good local copy is used.

Three separate resolution chains then read the cache. Each is per-key, and each
falls through to the compiled default, so overriding one key leaves every other
key on its default.

**Prose, gate text and residual text** (`prose::resolve`), first non-empty wins:

1. `.gm/instructions/<key>.md` in the project.
2. `<cache>/<instructions.dir>/<key>.md` -- `instructions.dir` is `prose` here.
3. The compiled default.

**The FSM graph** (`fsm::graph`), first usable wins:

1. `.gm/instructions/fsm/graph.json` in the project.
2. `<cache>/<fsm.graph>` -- note this pointer is relative to the cache root, not
   to `instructions.dir`, which is why `fsm/` sits at the top level here.
3. The compiled default.

A vendored graph replaces the default **wholesale**; there is no merge. A tier that
parses but fails validation is reported and the compiled default serves, so a broken
graph is never quietly replaced by a different author's working one.

**Config values** (`gm.config.json`) resolve through four tiers: project-vendored
`.gm/gm.config.json`, the in-project repo spec, the user-wide repo spec, then the
built-in defaults.

Gate hooks execute **only** from the project-vendored tier. A hook arriving from a
config repo is refused and its gate falls back to predicate-only, because a repo
that can change without a local commit would otherwise be remote code execution on
every gate evaluation.

## What is configurable

| Path | Controls |
| --- | --- |
| `prose/*.md` | The instruction text served per FSM state. `entry` is served every turn, every phase. |
| `fsm/graph.json` | The whole state machine: states, edges, the gates guarding each transition, and policy. |
| `fsm/predicates.md` | Generated reference of the gate predicates a graph may name. |
| `gates/*.md`, `residual/*.md` | Operator-editable denial and residual-scan message text. |
| `hooks/*.js` | Jit gate hooks, for conditions no compiled predicate covers. |
| `gm.config.json` | Index budgets, RAG/embedding settings, cache budgets, sync debounce. |

A genuinely different workflow -- different phases, different order, different
gates -- is established by replacing `fsm/graph.json` and the matching prose.
No Rust changes, no rebuild. Fork this repo to run your own defaults; this copy
tracks stock behaviour exactly and is regenerated over the top of any edit.

## Two ways an override silently does nothing

**A dropped placeholder.** Several defaults carry `{token}` placeholders that the
caller substitutes *after* resolution: `{gap_ms}` and `{threshold_ms}` in
`gates/long-gap-no-instruction.md`, `{modified}` and `{untracked}` in
`residual/dirty-tree.md`. An override that hardcodes a value where a token belongs
still renders, just with a number that no longer tracks the policy it claims to
report.

**An unknown predicate.** `gates.predicate` may only name a predicate listed in
`fsm/predicates.md`, which is generated from the same registry the code dispatches
on. An unknown name produces a gate that can never be satisfied -- gm emits
`fsm_unknown_predicate` rather than failing silently, but the graph is still wrong.
For a condition with no compiled predicate, use a jit hook instead.

## Known limitation: gates/ and residual/ are not reachable from the config-repo tier

`prose::resolve` builds its config-repo path as `<cache>/<instructions.dir>/<key>.md`.
With `instructions.dir` set to `prose`, the keys `gates/long-gap-no-instruction` and
`residual/prd-open` resolve to `<cache>/prose/gates/...` and `<cache>/prose/residual/...`,
not to the top-level `gates/` and `residual/` directories this repo stores them in.
`gm.config.json` declares `messages.gates_dir` and `messages.residual_dir`, but no
code in rs-plugkit reads either key -- they appear only in the known-key allowlist.

The practical effect is that the gate and residual text here is an accurate,
regenerated record of the compiled defaults, and is served correctly when vendored
into a project's own `.gm/instructions/`, but a project pointed at this repo as a
config source keeps the compiled defaults for those two families. The prose and FSM
graph tiers are unaffected. Resolving this needs a decision in rs-plugkit about
whether `messages.*` should be honoured, so it is recorded here rather than worked
around by duplicating files into a second location.
