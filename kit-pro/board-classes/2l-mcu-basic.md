---
schema: kistack-constraints/1
project: TODO
revision: A1
owner: TODO
status: draft
fab: {vendor: jlcpcb, process: standard-2l, stackup: null, layers: 2, thickness_mm: 1.6, copper_oz: {outer: 1}, finish: HASL, assembly: fab-smt, rules_file: ./TODO.kicad_dru}
electrical:
  rails:
    - {name: VBUS, nominal_v: 5,   max_a: 0.5, notes: "from USB-C, 5.1k CC pull-downs for UFP"}
    - {name: 3V3,  nominal_v: 3.3, max_a: 0.3, ripple_mv_pp: 30, sensitive: true}
  currents:
    - {net: VBUS, min_track_mm: 0.5}
    - {net: 3V3,  min_track_mm: 0.4}
    - {net: GND,  rule: "bottom-side pour, top-side pour stitched every 10 mm, no routing channels cutting the bottom pour under the MCU"}
signal_groups:
  - {name: USB_FS, nets: [USB_DP, USB_DM], type: diff_pair, impedance_ohm: 90, tolerance_pct: 15, max_length_mm: 50, max_skew_mm: 1.0, reference_layer: B.Cu, no_vias: true, notes: "USB 2.0 full-speed; on 2-layer 1.6 mm boards true 90 ohm is not achievable with normal widths, keep pair short, coupled and over solid ground; confirm series resistor need in MCU datasheet"}
  - {name: XTAL, nets: [OSC_IN, OSC_OUT], type: critical_analog, max_length_mm: 6, keep_away_mm: 1.5, notes: "load caps per crystal datasheet CL = 2*(C - Cstray); ground guard; no signals beneath on bottom"}
  - {name: SWD, nets: [SWDIO, SWCLK, NRST], type: bus, max_length_mm: 60, notes: "10k pull-up on NRST, 100 nF to ground; test points or 1.27 mm header"}
  - {name: I2C, nets: [SCL, SDA], type: bus, max_length_mm: 100, notes: "pull-ups 4.7k at 3V3 for 100/400 kHz; one set per bus only"}
placement:
  fixed:
    - {ref: J1, reason: "USB-C at board edge, 0.5 mm overhang per connector datasheet"}
  rules:
    - "100 nF decoupling within 2 mm of every VDD pin, 4.7 to 10 uF bulk near VDD entry."
    - "LDO input and output caps within 5 mm of the LDO, output cap type and ESR per LDO datasheet."
    - "Crystal within 5 mm of the MCU oscillator pins, load caps between crystal and MCU."
    - "ESD array for USB within 5 mm of the connector, before the series resistors."
    - "Keep the bottom-side ground pour unbroken under the MCU and the USB pair."
  keep_out: []
mechanical: {outline: "TODO", max_height_top_mm: 10, max_height_bottom_mm: 2, mounting: "TODO"}
thermal: []
emc:
  - "Two-layer rule: the bottom layer is ground first, routing second. Every top trace needs its return directly below."
  - "No bottom-side traces crossing under the USB pair or the crystal."
bom_policy: {preferred_vendors: [jlcpcb-basic, lcsc], avoid: ["end-of-life"], substitutions: "equal or better, engineer approval, log in docs/CHANGES.md", max_extended_parts: 5}
open_questions:
  - "Hand-assembled or fab-assembled? Changes footprint choice (0603 vs 0402) and thermal reliefs."
---
# Notes
Two-layer MCU boards fail in three predictable places: a bottom-layer ground pour cut into islands by routing,
decoupling caps placed for neatness instead of distance, and a crystal with traces under it. The rules above
target exactly those. Everything else is normal DRC work.
