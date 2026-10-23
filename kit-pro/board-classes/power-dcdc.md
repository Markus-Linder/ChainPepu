---
schema: kistack-constraints/1
project: TODO
revision: A1
owner: TODO
status: draft
fab: {vendor: jlcpcb, process: standard-2l, stackup: null, layers: 2, thickness_mm: 1.6, copper_oz: {outer: 2}, finish: HASL, assembly: fab-smt, rules_file: ./TODO.kicad_dru}
electrical:
  rails:
    - {name: VIN,  nominal_v: 24, min_v: 9, max_v: 36, max_a: 2.0, notes: "TVS (SMBJ33A or per spec), reverse P-FET, input pi filter if conducted-emissions matter"}
    - {name: VOUT, nominal_v: 5,  max_a: 3.0, ripple_mv_pp: 30, notes: "sync buck, 500 kHz to 1 MHz"}
  currents:
    - {net: VIN,  min_track_mm: 1.5}
    - {net: VOUT, min_track_mm: 2.0, rule: "pour, not trace; 2 oz copper assumed"}
    - {net: SW,   rule: "pour as small as possible, only pad-to-pad between IC, inductor and catch diode/low-side FET; never under the feedback network"}
    - {net: GND,  rule: "bottom pour unbroken; top-side power GND island under the converter, connected with 6+ vias to bottom"}
signal_groups:
  - {name: FB, nets: [FB, VOUT_SENSE], type: critical_analog, max_length_mm: 20, keep_away_mm: 3.0, notes: "sense at the output capacitor, not at the inductor; feedback divider within 3 mm of the FB pin; route away from SW and inductor; no vias if possible"}
  - {name: BOOT, nets: [BOOT], type: critical_analog, max_length_mm: 5, notes: "bootstrap cap directly at the pins"}
  - {name: COMP, nets: [COMP], type: critical_analog, max_length_mm: 5, notes: "compensation network at the pin, ground to analog GND pin"}
placement:
  fixed: []
  rules:
    - "Hot loop first: input cap, high-side switch, low-side switch (or diode) form the smallest possible loop. Input ceramic within 2 mm of VIN and PGND pins on the same layer, no vias in the loop."
    - "Inductor next to the SW pin; output cap at the inductor's other end; VOUT sense taken from that cap."
    - "Analog ground (AGND, if the IC has one) ties to PGND at a single point under the IC per the datasheet."
    - "Feedback divider and compensation on the quiet side of the IC, away from SW and the inductor."
    - "Thermal: exposed pad with 0.3 mm drill vias at 1.0 mm pitch to the bottom pour; copper area per the datasheet's theta-JA table for the target dissipation."
    - "Nothing sensitive (feedback, comp, external analog) under the inductor on the bottom side."
  keep_out:
    - {area: "bottom side under the inductor", reason: "magnetic coupling into sensitive nets"}
mechanical: {outline: "TODO", max_height_top_mm: 12, max_height_bottom_mm: 2, mounting: "TODO"}
thermal:
  - {ref: U1, dissipation_w: 1.0, rule: "per datasheet; verify with copper area and thermal vias; add a temperature test point plan"}
  - {ref: L1, dissipation_w: 0.4, rule: "DCR loss; keep away from electrolytics"}
emc:
  - "SW node copper minimal and on one layer only."
  - "Input filter before the hot loop; filter ground returns to the input connector ground, not through the converter's PGND."
  - "Catch diode or low-side FET directly adjacent to the IC PGND pin."
bom_policy: {preferred_vendors: [jlcpcb-basic, lcsc], avoid: ["end-of-life"], substitutions: "inductor substitutions require saturation current >= 1.3x peak and same or lower DCR; ceramic caps: same voltage rating and dielectric (X7R/X5R), check DC-bias derating", max_extended_parts: 6}
open_questions:
  - "Conducted emissions standard to meet (CISPR 32 class A/B, automotive)?"
  - "Output must survive a short? Check hiccup vs latch-off behaviour of the IC."
---
# Notes
The hot loop is the whole design. Agents cannot judge it visually, so the template makes it a placement
rule with distances, and keeps the feedback path out of the way. Copy the datasheet's layout example into
docs/ and reference it; the agent should compare against it item by item.
