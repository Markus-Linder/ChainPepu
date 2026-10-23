---
schema: kistack-constraints/1
project: TODO
revision: A1
owner: TODO
status: draft
fab: {vendor: jlcpcb, process: standard-4l, stackup: JLC04161H-7628, layers: 4, thickness_mm: 1.6, copper_oz: {outer: 1, inner: 0.5}, finish: ENIG, assembly: fab-smt, rules_file: ./TODO.kicad_dru}
layer_plan: {L1: "module, RF, components", L2: "GND unbroken", L3: "power with GND fill", L4: "low-speed signals, bottom components"}
electrical:
  rails:
    - {name: VBAT, nominal_v: 3.7, max_a: 1.0, notes: "Li-ion, protection IC, charger"}
    - {name: 3V3,  nominal_v: 3.3, max_a: 0.6, ripple_mv_pp: 20, sensitive: true, notes: "radio supply: LDO preferred over buck unless efficiency forces it; if buck, 2 MHz+ switching and LC post-filter"}
  currents:
    - {net: 3V3, min_track_mm: 0.5, rule: "star from regulator; module VCC gets its own trace with 10 uF + 100 nF + 100 pF at the pin"}
signal_groups:
  - {name: RF_ANT, nets: [ANT], type: rf_single_ended, impedance_ohm: 50, max_length_mm: 15, reference_layer: L2, no_vias: true, notes: "Grounded coplanar waveguide on L1 over L2. Width and gap from the fab impedance calculator for the stackup. Ground stitching vias along both sides at lambda/20 or better (about 6 mm at 2.4 GHz, use 2 to 3 mm). Pi-matching footprint 0402 between module and antenna, populate 0 ohm series by default."}
  - {name: UART_DBG, nets: [TXD, RXD], type: bus, max_length_mm: 80}
  - {name: SPI_SENS, nets: [SCK, MOSI, MISO, CS_N], type: bus, max_length_mm: 60, notes: "keep SCK away from the antenna area and module edge"}
placement:
  fixed:
    - {ref: U_RF, reason: "module antenna end at board edge, antenna hanging over or in a copper-free zone per module datasheet"}
  rules:
    - "Antenna keep-out: no copper on any layer in the zone the module datasheet specifies (typically 10 to 15 mm in front, 5 mm each side). Follow the datasheet drawing, not this number."
    - "For chip or PCB antennas: ground plane length and width below the feed per the antenna datasheet; the antenna is tuned to that ground, a different ground shifts the frequency."
    - "No plastic, battery, metal or other boards within the antenna zone in the final enclosure; record enclosure constraints here."
    - "Switching regulator and inductor at least 15 mm from the antenna and RF trace, on the far side of the module."
    - "No signal traces or vias under the module's RF section on any layer."
  keep_out:
    - {area: "antenna zone per module datasheet, all layers", reason: "radiation pattern and tuning"}
mechanical: {outline: "TODO", max_height_top_mm: 6, max_height_bottom_mm: 2, mounting: "TODO; no metal screws within the antenna zone"}
thermal: []
emc:
  - "L2 unbroken under the module and the RF trace."
  - "Stitching vias around the module ground pads and along the board edge near the antenna, 2 to 3 mm pitch."
  - "Keep any clock or switching edge (SPI SCK, buck switch node) more than 10 mm from the antenna."
  - "Pre-certified module: use the manufacturer's reference layout for the antenna zone exactly, or certification does not transfer."
bom_policy: {preferred_vendors: [jlcpcb-basic, lcsc], avoid: ["end-of-life"], substitutions: "no substitution of the RF module, antenna or matching components without re-test", max_extended_parts: 8}
open_questions:
  - "PCB antenna, chip antenna, or U.FL to external? Decides the keep-out and matching."
  - "Which enclosure material and distance to the antenna?"
---
# Notes
Most 2.4 GHz boards do not fail on the RF trace. They fail on the antenna keep-out being violated by a battery,
a screw or a wall of the enclosure, and on the 3V3 rail carrying buck noise into the radio. The template puts
the module at the edge, protects the zone, and prefers an LDO for the radio.
