# Fab profile schema (shared contract)

One JSON file per fab: `kit-pro/fab-profiles/<fab>.json`. Units are millimetres unless the key says otherwise.
Every numeric value must be traceable to a `sources` URL. Unknown values are `null`, never guessed.

```json
{
  "schema_version": 1,
  "fab": "jlcpcb",
  "name": "JLCPCB",
  "country": "CN",
  "retrieved": "2026-10-23",
  "sources": ["https://..."],
  "verify_note": "Capabilities change. Verify on the fab's capability page before ordering.",
  "processes": [
    {
      "id": "standard-2l",
      "label": "Standard 1-2 layer, 1 oz",
      "layers": [1, 2],
      "copper_weight_oz": [1],
      "min_track_mm": 0.127,
      "min_clearance_mm": 0.127,
      "min_via_drill_mm": 0.3,
      "min_via_diameter_mm": 0.5,
      "min_annular_ring_mm": 0.13,
      "min_pth_drill_mm": 0.3,
      "max_pth_drill_mm": 6.3,
      "min_npth_drill_mm": null,
      "min_hole_to_copper_mm": 0.254,
      "min_hole_to_hole_mm": 0.5,
      "min_slot_width_mm": null,
      "min_board_edge_to_copper_mm": 0.3,
      "min_silkscreen_line_mm": 0.15,
      "min_silkscreen_text_height_mm": 1.0,
      "min_soldermask_bridge_mm": null,
      "soldermask_expansion_mm": null,
      "board_thickness_mm": [0.6, 0.8, 1.0, 1.2, 1.6, 2.0],
      "min_board_size_mm": [10, 10],
      "max_board_size_mm": [400, 500],
      "castellated_holes": true,
      "impedance_control": false,
      "surface_finishes": ["HASL", "LeadFree HASL", "ENIG"],
      "stackups": [],
      "notes": ["..."]
    },
    {
      "id": "standard-4l",
      "label": "Standard 4 layer, 1 oz outer / 0.5 oz inner",
      "layers": [4],
      "stackups": [
        {"name": "JLC04161H-7628", "thickness_mm": 1.6, "layers": 4, "notes": "...", "source": "https://..."}
      ]
    }
  ],
  "assembly": {
    "available": true,
    "notes": ["Basic vs extended parts: extended parts add a per-part fee."],
    "required_bom_fields": ["LCSC Part #"],
    "sources": ["https://..."]
  },
  "file_requirements": {
    "gerber_format": "RS-274X",
    "drill_format": "Excellon",
    "notes": ["..."]
  },
  "kicad_dru_file": "jlcpcb-standard-2l.kicad_dru"
}
```

Each process also gets a KiCad custom design rules file `kit-pro/fab-profiles/dru/<fab>-<process-id>.kicad_dru`
expressing the fab minimums as `(rule ...)` constraints (track_width, clearance, hole_size, annular_width,
hole_to_hole, edge_clearance, silk_clearance where applicable), plus a short header comment with source and date.
