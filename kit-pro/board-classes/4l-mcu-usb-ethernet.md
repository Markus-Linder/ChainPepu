---
schema: kistack-constraints/1
project: TODO
revision: A1
owner: TODO
status: draft
fab: {vendor: jlcpcb, process: standard-4l, stackup: JLC04161H-7628, layers: 4, thickness_mm: 1.6, copper_oz: {outer: 1, inner: 0.5}, finish: ENIG, assembly: fab-smt, rules_file: ./TODO.kicad_dru}
layer_plan: {L1: "signals, components", L2: "GND, unbroken", L3: "power planes (3V3, 1V2, VIN) with GND fill", L4: "signals, low-speed, bottom components"}
electrical:
  rails:
    - {name: VIN,  nominal_v: 12,  max_a: 1.0, notes: "barrel or screw terminal, reverse polarity P-FET, TVS"}
    - {name: 5V,   nominal_v: 5,   max_a: 1.0, ripple_mv_pp: 50}
    - {name: 3V3,  nominal_v: 3.3, max_a: 0.8, ripple_mv_pp: 30}
    - {name: 1V2,  nominal_v: 1.2, max_a: 0.3, ripple_mv_pp: 20, notes: "PHY core, if required by the PHY"}
    - {name: VDDA, nominal_v: 3.3, max_a: 0.05, notes: "MCU analog supply, ferrite bead + 1 uF + 100 nF"}
  currents:
    - {net: VIN, min_track_mm: 0.8}
    - {net: 5V,  min_track_mm: 0.6}
    - {net: 3V3, rule: "plane region on L3 or 0.6 mm minimum"}
signal_groups:
  - {name: USB_HS, nets: [USB_DP, USB_DM], type: diff_pair, impedance_ohm: 90, tolerance_pct: 10, max_length_mm: 75, max_skew_mm: 0.5, reference_layer: L2, no_vias: true, notes: "USB 2.0 high-speed. Width/gap from the fab's impedance calculator for the named stackup; keep 3x gap to other copper; ESD within 5 mm of connector, series termination only if PHY datasheet asks"}
  - {name: RMII, nets: [RMII_TXD0, RMII_TXD1, RMII_TX_EN, RMII_RXD0, RMII_RXD1, RMII_CRS_DV, RMII_REF_CLK, RMII_MDIO, RMII_MDC], type: bus, impedance_ohm: 50, match_length_to: RMII_REF_CLK, max_skew_mm: 12, max_length_mm: 60, reference_layer: L2, notes: "50 MHz REF_CLK: 22 to 33 ohm series resistor at the driver per PHY datasheet; keep clock away from board edge"}
  - {name: ETH_MDI, nets: [TX_P, TX_N, RX_P, RX_N], type: diff_pair, impedance_ohm: 100, tolerance_pct: 10, max_length_mm: 40, max_skew_mm: 0.5, reference_layer: L2, no_vias: true, notes: "PHY to magnetics to RJ45. Moat under magnetics: no GND or power copper on any layer between PHY-side and cable-side of the transformer; chassis GND island on the cable side"}
  - {name: SDIO, nets: [SD_CLK, SD_CMD, SD_D0, SD_D1, SD_D2, SD_D3], type: bus, impedance_ohm: 50, match_length_to: SD_CLK, max_skew_mm: 2.0, max_length_mm: 50, notes: "pull-ups 10k to 47k on CMD and D0 to D3; series resistor on CLK optional; keep CLK away from D lines by 3x width"}
  - {name: XTAL_MCU, nets: [OSC_IN, OSC_OUT], type: critical_analog, max_length_mm: 8, keep_away_mm: 2.0, notes: "ground guard, L2 solid under it"}
  - {name: XTAL_PHY, nets: [PHY_XI, PHY_XO], type: critical_analog, max_length_mm: 8, keep_away_mm: 2.0, notes: "25 MHz per PHY; if the PHY provides REF_CLK out, route it as RMII clock"}
placement:
  fixed:
    - {ref: J1, reason: "USB-C, enclosure"}
    - {ref: J2, reason: "RJ45 with magnetics, enclosure"}
  rules:
    - "All connectors on one board edge; chassis ground strip along that edge tied to GND through 1 nF 2 kV + 1 M in parallel, or direct, per product requirement."
    - "PHY within 25 mm of the RJ45; magnetics (if discrete) between them, centered."
    - "Decoupling caps on the same side as the IC, within 2 mm, via to L2 directly at the cap pad."
    - "Switching regulator block on the opposite end from the PHY and crystals; inductor loop area minimal; feedback trace routed away from the switch node."
    - "VDDA filter components within 5 mm of the MCU VDDA pin."
  keep_out:
    - {area: "under magnetics and RJ45 on all layers", reason: "isolation moat"}
mechanical: {outline: "TODO", max_height_top_mm: 15, max_height_bottom_mm: 3, mounting: "4x M3"}
thermal:
  - {ref: U_REG, dissipation_w: 0.5, rule: "thermal vias under exposed pad 0.3 mm drill 1.0 mm pitch into L2"}
emc:
  - "L2 is a single unbroken ground plane. No slots, no routing on L2. Non-negotiable."
  - "Every L1 high-speed net references L2. Nets that change to L4 must have a ground via within 1 mm of the signal via."
  - "No L3 power plane edge under a high-speed trace on L1."
  - "Keep clocks (REF_CLK, SD_CLK, OSC) at least 3 mm from board edges and connectors."
bom_policy: {preferred_vendors: [jlcpcb-basic, lcsc], avoid: ["end-of-life", "single-source for passives"], substitutions: "equal or better, engineer approval, log in docs/CHANGES.md", max_extended_parts: 10}
open_questions:
  - "Discrete magnetics or RJ45 with integrated magnetics? Changes the moat geometry."
  - "Is REF_CLK sourced by the PHY or the MCU?"
---
# Notes
Four-layer boards buy you an unbroken ground plane. Everything in this template protects that one asset:
no routing on L2, ground vias next to every layer change, moat only where the Ethernet isolation requires it.
Impedance widths come from the fab's calculator for the named stackup; do not copy them from another board.
