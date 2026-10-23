# Changelog - fab profiles

## 2026-10-23

Initial release (schema_version 1). All values retrieved on 2026-10-23 from each fab's own capability / design-rule pages; URLs are listed in each JSON `sources` array and in every `.kicad_dru` header.

Added:

- `jlcpcb.json` - processes `standard-2l`, `standard-4l` (JLC04161H-7628 / -3313 / -1080 / -2116 stackups), `standard-6l` (JLC06161H-3313 / -7628); Economic vs Standard assembly with basic/extended-part fees; Gerber/drill export settings for KiCad 8/9.
- `pcbway.json` - processes `standard-2l`, `standard-4l` (five published 4-layer builds from the laminated-structure page); assembly file requirements; Gerber X2 must be off.
- `oshpark.json` - processes `two-layer`, `four-layer` (FR408HR stackup), `six-layer`; native `.kicad_pcb` upload; no assembly service.
- `aisler.json` - processes `2l-1.6mm-35um-hasl`, `2l-1.6mm-35um-enig`, `4l-1.6mm-35um-enig`; AISLER Push for KiCad / native upload; stencil is an optional add-on.
- `eurocircuits.json` - processes `pcb-proto`, `standard-pool-2l`, `standard-pool-4l`; pattern/drill classification notes; Gerber X2/X3 + job file or native KiCad.
- `dru/` - 14 KiCad 8/9 custom-rule files, one per process, generated from the JSON values.
- `README.md` - usage, 2-layer comparison table, per-fab gotchas, null/conflict register.

Known gaps (null in the JSON, see README "What is null and why"): PCBWay via pad diameter and outer hole-to-copper; OSH Park text height and impedance; AISLER via pad diameter and impedance; Eurocircuits PCB-proto annular ring, max drill and outer hole-to-copper.

Source conflicts recorded in notes: JLCPCB extended-part fee ($3 FAQ vs $3.07/$1.53 price table) and max board size; PCBWay Standard vs Advanced tables (track/space, min via drill, min board size, castellated hole size); AISLER assembly lead time (6 vs 9+ business days); Eurocircuits 4-layer pooled thickness (1.00 mm STANDARD pool vs 1.55 mm PCB proto).
