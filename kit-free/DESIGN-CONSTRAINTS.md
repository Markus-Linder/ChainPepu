---
# DESIGN-CONSTRAINTS.md  (machine-readable design intent)
# Agents: this block is YAML. Parse it. Everything here is binding unless the engineer changes it.
schema: kistack-constraints/1
project: TODO-board-name
revision: TODO (e.g. A1)
owner: TODO name
status: TODO  # draft | schematic-frozen | layout | fab-review | released

fab:
  vendor: TODO           # jlcpcb | pcbway | oshpark | aisler | eurocircuits | other
  process: TODO          # e.g. standard-4l
  stackup: TODO          # e.g. JLC04161H-7628
  layers: 4
  thickness_mm: 1.6
  copper_oz: {outer: 1, inner: 0.5}
  finish: TODO           # HASL | LeadFree HASL | ENIG
  assembly: TODO         # none | fab-smt | in-house | contract
  rules_file: ./fab.kicad_dru   # optional; KiStack Pro Kit ships one per fab/process

electrical:
  rails:
    - {name: VIN,  nominal_v: 24,  max_a: 2.0,  notes: "reverse-polarity protected, TVS at J1"}
    - {name: 5V,   nominal_v: 5,   max_a: 1.5,  ripple_mv_pp: 50}
    - {name: 3V3,  nominal_v: 3.3, max_a: 0.8,  ripple_mv_pp: 20, sensitive: true}
  currents:            # drives trace width; agent must not go below these
    - {net: VIN,  min_track_mm: 1.0}
    - {net: 5V,   min_track_mm: 0.6}
    - {net: GND,  rule: "pour on L2 and L4, no splits under signal paths"}

signal_groups:         # the agent must keep these together and route them as a group
  - name: USB_HS
    nets: [USB_DP, USB_DM]
    type: diff_pair
    impedance_ohm: 90
    tolerance_pct: 10
    max_length_mm: 60
    max_skew_mm: 0.15
    reference_layer: L2
    no_vias: true
    notes: "ESD array within 10 mm of J2, series resistors if required by MCU datasheet"
  - name: SDIO
    nets: [SD_CLK, SD_CMD, SD_D0, SD_D1, SD_D2, SD_D3]
    type: bus
    match_length_to: SD_CLK
    max_skew_mm: 2.0
    max_length_mm: 50
    impedance_ohm: 50
  - name: XTAL
    nets: [OSC_IN, OSC_OUT]
    type: critical_analog
    max_length_mm: 8
    keep_away_mm: 2.0
    notes: "guard with ground, no other signals underneath on any layer"

placement:             # fixed or constrained positions; agent proposes, engineer approves
  fixed:
    - {ref: J1, reason: "enclosure cutout", x_mm: 5.0,  y_mm: 10.0, rot: 90}
    - {ref: J2, reason: "enclosure cutout", x_mm: 5.0,  y_mm: 30.0, rot: 90}
    - {ref: H1-H4, reason: "mounting holes M3, enclosure drawing rev 2"}
  rules:
    - "Decoupling caps within 2 mm of the IC pin they serve, same side as the IC."
    - "Bulk caps at the input of each regulator, before the inductor."
    - "Crystal and load caps on the same side as the MCU, no vias in OSC nets."
    - "Nothing taller than 3 mm within 5 mm of the board edge on the top side (enclosure lid)."
    - "Keep switching regulator U2 and inductor L1 at least 15 mm from the analog section."
  keep_out:
    - {area: "bottom side under J1", reason: "panel mount nut"}
    - {area: "5 mm band along the left edge", reason: "card-edge guide rail"}

mechanical:
  outline: "see Edge.Cuts; 80 x 50 mm, R2 corners"
  max_height_top_mm: 12
  max_height_bottom_mm: 2.5
  mounting: "4x M3, 3.2 mm hole, 6 mm keep-out ring"

thermal:
  - {ref: U2, dissipation_w: 0.8, rule: "thermal vias under exposed pad, 0.3 mm drill, 1.0 mm pitch, connect to L2/L4 GND"}

emc:
  - "All connectors on one edge; chassis ground ring on that edge."
  - "No signal crossing a split in the reference plane."
  - "Return path for every high-speed net on the adjacent plane layer."

bom_policy:
  preferred_vendors: [jlcpcb-basic, lcsc]
  avoid: ["end-of-life", "single-source for passives"]
  substitutions: "only with equal or better specs and engineer approval; log in docs/CHANGES.md"
  max_extended_parts: 8          # JLCPCB charges per extended part

open_questions:        # things the engineer has not decided yet; agent must ask, not assume
  - "Is a second USB-C for power only required?"
  - "ENIG or HASL? Fine-pitch QFN suggests ENIG."
---

# Notes for humans

Keep this file next to the KiCad project. The YAML block is the contract; the agent reads it at the start of
every session. Text below the block is free-form background: why decisions were made, links to the
enclosure drawing, datasheet pages with layout guidance, and a log of changes.

## Design rationale
- TODO

## References
- MCU datasheet layout section: TODO page
- Regulator datasheet layout example: TODO page
- Enclosure drawing: TODO path
