# Net class and design rule setup from constraints

```
From DESIGN-CONSTRAINTS.md and the fab profile <fab>/<process> (fab-profiles/<fab>.json), derive:
1. Board-level minimums (clearance, track, via, hole, annular, edge, silk) = fab minimum or stricter.
2. One net class per signal group and per rail with the width/clearance/via values needed, using the fab's
   impedance calculator values I give you here: <paste width/gap for 50 ohm, 90 ohm, 100 ohm>.
3. A custom rules file (.kicad_dru) with the per-group rules: diff pair gap and uncoupled length,
   length-matching tolerances, via restrictions, keep-outs from DESIGN-CONSTRAINTS.md as rule areas or
   constraints.
Write the net classes into the .kicad_pro JSON (back it up first) and the rules into <project>.kicad_dru.
Then run DRC and report the counts. Do not change any trace.
```
