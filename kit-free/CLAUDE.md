# Project instructions for AI agents (hardware / KiCad)

<!-- Copy this file to CLAUDE.md (Claude Code) and AGENTS.md (Codex CLI, OpenCode). Fill the TODO lines. -->

## What this project is
- Board: TODO one line, e.g. "4-layer STM32H7 data logger with USB-C, microSD and 24 V input"
- KiCad version: TODO (e.g. 9.0.x). Do not open or save with a different major version.
- Fab and process: TODO (e.g. JLCPCB standard 4-layer, JLC04161H-7628, ENIG). Rules live in `DESIGN-CONSTRAINTS.md`.
- Status: TODO (schematic frozen / layout in progress / ready for fab review)

## Files that matter
- `TODO.kicad_pro`, `TODO.kicad_sch`, `TODO.kicad_pcb` are the canonical files. Edit these in place.
- `DESIGN-CONSTRAINTS.md` is the design intent. Read it before any change and treat it as binding.
- `docs/REVIEW-CHECKLIST.md` is the pre-fab checklist.
- `production/` holds generated Gerbers, drill files, BOM and CPL. Never hand-edit; regenerate with kicad-cli.
- `backups/` is yours for intermediate copies. Nothing outside `backups/` and `production/` is scratch space.

## Hard rules
1. **Ask before you change** any of: component placement, board outline, layer count or stackup, part substitution, net class values, trace width or clearance, via sizes, mounting holes, connector positions. State what you want to change and why, then wait.
2. **You may change without asking**: silkscreen text and position, reference designator placement, missing `Value` fields, courtyard or text overlaps, zone refill, running ERC/DRC, exports into `production/`.
3. **One writer at a time.** If KiCad is open on this project, do not write `.kicad_pcb` or `.kicad_sch`. Say so and stop.
4. **Verify every edit.** After any change run `kicad-cli pcb drc --format json --severity-all` (and `sch erc` for schematic edits) and report the delta in violation counts. A change that adds violations gets reverted unless I approve.
5. **Never fabricate values.** Datasheet numbers, fab limits and part availability must come from a source you cite (URL or file path). If you do not know, say "unknown" and ask.
6. **No positional guessing.** You cannot see a clean layout. Propose placement in words and coordinates and let me judge. Do not "tidy up" placement.
7. **Positive instructions only in your own notes.** When you record a rule for yourself, write what to do, not what to avoid.

## How to work
- Start every session by reading `DESIGN-CONSTRAINTS.md` and summarising the open questions in it.
- Prefer `kicad-cli` and the KiCad IPC API (kicad-python) over hand-editing S-expressions. If you must edit a `.kicad_pcb` or `.kicad_sch` by hand, back it up first and run DRC/ERC immediately afterwards.
- When reviewing, work through the checklist in order and output a table: item, status (pass / fail / cannot check / needs engineer), evidence.
- When a question has a trade-off (cost, size, EMC, availability), give me two options with numbers, not a recommendation dressed as a fact.
- Keep answers short. A finding is one line plus evidence. Long explanations only when I ask.

## Useful commands
```bash
kicad-cli pcb drc --format json --severity-all --output production/drc.json TODO.kicad_pcb
kicad-cli sch erc --format json --severity-all --output production/erc.json TODO.kicad_sch
kicad-cli sch export bom --fields "Reference,Value,Footprint,LCSC Part #,MPN,Manufacturer,DNP" --output production/bom.csv TODO.kicad_sch
kicad-cli pcb export gerbers --output production/gerbers/ TODO.kicad_pcb
kicad-cli pcb export drill --output production/gerbers/ TODO.kicad_pcb
kicad-cli pcb export pos --format csv --units mm --side both --output production/cpl.csv TODO.kicad_pcb
kicad-cli pcb render --output backups/render-top.png --side top TODO.kicad_pcb
```

## Project-specific notes
- TODO: anything unusual (e.g. "U3 is end-of-life, keep footprint compatible with alternate X", "J1 position is fixed by the enclosure", "the 3V3 rail is noise-sensitive, see constraints").
