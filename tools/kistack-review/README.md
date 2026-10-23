# kistack-review

One command that runs KiCad's own checks (DRC, ERC, BOM export), compares your project rules with a
fab's published minimums, and turns the result into:

- `REPORT.md` - a readable review: counts by severity, pass/fail per check, DRC/ERC findings grouped by
  type with top locations, a fab rule comparison table, BOM findings and next steps.
- `AGENT_PROMPT.md` - a prompt to paste into Claude Code, Codex or OpenCode. It embeds the report, tells
  the agent to triage by severity, to fix only mechanical items on its own, and to **ask you** before
  touching placement, outline, layer count, part substitutions or net classes. It ends with a checklist
  of questions for you.
- `summary.json` - the same data for scripts and CI.

Python 3.10+, standard library only. No KiCad Python bindings needed; `kicad-cli` is optional.

## Install

```sh
pipx install ./tools/kistack-review
# or
cd tools/kistack-review && pip install .
# or run from the tree without installing
PYTHONPATH=tools/kistack-review python3 -m kistack_review.cli --help
```

## Usage

### Mode 1: `kicad-cli` is installed (KiCad 8.0 / 9.0)

```sh
kistack-review --board hw/demo.kicad_pcb --fab jlcpcb --out review/
```

With only `--board`, the tool looks for `demo.kicad_sch` and `demo.kicad_pro` next to it and runs:

```sh
kicad-cli pcb drc --format json --severity-all --schematic-parity --output review/drc.json hw/demo.kicad_pcb
kicad-cli sch erc --format json --severity-all --output review/erc.json hw/demo.kicad_sch
kicad-cli sch export bom --fields "Reference,Value,Footprint,LCSC Part #,MPN,Manufacturer,${DNP}" \
    --labels "Reference,Value,Footprint,LCSC Part #,MPN,Manufacturer,DNP" --output review/bom.csv hw/demo.kicad_sch
```

`--schematic-parity` is only added when a schematic is known. The BOM export passes explicit `--labels`
because kicad-cli's default labels (`Refs,Value,Footprint,Qty,DNP`) do not line up with a custom field list.
Use `--kicad-cli /path/to/kicad-cli` if it is not on `PATH` (the macOS app bundle path is tried automatically).

### Mode 2: no `kicad-cli` here, reports generated elsewhere

Generate the files on a machine with KiCad (or in CI with the `kicad/kicad:8.0` container), then:

```sh
kistack-review --board hw/demo.kicad_pcb --project hw/demo.kicad_pro \
    --drc-json drc.json --erc-json erc.json --bom-csv bom.csv \
    --fab jlcpcb --process standard-2l --out review/
```

Any input you pass as a file is used as-is; anything missing is either run with `kicad-cli` (if found) or
reported in the output with the exact command to generate it. `--no-kicad-cli` disables running it entirely.

### All flags

```
--board X.kicad_pcb        board file (schematic/project auto-detected next to it)
--schematic X.kicad_sch    root schematic
--project X.kicad_pro      project file (design rules + net classes)
--fab NAME                 jlcpcb | pcbway | oshpark | aisler | eurocircuits
--process ID               process id in the fab profile (default: standard-2l, else the first listed)
--fab-profiles DIR         directory of fab profile JSON (default: ../../kit-pro/fab-profiles relative
                           to the package; also $KISTACK_FAB_PROFILES)
--drc-json FILE            pre-generated `kicad-cli pcb drc --format json` output
--erc-json FILE            pre-generated `kicad-cli sch erc --format json` output
--bom-csv FILE             pre-generated BOM CSV
--out DIR                  output directory (default ./kistack-review-out)
--kicad-cli PATH           explicit kicad-cli binary
--no-kicad-cli             never run kicad-cli
-v / -q                    verbose / quiet logging (stderr)
```

Exit codes: `0` report produced (even if checks fail), `2` nothing to do (no kicad-cli and no input files;
the exact commands to run are printed), `1` an error (unreadable input, kicad-cli failed). On `1` the report
is still written when anything could be checked.

## What is checked

| Check | Source | Pass / warn / fail |
| --- | --- | --- |
| DRC | `violations[]` | fail on any non-excluded `error`, warn on `warning`/`action` |
| Unconnected items | `unconnected_items[]` | same |
| Schematic parity | `schematic_parity[]` | same (needs `--schematic-parity` / a project) |
| ERC | `sheets[].violations[]` | same, per sheet |
| Fab rules | `.kicad_pro` vs fab profile | fail when any project rule or net class is **looser** than the fab minimum |
| BOM | CSV | fail on empty Value/Footprint, missing `LCSC Part #` (JLCPCB), one MPN with different values |

Fab comparison covers `board.design_settings.rules` (`min_clearance`, `min_track_width`, `min_via_diameter`,
`min_via_annular_width`, `min_through_hole_diameter`, `min_hole_to_hole`, `min_hole_clearance`,
`min_copper_edge_clearance`, `min_text_thickness`, `min_text_height`) and every `net_settings.classes[]` entry
(`clearance`, `track_width`, `via_diameter`, `via_drill`, plus the derived annular ring). A project value of `0`
counts as looser because KiCad then does not enforce the rule. Values the profile lists as `null`, or rules
with no fab equivalent (`min_silk_clearance`), are reported as `unknown`, never guessed.

Fab profiles follow `kit-pro/fab-profiles/SCHEMA.md`. A small example lives in `tests/fixtures/fab-profiles/jlcpcb.json`
(fixture values, not authoritative). If the profile directory or file is missing the comparison is skipped
with a note; nothing crashes.

BOM columns are matched case-insensitively with common aliases (`Refs`, `Designator`, `LCSC`, `JLCPCB Part #`,
`Manufacturer Part Number`, ...). Grouped references (`R1, R2` or `R1-R3`) are expanded for counting.
Rows whose DNP column is non-empty are not required to have an LCSC part.

## Using the agent prompt

1. Run `kistack-review`, open `review/AGENT_PROMPT.md`.
2. Paste it into your agent as the first message of a session started in the hardware repo:
   - **Claude Code**: `claude` then paste, or `claude "$(cat review/AGENT_PROMPT.md)"`.
   - **Codex**: `codex "$(cat review/AGENT_PROMPT.md)"`.
   - **OpenCode**: start a session in the repo and paste the file, or reference it with `@review/AGENT_PROMPT.md`.
3. The prompt makes the agent present a triage table first, fix only cosmetic/mechanical items
   (silkscreen overlaps, missing courtyards, trivial courtyard overlaps, missing values) on its own, re-run
   DRC after each batch, and ask you before anything involving placement, outline, layer count, part
   substitution, net classes or design rules. Answer the checklist at the end of the prompt and the agent
   can proceed with the judgement-based items.
4. Re-run `kistack-review` afterwards and compare `summary.json` before/after.

## Limitations

- **No spatial judgement.** The tool relays what KiCad's DRC/ERC report and compares numbers in your
  project file against a fab profile. It cannot tell whether a clearance violation is a real short or a
  deliberate exclusion, whether a layout is routable at the fab minimums, or anything about thermal, EMI,
  impedance or mechanical fit. Those decisions stay with the engineer; the agent prompt says so explicitly.
- **Relies on KiCad's DRC.** If the project rules are looser than the fab's, KiCad's DRC will pass boards
  the fab cannot build; the fab rule comparison exists to catch exactly that, but only for the numbers the
  profile and the `.kicad_pro` expose. Custom `.kicad_dru` rules are not parsed.
- Fab profiles are snapshots. Verify the fab's capability page before ordering; the report prints the
  profile's `retrieved` date.
- BOM checks are structural (empty fields, inconsistent MPNs). They do not validate part numbers against
  any distributor.
- Severity in the JSON is the project's configured severity for each rule; a rule set to "ignore" in the
  project never appears in the report.

## kicad-cli versions and JSON shape

Built against KiCad **8.0.x** `kicad-cli` and verified against the 8.0 source
(`include/rc_json_schema.h`, `pcbnew/drc/drc_report.cpp`, `eeschema/erc_report.cpp`, `common/rc_item.cpp`)
and <https://docs.kicad.org/8.0/en/cli/cli.html>. KiCad **9.0** writes the same `drc.v1.json` / `erc.v1.json`
documents and accepts the same flags, so it is expected to work unchanged.

DRC (`$schema: https://schemas.kicad.org/drc.v1.json`):

```json
{
  "$schema": "https://schemas.kicad.org/drc.v1.json",
  "source": "demo-board.kicad_pcb",
  "date": "2026-10-23T09:14:02+0200",
  "kicad_version": "8.0.9",
  "coordinate_units": "mm",
  "violations": [
    {"type": "clearance", "description": "Clearance violation (...)", "severity": "error", "excluded": false,
     "items": [{"description": "Track [Net-(R1-Pad1)] on F.Cu, length 3.2500 mm", "pos": {"x": 112.4, "y": 58.75}, "uuid": "..."}]}
  ],
  "unconnected_items": [],
  "schematic_parity": []
}
```

ERC (`$schema: https://schemas.kicad.org/erc.v1.json`) has the same header and
`"sheets": [{"path": "/", "uuid_path": "/<root-uuid>", "violations": [...]}]`.
`severity` is one of `error`, `warning`, `action`, `info`, `exclusion`, `debug`; `excluded` is a bool.

Uncertainties, in case your reports differ (the parser is tolerant of all of these):

- `date` comes from `GetISO8601CurrentDateTime()`; the exact timezone suffix format was not verified.
- `source` is the file name only (`fn.GetFullName()`), not a full path.
- `uuid_path` for the root sheet is assumed to be `/<root-uuid>`; `path` is `/` for root and `/Name/` for
  sub-sheets (from `PathHumanReadable()`). The parser only uses `path` for display.
- Position values are in `coordinate_units` (`--units`, default `mm`); the report prints whatever unit the
  file declares.
- The BOM export flags above are from the 8.0 docs; the default `--fields` of kicad-cli differs, which is
  why the tool passes them explicitly.

## Development

```sh
python3 -m unittest discover -s tools/kistack-review/tests
python3 -m compileall tools/kistack-review/kistack_review
```

Package layout: `kistack_review/{cli,kicad,parse,fab,bom,report}.py`; fixtures with realistic DRC/ERC JSON,
a `.kicad_pro`, a BOM CSV and an example fab profile live in `tests/fixtures/`.
