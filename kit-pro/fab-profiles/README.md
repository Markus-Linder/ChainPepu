# Fab profiles (kit-pro)

Machine-readable manufacturing capabilities for five PCB fabs, plus ready-to-use KiCad custom design rules. Every number comes from the fab's own published capability or design-rule page, retrieved **2026-10-23**; the URL list is in each JSON `sources` array and in the header of every `.kicad_dru`. Anything the fab does not publish is `null` and the matching DRU constraint is omitted. Fabs change limits without notice - re-check the source page before ordering.

| File | Fab | Processes |
|---|---|---|
| `jlcpcb.json` | JLCPCB (CN) | `standard-2l`, `standard-4l` (JLC04161H-7628/-3313/-1080/-2116), `standard-6l` (JLC06161H-3313/-7628) |
| `pcbway.json` | PCBWay (CN) | `standard-2l`, `standard-4l` (published 0.8/1.0/1.2/1.6/2.0 mm builds) |
| `oshpark.json` | OSH Park (US) | `two-layer`, `four-layer` (FR408HR), `six-layer` |
| `aisler.json` | AISLER (DE) | `2l-1.6mm-35um-hasl`, `2l-1.6mm-35um-enig`, `4l-1.6mm-35um-enig` |
| `eurocircuits.json` | Eurocircuits (BE) | `pcb-proto`, `standard-pool-2l`, `standard-pool-4l` |

Schema: see `SCHEMA.md`. Units are millimetres unless the key says otherwise.

## Using the JSON profiles

- Each file has `processes[]`; pick one by `id`. The flat keys (`min_track_mm`, `min_clearance_mm`, `min_via_drill_mm`, ...) are the fab's published minimums for that process. `notes[]` quotes the source wording and records every caveat, derived number and source conflict - read them before relying on a limit.
- `stackups[]` carries the fab's named build-ups (JLCPCB `JLC04161H-7628`, OSH Park 4-layer FR408HR, PCBWay laminated-structure entries). Where a fab publishes build-ups only as images or in an online tool (AISLER 4-layer, Eurocircuits eC build-ups) the entry says so.
- `assembly` records the service model (JLCPCB basic/extended parts and fees, PCBWay turnkey/kitted, AISLER Amazing Assembly, Eurocircuits proto/small series, OSH Park none) and the BOM/CPL fields each fab asks for.
- `file_requirements` records Gerber/drill formats, naming, zip rules and whether the fab takes a native `.kicad_pcb`.
- For an AI coding agent: load the JSON for the fab the user named, check the design's KiCad Board Setup values against the process, and point at `kicad_dru_file` (or the matching file in `dru/`) rather than typing numbers from memory.

## Using the `.kicad_dru` files in KiCad 8 / 9

Each `dru/<fab>-<process-id>.kicad_dru` is a KiCad custom-rules file (`(version 1)` + `(rule ...)` blocks) expressing the fab minimums as DRC constraints: `track_width`, `clearance`, `hole_size` (via / PTH / NPTH, plus max), `via_diameter`, `annular_width` (separate rules for vias and PTH pads where the fab publishes both), `hole_to_hole`, `hole_clearance`, `edge_clearance`, `silk_clearance`, and `text_thickness` / `text_height` on the silkscreen layers. Inner-layer-only figures use `(layer inner)`.

Two ways to load one:

1. **Board Setup -> Design Rules -> Custom Rules**: open the `.kicad_dru`, copy its contents into the editor, press *Check rule syntax*, OK. (The file's `#` comment lines are valid in that editor.)
2. **Project file**: copy it next to your board as `<project>.kicad_dru` (same base name as the `.kicad_pro`). KiCad loads it automatically; the Custom Rules tab shows it.

Then run *Inspect -> Design Rules Checker*. Notes:

- Custom rules only tighten DRC; they do not change the default netclass. Set *Board Setup -> Constraints* and your netclass track/via sizes to at least the same values so the router does not draw violations.
- Solder-mask minimum web and slot width are not custom-rule constraints; the DRU files carry them as comments and point to *Board Setup -> Board Stackup -> Solder Mask/Paste*.
- Fab minimums are not targets. Leave margin - Eurocircuits says it explicitly ("Do not design your board up to the limits of any given classification"), and JLCPCB's track-width tolerance is +/-20 %.

## Comparison - cheapest standard 2-layer process

Values in mm. Cells cite the process in the JSON; "n/p" = not published by the fab (null).

| | JLCPCB `standard-2l` | PCBWay `standard-2l` | OSH Park `two-layer` | AISLER `2l-1.6mm-35um-hasl` | Eurocircuits `pcb-proto` (2L) |
|---|---|---|---|---|---|
| Track / space | 0.10 / 0.10 (1 oz) | 0.10 / 0.10 (Standard table; Advanced "normal" = 0.127 / 0.152) | 0.1524 / 0.1524 | 0.20 / 0.15 | 0.15 / 0.15 |
| Min via drill | 0.15 (0.20 preferred; 0.15 and small pads cost extra) | 0.15 (< 0.20 extra charge; Advanced normal 0.20) | 0.254 | 0.30 (max 0.45) | 0.25 finished (vias = PTH <= 0.45) |
| Min annular ring | via 0.05 (0.075 preferred); PTH 0.18 abs. (0.25 rec.) | 0.15 | 0.127 | via 0.20 (0.175 abs.); PTH 0.30 | n/p (STANDARD pool: pad = hole + 0.30 -> 0.15) |
| Hole to copper | via 0.20; PTH 0.28 (0.35 rec.) | n/p | 0.127 | 0.25 (NPTH only published) | n/p (inner IPI 0.20) |
| Hole to hole | via 0.20; pad 0.45 | 0.2794 (Advanced normal, via <= 0.45) | 0.127 recommended | 0.30 | 0.35 finished, different nets (0.25 same net) |
| Copper to edge | 0.20 routed / 0.40 V-cut | 0.25 (Advanced normal) | 0.381 | 0.30 | 0.25 routed / 0.45 V-cut |
| Board thicknesses | 0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0 | 0.2 ... 3.2 (13 steps) | 1.6 only | 1.6 | 1.55 only (STANDARD pool: 1.0 / 1.55 / 2.4) |
| Castellated holes | yes (>= 0.5 hole, 10x10 min, >= 0.6 thick) | yes (>= 0.4 half-hole; Advanced says >= 0.5) | allowed, not guaranteed | no with HASL (yes, free, with ENIG) | no in PCB proto (yes in STANDARD pool) |
| Impedance control | no (4+ layers only, +/-10 %) | yes (Advanced table, +/-10 %) | n/p | n/p | n/p (separate DEFINED IMPEDANCE pool, 4+ layers) |
| Finish | HASL / LF-HASL / ENIG / OSP | HASL, LF-HASL, ENIG, OSP, hard gold, ImAg, ImSn, ENEPIG | ENIG only | LF HASL | LF HAL or ENIG |
| Silk line / text | 0.15 / 1.0 | 0.15 / 0.8 | 0.127 (0.0762 short) / n/p | 0.15 / 0.8 | 0.10 / 1.0 |
| Mask web | 0.10 (0.13 black/white) | 0.1016 (Advanced) | 0.1016 | 0.10 | 0.075 (DI) |
| Min / max board | 3x3 / 670x600 (also "1020x600") | 3x3 / 600x1200 (Advanced normal: >= 20 mm) | 6.35x6.35 / 406.4x558.8 | > 10 / 500x500 | 20x20 / 580x425 |
| Native `.kicad_pcb` upload | no (zip of Gerbers + drills) | no (Gerber, .pcb, .pcbdoc, .cam) | yes | yes (or AISLER Push plugin) | yes |

Sources: the `sources` arrays of each JSON (JLCPCB `jlcpcb.com/capabilities/pcb-capabilities`; PCBWay `pcbway.com/capabilities.html`; OSH Park `docs.oshpark.com/services/two-layer/` + `design-tools/kicad/kicad-design-rules/`; AISLER `community.aisler.net/t/.../3735`; Eurocircuits `eurocircuits.com/services/pcb-proto/` + design-guideline pages).

## Gotchas per fab (all cited in the JSON notes)

### JLCPCB
- **Via-in-pad**: vias in BGA pads must be ordered as filled-and-capped (epoxy or copper paste, 0.15-0.55 mm); filled vias need >= 0.35 mm from other mask openings and <= 0.5 mm diameter. Default on 6+ layers.
- **Via ring vs PTH ring**: the via pad only needs to be 0.1 mm (0.15 preferred) larger than the hole, but component PTH pads need >= 0.18 mm ring (2L) / 0.15 mm (4L+). The DRU files apply both.
- **Small vias cost more**: 0.1/0.15 mm holes, or 0.2/0.25 mm holes with pads < 0.45 mm, are a priced option that must be selected at order time; 0.1 mm holes need thickness <= 1 mm and ENIG/OSP.
- **Silkscreen**: >= 0.15 mm line, >= 1.0 mm text, 0.15 mm pad-to-silk; thinner text is dropped as "unidentifiable". Mask web 0.10 mm green, 0.13 mm black/white, 0.20 mm 2 oz.
- **Panelization / V-cut**: V-cut needs >= 0.6 mm thickness, >= 0.4 mm copper to V-cut edge, 70x70 mm min panel, 2 mm (3 mm recommended) between cuts; tab-route spacing 1.6 or 2 mm; 5 mm rails + 2 mm tooling holes + 1 mm fiducials at 3.85 mm for JLCPCB SMT.
- **Blind/buried vias** are not part of the standard 4-layer order (HDI is a separate process). HASL unavailable on 6+ layers and <= 0.4 mm boards. Impedance only on 4+ layers; JLC04161H-7628 is the thick-prepreg default, -3313 the thin one; **no 4-layer "2313" build exists** on the stackup page (2313 appears only inside the 6-layer JLC06161H-2116).
- **Assembly fees**: Economic = single side, 0402+, $3.07 per extended part (basic parts free); Standard = double side, 01005+, $1.53 per part basic *and* extended; the FAQ still says "$3 per extended component". BOM needs an `LCSC Part #` column; CPL in mm with Designator/Mid X/Mid Y/Rotation/Layer. Gerbers must be a single zip/rar with English filenames; the help centre offers no native `.kicad_pcb` intake.

### PCBWay
- **Two tables**: the "Standard PCB" table (quick-turn) and the "Advanced PCB" table (normal/medium/high difficulty) disagree. Standard says 0.1 mm track/space and 0.15 mm drills; Advanced "normal process" says 5/6 mil outer and 0.20 mm drills, with 4/4 mil and < 0.2 mm holes as medium/high difficulty (reviewed, possibly surcharged). Design to the Advanced normal column for a no-questions order.
- **Inner copper is 1 oz minimum** (1/1.5/2/3/4 oz); there is no 0.5 oz inner option, and the published 4-layer builds are 1 oz / 1 oz with 7628 prepreg (2116 at 2.0 mm).
- **Gerber X2 must be off**: "Do NOT check 'Use extended X2 format', otherwise, the format will not be accepted"; also leave 'Include extended attributes' unchecked. No native KiCad upload - use Gerbers or the PCBWay KiCad plugin (exports Gerber, IPC netlist, BOM, PnP; needs a `Manufacture Part Number` field for assembly).
- **Castellated**: 0.4 mm min half-hole in the Standard table, >= 0.5 mm with >= 0.3 mm spacing in Advanced.
- **Assembly**: BGA down to 0.25 mm pitch with X-ray; boards under 50x100 mm must be panelized; consigned 0201/0402 passives need 100 pcs minimum; the quote includes tooling, laser stencil and labour.

### OSH Park
- **Purple + ENIG + 3 copies**: every service is FR4 (FR408HR for 4/6 layers), purple SMOBC mask, ENIG, 1.6 mm nominal, priced per square inch *per set of three* ($5 2L, $10 4L, $15 6L); quantities are multiples of 3. Medium Run needs 100 in^2 minimum. 2 oz 0.8 mm and After Dark (black substrate, clear mask) are 2-layer variants.
- **Native `.kicad_pcb` is the recommended upload**, but zones are **not refilled** on the server (the `.kicad_pro` with your rules is not uploaded) - fill zones and save first; in KiCad 9 embed fonts, or upload Gerbers (names auto-detected; `.GKO/.XLN/.G2L/.G3L` pattern).
- **Drill file**: Excellon in **inches, 2:4**, zero suppression none or leading; undersize drills are enlarged to the service minimum (10 mil for 2L/4L, 8 mil 6L); max drilled hole 260 mil.
- **Castellations** are "allowed, but not guaranteed": round pads only, pads <= 40 mil from the edge, expect to file off tabs/plating. Slots >= 20 mil wide must be native drill slots; outline cutouts must fit a 0.068 in end mill.
- **No assembly service**; stencils via the OSH Stencils partner (include paste layers). No published text height or impedance guarantee; 4-layer stackup may temporarily vary (page changelog).

### AISLER
- **Rules depend on finish and copper**: the cheapest board (2L 1.6 mm 35 um HASL) is 0.20/0.15 mm, 0.30 mm via drill, 0.20 mm via ring (0.175 absolute - AISLER may enlarge via drills to 0.45 mm on simple boards), and **no castellation**; ENIG unlocks 0.125/0.125 mm, 0.25 mm drills, 0.10 mm via ring and free castellation. Via drills > 0.45 mm are treated as PTH and enlarged for plating.
- **Stencil is not included**: it is an optional add-on priced separately (job fee EUR 5 + EUR 0.095/cm^2 in the 2023 pricing post); one paste layer = one-sided stencil.
- **Sets of 3**, silkscreen coverage capped at 25 % per side (designs above are rejected), silk on pads unsupported, no tented vias (mask dam 0.10 mm required with HASL).
- **Upload natively** (`.kicad_pcb` or AISLER Push for KiCad); assembly is impossible from plain Gerbers; KiCad 5 files get thin thermals, KiCad 7/8 custom fonts are not embedded. KiCad 10 format supported.
- Published 4-layer stackup gives only total thickness (1.6 mm +/- 10 %) and reference impedance widths; the layer build is an image. The older `help.aisler.net` design-rules page was unreachable (503 / certificate mismatch) on retrieval day; the community pages say they "shall always be used as reference".

### Eurocircuits
- **Classification drives price**: the Visualizer assigns a pattern class (3-10, from the smallest track/gap/annular ring) and a drill class (A-F, from the smallest production *tool* size, which is finished hole + 0.10 mm for PTH). Classes 3-6 / A-C are "All Services"; finer classes are pooled only in some services, and the page warns not to design to the class limits. Max PCB thickness falls with drill class (1.60 mm at class E).
- **PCB proto** is the cheapest small-quantity service: 2 or 4 layers, 1-5 boards, 1.55 mm only, 18 um outer copper, 0.15 mm track/gap, 0.25 mm finished PTH, 20x20 mm minimum, lead-free HAL or ENIG at the fab's choice, **no edge-plated holes**, no blind/buried vias.
- **STANDARD pool** pools 0.100 mm track/gap, 0.10 mm finished PTH, 1.00/1.55/2.40 mm (2L) but **1.00 mm only for pooled 4-layer**; other thicknesses are non-pooling. Pads: outer PTH = hole + 0.30 mm, inner = hole + 0.35 mm; copper 0.25 mm from a routed edge (0.40 inner, 0.45 V-cut). Build-ups are chosen from "8 predefined eC builds" in the online Buildup Editor, not published as a table.
- **Hole spacing** is specified on finished sizes: 0.35 mm between plated holes on different nets (0.25 same net), 0.15 mm NPTH. NPTH ring 0.30 mm recommended. Vias are PTH <= 0.45 mm by default (configurable).
- **Data**: Gerber X3/X2 **plus a Gerber job file**, ODB++, or native KiCad/Eagle in one zip without folders; legend 0.10 mm line / 1.0 mm text, 0.10 mm off exposed copper. Assembly only for Eurocircuits-made boards, 0201 minimum, BGA pitch 0.35/0.40 mm, 1-50 pcs; impedance needs the separate DEFINED IMPEDANCE pool (4/6/8 layers, IS400).

## What is null and why

| Fab / process | Field | Reason |
|---|---|---|
| PCBWay both | `min_via_diameter_mm` | no via pad diameter is published (drill + 2x0.15 ring = 0.45 would be derived) |
| PCBWay `standard-2l` | `min_hole_to_copper_mm` | not in either capability table |
| PCBWay both | `soldermask_expansion_mm` | only mask *opening* >= 2 mil is given, not expansion |
| OSH Park all | `min_silkscreen_text_height_mm` | "left to user preference" on the KiCad design-rules page |
| OSH Park all | `soldermask_expansion_mm` | only max mask alignment (3 mil) and web are published |
| OSH Park all | `impedance_control` | 2L/6L pages are silent; the 4L page references an impedance image without values or guarantee |
| OSH Park `six-layer` | `min_via_diameter_mm`, `min_hole_to_hole_mm` | no KiCad Board Setup table is published for 6 layers |
| AISLER all | `min_via_diameter_mm` | no via pad diameter published (drill + 2 x ring is derived) |
| AISLER all | `impedance_control` | 2L rule pages are silent; 4L stackup gives reference widths but no control guarantee |
| Eurocircuits `pcb-proto` | `min_annular_ring_mm`, `min_via_diameter_mm` | service page lists only track/gap and hole sizes |
| Eurocircuits all | `max_pth_drill_mm` | no maximum drill size published |
| Eurocircuits `pcb-proto`, `standard-pool-2l` | `min_hole_to_copper_mm` | only the inner-layer IPI figure exists; no outer-layer value |
| Eurocircuits `pcb-proto` | `min_slot_width_mm`, `impedance_control` | not stated on the proto page |
| Eurocircuits all | `min_via_diameter_mm` | not stated |
| OSH Park | `assembly.required_bom_fields` | no assembly service |
| AISLER | `assembly.required_bom_fields` | BOM is built from native CAD data; no column list published |

## Source conflicts recorded

- **JLCPCB extended-part fee**: FAQ "$3 per extended component" vs price table (updated 2026-10-22) $3.07 Economic / $1.53 Standard (basic and extended). **Max board size**: 670x600 (2L) / 663x593 (4L) in the table vs "1020x600" / "1016x596" in the same page's notes. **Thickness range** 0.4-4.5 mm (spec) vs 0.4-3.2 mm (FAQ).
- **PCBWay Standard vs Advanced tables**: track/space 0.10 vs 0.127/0.152 mm; min drill 0.15 vs 0.20 mm; min board 3x3 vs >= 20 mm; castellated 0.4 vs 0.5 mm. The Standard table values are used in the DRU, the Advanced ones are in notes.
- **AISLER assembly lead time**: 6 business days (marketing) vs 9+ (FAQ on the same page). **Board price**: EUR 14.20 (product page) vs 2023 formula.
- **Eurocircuits 4-layer thickness**: pooled 1.00 mm (STANDARD pool page) vs 1.55 mm (PCB proto page); both recorded on their own processes.
- **OSH Park 6-layer turnaround**: 9-14 days (old) vs 12-21 days (changelog 2025-12-15); 12-21 recorded.
