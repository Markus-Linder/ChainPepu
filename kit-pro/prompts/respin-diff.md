# Respin diff (rev A → rev B)

```
Compare git revision <A> and the working tree of <project>.kicad_sch and <project>.kicad_pcb.
Report, in this order:
1. Components added, removed, value-changed, footprint-changed (table with refs).
2. Nets added/removed and connectivity changes (which pins moved net).
3. Placement changes: refs moved more than 0.5 mm or rotated, with before/after coordinates.
4. Routing changes on the signal groups from DESIGN-CONSTRAINTS.md: length, width, via count before/after.
5. Design rule and net class changes.
6. Anything in docs/CHANGES.md that is not reflected in the files, and anything in the files not in CHANGES.md.
Use kicad-cli and file parsing; do not edit.
```
