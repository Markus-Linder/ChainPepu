# KiCad Agent Starter Kit (free)

Four files that make any KiCad skill pack (KiStack, Ki-Stack, kicad-happy, KiCad MCP servers) behave
better with Claude Code, Codex CLI or OpenCode. Drop them into the root of your KiCad project.

| File | Put it at | What it does |
|---|---|---|
| `CLAUDE.md` | `<project>/CLAUDE.md` (also copy to `AGENTS.md` for Codex/OpenCode) | Tells the agent how this project works and what it must ask before changing |
| `DESIGN-CONSTRAINTS.md` | `<project>/DESIGN-CONSTRAINTS.md` | Machine-readable design intent: signal groups, impedances, keep-outs, placement rules, fab profile |
| `REVIEW-CHECKLIST.md` | `<project>/docs/REVIEW-CHECKLIST.md` | Pre-fab checklist the agent walks through item by item and reports on |
| `JLCPCB-BOM-WORKFLOW.md` | anywhere | Prompt sequence for basic/extended part optimisation and stock checks |

## 60-second setup

```bash
cd my-board/
cp /path/to/kit/CLAUDE.md .
cp CLAUDE.md AGENTS.md            # Codex CLI and OpenCode read this name
cp /path/to/kit/DESIGN-CONSTRAINTS.md .
mkdir -p docs && cp /path/to/kit/REVIEW-CHECKLIST.md docs/
```

Then fill in the `TODO` lines in `CLAUDE.md` and `DESIGN-CONSTRAINTS.md` (10 minutes, once per project) and start your agent:

```
> Read CLAUDE.md and DESIGN-CONSTRAINTS.md. Then run the review checklist in docs/REVIEW-CHECKLIST.md
  against this board and report item by item. Do not edit any file yet.
```

## Why these files exist

Engineers who tried agents on real boards report the same three failures: the agent has no idea *why*
a part sits where it sits, it edits confidently without asking, and it agrees with whatever framing the
question had. These files fix the first two mechanically and reduce the third by forcing a checklist
instead of an open question.

Independent project, not affiliated with the KiCad project or any skill pack author. MIT licensed, use freely.
More at https://kistack.io
