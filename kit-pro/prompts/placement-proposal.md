# Placement proposal (agent proposes, engineer places)

Agents cannot judge placement visually. Use them to generate a constraint-satisfying proposal in text
and coordinates, then place by hand or let them apply it only after you approve.

```
Using DESIGN-CONSTRAINTS.md (fixed positions, placement rules, keep-outs, signal groups) and the current
board outline, propose a placement for every component not yet placed. Output a table: ref, x_mm, y_mm,
rotation, side, the rule(s) that drove the choice, distance to the part it serves (for decoupling and
filter caps). Group by functional block. Then list every rule you could not satisfy and why.
Do not move anything on the board.
```

Follow-up when something is wrong:
```
Block <name>: <what is wrong, stated positively, e.g. "place C12 on the top side within 2 mm of U3 pin 7">.
Re-issue the table for that block only.
```

Apply (optional):
```
Apply the approved placement table using the KiCad IPC API (kicad-python). If KiCad is not running, stop
and tell me; do not hand-edit the .kicad_pcb for placement. Afterwards render top and bottom with
kicad-cli pcb render into backups/ and run DRC.
```
