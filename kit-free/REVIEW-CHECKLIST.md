# Pre-fab review checklist (agent-executable)

Agent instructions: work through every item in order. For each, output one table row:
`| # | item | pass / fail / cannot check / needs engineer | evidence (file, tool output, coordinate) |`.
Do not edit any file during the review. Collect fixes as a numbered proposal at the end, grouped into
"may fix without asking" and "needs approval", according to CLAUDE.md.

## A. Project hygiene
1. Project opens with the KiCad version named in CLAUDE.md; no library-migration warnings.
2. `kicad-cli sch erc --severity-all` runs clean, or every remaining item is listed with a justification.
3. `kicad-cli pcb drc --severity-all` runs clean, including unconnected items and schematic parity.
4. Board design rules and every net class are at or above the fab minimums in DESIGN-CONSTRAINTS.md (track, clearance, via drill, annular ring, hole-to-hole, edge clearance).
5. No footprint is from a personal or unknown library without a note in the project.

## B. Schematic
6. Every power pin has a decoupling capacitor and every regulator has input and output capacitors matching its datasheet.
7. Every IC's unused inputs are tied or configured per datasheet; no floating enables, resets or boot pins.
8. Pull-ups/pull-downs exist for I2C, reset, boot/config straps, and open-drain outputs.
9. Polarised parts (electrolytics, tantalums, diodes, LEDs) have polarity marked in the symbol and footprint.
10. Every connector pinout matches its mating part or cable spec (cite the spec).
11. Protection: reverse polarity on inputs, TVS/ESD on every external connector signal, fuse or PTC where DESIGN-CONSTRAINTS.md requires.
12. Test points on every rail and on debug signals (SWD/JTAG, UART).
13. Net names are consistent across sheets; no near-duplicate names (e.g. `3V3` and `+3V3`).
14. Every component has `Value`, `Footprint`, and a part number field (MPN or LCSC); DNP parts are marked DNP, not deleted.

## C. Layout, electrical
15. Signal groups from DESIGN-CONSTRAINTS.md: lengths, skew, impedance widths and via rules met; report the measured values.
16. No high-speed or clock trace crosses a split or void in its reference plane.
17. Decoupling caps are within the distance rule and connected with short, wide traces to pin and plane.
18. High-current nets meet the minimum width; report widest neck per net.
19. Thermal relief vs solid connections match the intent: solid for power pads that need heat sinking, relief for hand-solder parts.
20. Thermal vias under exposed pads as specified.
21. Crystal: traces short, ground guard, no routes beneath on any layer.
22. Via count on sensitive analog and diff pairs equals what DESIGN-CONSTRAINTS.md allows.
23. Copper pours are not left as small isolated islands; stitching vias on ground pours at reasonable pitch.

## D. Layout, mechanical and DFM
24. Board outline matches the enclosure dimensions and corner radii; mounting holes at specified positions with keep-out rings.
25. Fixed-position parts are at the specified coordinates and rotation.
26. Component height limits met on both sides.
27. Courtyards do not overlap; parts intended for hand soldering have enough spacing.
28. Silkscreen: reference designators visible, not on pads or vias, min line and text size per fab; polarity marks and pin-1 indicators present; board name and revision on the board.
29. Fiducials present if the fab assembles the board (3 on the board, or per panel).
30. Castellations, slots, and plated/non-plated holes correctly defined (PTH vs NPTH).
31. Solder mask expansion and bridges meet fab minimums, especially on fine-pitch parts.
32. No copper closer to the edge than the fab allows; no traces under V-cut lines.

## E. Outputs
33. Gerbers, drill files, BOM and CPL regenerate from the current files without warnings.
34. Gerber review: each layer rendered and checked for missing pours, mirrored layers, missing drill hits.
35. CPL rotations checked for polarised and asymmetric parts against the fab's rotation convention.
36. BOM: part numbers resolve at the chosen vendor, stock sufficient for the order quantity, extended-part count within policy.
37. Revision bumped, change log updated.

## Final output format
1. The table.
2. "Fix now without asking": numbered list with file and exact change.
3. "Needs engineer approval": numbered list with the question, the options, and the numbers behind each option.
4. "Could not verify": what tool or information is missing.
