# Full board review session

## 1. Orientation (no edits)
```
Read CLAUDE.md, DESIGN-CONSTRAINTS.md and docs/CHANGES.md. Summarise in 10 lines: what the board is,
fab/process, the signal groups with their constraints, fixed placements, and open questions. Then list
which checklist items in docs/REVIEW-CHECKLIST.md you can verify with tools and which need me.
```

## 2. Tool run
```
Run kistack-review --board <b>.kicad_pcb --schematic <b>.kicad_sch --project <b>.kicad_pro --fab <fab>
--process <process> --out review/ . If kistack-review is not installed, run kicad-cli drc and erc with JSON
output into review/ instead. Report the summary counts only.
```

## 3. Checklist pass
```
Read review/AGENT_PROMPT.md and execute docs/REVIEW-CHECKLIST.md item by item. Output the table exactly in
the format the checklist specifies. For every "fail" cite the file, the tool output line, or coordinates.
Do not edit anything.
```

## 4. Constraint verification with numbers
```
For every signal group in DESIGN-CONSTRAINTS.md measure the actual values from the board file: trace
widths and gaps for impedance-controlled nets, net lengths, pair skew, via counts, distance from clock
nets to board edges. Table: group, constraint, measured, pass/fail. Use kicad-python (IPC) if KiCad is
running, otherwise parse the .kicad_pcb. State which method you used.
```

## 5. Proposal
```
Produce two lists from everything above. "Fix now" = items CLAUDE.md allows without asking, each with the
exact edit. "Needs approval" = everything else, each as: problem, two options with numbers (cost, size,
risk), your recommendation in one line. Then stop and wait.
```

## 6. Apply approved
```
Apply only these: <paste>. Back up to backups/ first. After each file write, run DRC (and ERC if the
schematic changed) and report the delta. Append each change to docs/CHANGES.md.
```
