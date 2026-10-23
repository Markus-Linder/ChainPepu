---
schema: kistack-constraints/1
project: TODO
revision: A1
owner: TODO
status: draft
fab: {vendor: jlcpcb, process: standard-4l, stackup: JLC04161H-7628, layers: 4, thickness_mm: 1.6, copper_oz: {outer: 1, inner: 0.5}, finish: ENIG, assembly: fab-smt, rules_file: ./TODO.kicad_dru}
layer_plan: {L1: "analog front end, components", L2: "GND unbroken", L3: "AVDD / DVDD planes, GND fill", L4: "digital, MCU, connectors"}
electrical:
  rails:
    - {name: AVDD, nominal_v: 5,   max_a: 0.05, ripple_mv_pp: 1,  sensitive: true, notes: "low-noise LDO dedicated to the AFE; ferrite + 10 uF + 100 nF at each analog IC"}
    - {name: VREF, nominal_v: 2.5, max_a: 0.005, sensitive: true, notes: "precision reference; 10 uF + 100 nF at the ADC REF pin, follow ADC datasheet for cap ESR"}
    - {name: DVDD, nominal_v: 3.3, max_a: 0.3, ripple_mv_pp: 30}
  currents: []
signal_groups:
  - {name: AIN, nets: [AIN0_P, AIN0_N, AIN1_P, AIN1_N], type: diff_pair, max_length_mm: 30, max_skew_mm: 0.5, keep_away_mm: 3.0, reference_layer: L2, no_vias: true, notes: "symmetric routing from sensor connector through RC anti-alias filter to ADC; filter caps at the ADC pins; guard ring tied to the amplifier's reference if the source impedance is high"}
  - {name: ADC_SPI, nets: [ADC_SCK, ADC_MOSI, ADC_MISO, ADC_CS_N, ADC_DRDY], type: bus, max_length_mm: 50, notes: "digital side only; cross the analog/digital boundary once, over unbroken ground; series 33 ohm on SCK"}
  - {name: EXC, nets: [EXC_P, EXC_N], type: critical_analog, max_length_mm: 30, notes: "bridge excitation; ratiometric measurement, REF taken from the same excitation"}
placement:
  fixed:
    - {ref: J_SENS, reason: "sensor connector at the analog edge"}
  rules:
    - "Partition the board: analog on one side, digital on the other, ADC on the boundary with its analog pins facing analog and digital pins facing digital. One ground plane, no split."
    - "Reference and AVDD decoupling within 2 mm of the pins; vias to L2 at the pad."
    - "Anti-alias filter components within 5 mm of the ADC input pins."
    - "No switching regulator on this board; if unavoidable, at the far digital corner with an LC post filter and a ground via fence."
    - "Keep the analog section away from board edges that face the enclosure wall if the enclosure is not grounded."
  keep_out:
    - {area: "under the AFE on L3 and L4", reason: "no digital traces or power plane edges under analog"}
mechanical: {outline: "TODO", max_height_top_mm: 10, max_height_bottom_mm: 3, mounting: "TODO; mounting holes tied to chassis only at the analog edge or not at all, decide"}
thermal:
  - {ref: U_REF, dissipation_w: 0.01, rule: "away from the LDO and MCU; thermal gradients cause reference drift"}
emc:
  - "Single unbroken L2 ground. Partition by placement, not by slots."
  - "Digital signals never cross the analog region on any layer."
  - "Cable shield to chassis at the connector, not to signal ground."
  - "Series resistors on every digital line leaving the ADC."
bom_policy: {preferred_vendors: [lcsc, mouser, digikey], avoid: ["end-of-life"], substitutions: "no substitution of reference, amplifiers, ADC, 0.1 percent resistors or C0G/NP0 filter caps without engineer approval", max_extended_parts: 15}
open_questions:
  - "Required resolution and bandwidth? Sets filter corner and whether a buffer is needed."
  - "Sensor cable length and shielding?"
---
# Notes
Analog boards fail on partitioning and on return currents, not on trace width. The template forbids ground
splits (they create more problems than they solve for agents and most humans), insists on placement
partitioning, and protects the reference. Agents are good at checking "is every filter cap within 5 mm";
let them do that and keep the amplifier choice to yourself.
