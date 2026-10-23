# KiStack Pro Kit

Everything in the free Starter Kit, plus the parts that take weeks to assemble by hand:

| Folder | Contents |
|---|---|
| `fab-profiles/` | Capability profiles for JLCPCB, PCBWay, OSH Park, Aisler, Eurocircuits as JSON (agents read them) plus ready-to-use KiCad `.kicad_dru` rule files per fab and process. Every number cited with URL and date. |
| `board-classes/` | Pre-filled `DESIGN-CONSTRAINTS.md` for five common board types: 2-layer MCU, 4-layer MCU with USB and Ethernet, 2.4 GHz RF module board, DC-DC power board, precision analog sensor board. |
| `agent-files/` | Full `CLAUDE.md` / `AGENTS.md` with per-agent notes for Claude Code, Codex CLI and OpenCode, plus a `CHANGES.md` template. |
| `prompts/` | Prompt sequences for review sessions, placement proposals, net class setup, Gerber review and respin diffs. |
| `tools/kistack-review/` | CLI that runs KiCad DRC/ERC/BOM, compares your project rules against the fab profile and writes a report plus an agent prompt. |

## Install in a project

```bash
cp kit-pro/agent-files/CLAUDE.md my-board/CLAUDE.md
cp my-board/CLAUDE.md my-board/AGENTS.md
cp kit-pro/board-classes/4l-mcu-usb-ethernet.md my-board/DESIGN-CONSTRAINTS.md   # pick your class
cp kit-pro/fab-profiles/dru/jlcpcb-standard-4l.kicad_dru my-board/my-board.kicad_dru  # name must match the project
cp kit-pro/agent-files/CHANGES.md my-board/docs/CHANGES.md
pipx install ./kit-pro/tools/kistack-review
cd my-board && kistack-review --board my-board.kicad_pcb --schematic my-board.kicad_sch --project my-board.kicad_pro --fab jlcpcb --process standard-4l --out review/
```

Then in your agent: `Read CLAUDE.md, DESIGN-CONSTRAINTS.md and review/AGENT_PROMPT.md and start.`

## Updates
Fab capabilities change. Profiles carry a `retrieved` date; the `CHANGELOG.md` in `fab-profiles/` lists every revision.
Buyers get 12 months of updates through the download link in the purchase email.

## Licence
Single-user commercial licence, see `LICENSE`. Use in any number of your own or your employer's projects.
Do not redistribute the kit itself. The free Starter Kit files remain MIT.

Independent product, not affiliated with the KiCad project, any fab, or any skill pack author.
