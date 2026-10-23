# Gerber and fab-output review

```
Export Gerbers and drill files with kicad-cli into production/gerbers/ using the fab's recommended options
for <fab> (from fab-profiles/<fab>.json file_requirements). Then render every Gerber layer to SVG/PNG into
review/gerbers/ and inspect each one. Checklist, one line each with pass/fail and evidence:
- Copper layers present and not mirrored; inner layers have the expected planes.
- Drill file hit count equals the number of holes on the board; PTH and NPTH separated as the fab expects.
- Solder mask openings exist for every pad; no openings over traces.
- Paste layer only on SMD pads; no paste on test points or NPTH.
- Silkscreen: nothing over pads, text min size per fab, board name and revision present.
- Edge cuts closed, single outline, no internal cutouts missing.
- Fab-specific requirements from the profile (naming, extensions, zip contents).
Zip production/gerbers/ as production/<project>-<rev>-gerbers.zip and list its contents.
```
