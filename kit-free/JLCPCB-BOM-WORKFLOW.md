# JLCPCB BOM workflow for agents

Goal: a BOM where as many parts as possible are JLCPCB **basic** parts (no per-part loading fee), every
remaining **extended** part is justified, nothing is out of stock, and every line has an LCSC part number.
Run these prompts in order inside your agent session in the project directory. Each step produces a file
the next step consumes, so the agent cannot skip ahead.

## Step 0: Export the current BOM
```
Run: kicad-cli sch export bom --fields "Reference,Value,Footprint,LCSC Part #,MPN,Manufacturer,DNP" --group-by Value,Footprint --output production/bom.csv <project>.kicad_sch
Then show me the first 20 lines and the total line count. Do not change anything.
```

## Step 1: Classify every line
```
For every line in production/bom.csv produce a table: Reference(s), Value, Footprint, LCSC Part #, status.
Status is one of: has-lcsc, missing-lcsc, dnp. Count each status. Save the table as production/bom-status.md.
```

## Step 2: Fill missing LCSC numbers (propose, do not decide)
```
For each missing-lcsc line propose up to 3 candidate LCSC parts. For each candidate give: LCSC number,
manufacturer, MPN, package, key specs that match the schematic value (voltage, tolerance, current,
temperature), basic or extended, unit price at 100 pcs, stock. Cite the JLCPCB/LCSC page you used for
each number. Mark the candidate you would pick and why in one line. Write everything to
production/bom-candidates.md. Do not edit the schematic.
```
Reviewer note: check the specs yourself for anything non-trivial (regulators, MCUs, crystals, connectors).
Passives are usually safe to accept.

## Step 3: Basic vs extended optimisation
```
From production/bom-status.md list every extended part. For each, search for a basic-library part with
equal or better specs in the same footprint. Produce a table: current part, proposed basic part, spec
difference, saving at <quantity> boards (loading fee plus unit price delta). Flag any proposal where the
spec is not strictly equal or better. Save as production/bom-basic-swaps.md.
Do not apply any swap.
```

## Step 4: Stock and lifecycle
```
For every LCSC part in the final list check current stock against <quantity> boards plus 10 % attrition.
Flag: stock below requirement, "not recommended for new design" or discontinued status, and single-source
parts with no basic alternative. Save as production/bom-stock.md.
```

## Step 5: Apply approved changes only
After you have read Steps 2 to 4 and decided:
```
Apply exactly these changes to the schematic symbol fields and nothing else: <paste the lines you approve>.
Use the KiCad IPC API or kicad-cli where possible; if you edit the .kicad_sch directly, back it up to
backups/ first. Afterwards re-export the BOM, run ERC, and show me a diff of production/bom.csv.
```

## Step 6: Final export for ordering
```
Regenerate: BOM (production/bom.csv), CPL (kicad-cli pcb export pos --format csv --units mm --side both
--output production/cpl.csv), Gerbers and drill files into production/gerbers/. Zip the gerbers.
List extended-part count, total unique parts, and estimated component cost for <quantity> boards.
```

## Rules the agent must follow during this workflow
- Never change a Value to make a part match. The schematic value is the spec; the part must meet it.
- A swap that changes voltage rating, tolerance, temperature coefficient, package or pinout always needs approval.
- Record every applied change in docs/CHANGES.md with date, reference, old part, new part, reason.
- Prices and stock change daily. Every number comes with the date and the URL it came from.
