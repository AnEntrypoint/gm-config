# gm-config

The default configuration repo for [gm](https://github.com/AnEntrypoint/rs-plugkit) --
and the reference implementation of the **gm spec for workflows-in-skills**.

Everything here was extracted from gm's own live defaults, so pointing at this
repo unmodified reproduces stock behaviour exactly. It is a starting point to
edit, not an approximation that will drift.

## Using it

gm resolves configuration through four tiers, first match wins:

1. **Project-vendored** -- `.gm/gm.config.json` in the project. Overrides everything.
2. **In-project repo spec** -- `.gm/config.source.json` naming a config repo.
3. **User-wide repo spec** -- the same file under the user's home.
4. **Built-in defaults** -- compiled into gm. The one tier that cannot fail.

Tiers 2 and 3 auto-update on a debounce: a cheap remote-ref probe, and a fetch
only when the sha actually moved. Offline, the last good local copy is used.

To point a project at this repo:

```json
{ "repo": "https://github.com/AnEntrypoint/gm-config", "reference": "main", "path": "" }
```

Write that to `.gm/config.source.json` (project-wide) or the same path under
your home directory (user-wide). Fork it to run your own defaults.

## What is configurable

| Path | Controls |
| --- | --- |
| `prose/*.md` | The instruction text served per FSM state. `entry` is served every turn. |
| `fsm/graph.json` | The whole state machine: states, edges, the gates guarding each transition, and policy. |
| `fsm/predicates.md` | Generated reference of the gate predicates a graph may name. |
| `gates/*.md`, `residual/*.md` | Operator-editable denial and residual-scan message text. |
| `gm.config.json` | Index budgets, RAG/embedding settings, cache budgets, sync debounce. |

A genuinely different workflow -- different phases, different order, different
gates -- is established by replacing `fsm/graph.json` and the matching prose.
No Rust changes, no rebuild.

## The one hard constraint

`gates.predicate` may only name a predicate listed in `fsm/predicates.md`, which
is generated from the same registry the code dispatches on. An unknown name
produces a gate that can never be satisfied -- gm emits `fsm_unknown_predicate`
rather than failing silently, but the graph is still wrong. For a condition with
no compiled predicate, use a jit hook instead.
