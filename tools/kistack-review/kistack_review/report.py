"""Rendering of ``REPORT.md``, ``AGENT_PROMPT.md`` and ``summary.json``."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import __version__
from .bom import BomResult
from .fab import Comparison, FabResult
from .parse import DrcReport, ErcReport, TypeGroup, Violation, active, count_by_severity, group_by_type

log = logging.getLogger("kistack_review")

#: Violation types an agent may fix on its own (cosmetic / mechanical, no electrical meaning).
MECHANICAL_TYPES: tuple[str, ...] = (
    "silk_overlap",
    "silk_over_copper",
    "silk_edge_clearance",
    "courtyards_overlap",
    "missing_courtyard",
    "malformed_courtyard",
    "text_height",
    "text_thickness",
    "mirrored_text",
    "unresolved_variable",
    "lib_footprint_mismatch",
    "lib_footprint_issues",
)

#: Violation types that always need the engineer's decision.
ASK_FIRST_TYPES: tuple[str, ...] = (
    "clearance",
    "track_width",
    "annular_width",
    "hole_clearance",
    "hole_near_hole",
    "holes_co_located",
    "via_diameter",
    "drill_out_of_range",
    "copper_edge_clearance",
    "invalid_outline",
    "items_not_allowed",
    "shorting_items",
    "unconnected_items",
    "net_conflict",
    "footprint_type_mismatch",
    "missing_footprint",
    "extra_footprint",
    "duplicate_footprints",
    "footprint_symbol_mismatch",
    "zones_intersect",
    "isolated_copper",
    "starved_thermal",
    "connection_width",
    "length_out_of_range",
    "skew_out_of_range",
    "diff_pair_gap_out_of_range",
    "diff_pair_uncoupled_length_too_long",
    "padstack",
    "solder_mask_bridge",
)

MAX_LOCATIONS = 3
MAX_LIST = 20


@dataclass
class CheckStatus:
    """Pass/fail of one check for the summary table."""

    name: str
    status: str  # pass | warn | fail | skipped
    detail: str = ""


@dataclass
class Review:
    """Everything gathered by the CLI, handed to the renderers."""

    board: Path | None = None
    schematic: Path | None = None
    project: Path | None = None
    out_dir: Path = Path(".")
    generated: str = ""
    kicad_cli: str | None = None
    kicad_cli_version: str | None = None
    drc: DrcReport | None = None
    erc: ErcReport | None = None
    fab: FabResult | None = None
    bom: BomResult | None = None
    drc_source: str = ""
    erc_source: str = ""
    bom_source: str = ""
    notes: list[str] = field(default_factory=list)
    commands: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- helpers


def _fmt_mm(value: float | None) -> str:
    """Format a millimetre value or a dash."""
    return "-" if value is None else f"{value:.3f}".rstrip("0").rstrip(".") + " mm"


def _md_table(headers: list[str], rows: list[list[str]]) -> str:
    """Render a Markdown table."""
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join(" --- " for _ in headers) + "|"]
    lines += ["| " + " | ".join(_cell(c) for c in row) + " |" for row in rows]
    return "\n".join(lines)


def _cell(text: str) -> str:
    """Escape pipes and newlines inside a table cell."""
    return text.replace("|", "\\|").replace("\n", " ")


def _truncate(items: list[str], limit: int = MAX_LIST) -> str:
    """Join a list, eliding anything past ``limit``."""
    if len(items) <= limit:
        return ", ".join(items)
    return ", ".join(items[:limit]) + f" ... (+{len(items) - limit} more)"


def _rc_status(violations: list[Violation]) -> tuple[str, str]:
    """Pass/warn/fail for a set of rule-check violations plus a short detail."""
    counts = count_by_severity(violations)
    detail = ", ".join(f"{n} {sev}" for sev, n in counts.items()) or "no findings"
    if counts.get("error"):
        return "fail", detail
    if counts.get("warning") or counts.get("action"):
        return "warn", detail
    return "pass", detail


def check_statuses(review: Review) -> list[CheckStatus]:
    """Compute the per-check status rows used in the Summary section."""
    checks: list[CheckStatus] = []
    if review.drc is None:
        checks.append(CheckStatus("DRC", "skipped", "no DRC report"))
        checks.append(CheckStatus("Unconnected items", "skipped", "no DRC report"))
        checks.append(CheckStatus("Schematic parity", "skipped", "no DRC report"))
    else:
        checks.append(CheckStatus("DRC", *_rc_status(review.drc.violations)))
        checks.append(CheckStatus("Unconnected items", *_rc_status(review.drc.unconnected_items)))
        parity_status = "skipped" if not review.drc.schematic_parity else _rc_status(review.drc.schematic_parity)[0]
        parity_detail = _rc_status(review.drc.schematic_parity)[1] if review.drc.schematic_parity else "none reported (run DRC with --schematic-parity)"
        checks.append(CheckStatus("Schematic parity", parity_status, parity_detail))
    if review.erc is None:
        checks.append(CheckStatus("ERC", "skipped", "no ERC report"))
    else:
        checks.append(CheckStatus("ERC", *_rc_status(review.erc.all())))
    if review.fab is None:
        checks.append(CheckStatus("Fab rules", "skipped", "no --fab given"))
    else:
        unknown = sum(1 for c in review.fab.comparisons if c.status == "unknown")
        detail = f"{len(review.fab.looser)} looser, {unknown} unknown of {len(review.fab.comparisons)}"
        if review.fab.status == "skipped":
            detail = "; ".join(review.fab.notes) or "nothing compared"
        checks.append(CheckStatus("Fab rules", review.fab.status, detail))
    if review.bom is None:
        checks.append(CheckStatus("BOM", "skipped", "no BOM"))
    else:
        checks.append(CheckStatus("BOM", review.bom.status, f"{review.bom.problems} problems in {review.bom.rows} rows"))
    return checks


def _status_icon(status: str) -> str:
    return {"pass": "PASS", "warn": "WARN", "fail": "FAIL", "skipped": "SKIP"}.get(status, status.upper())


# --------------------------------------------------------------------------- sections


def _render_inputs(review: Review) -> list[str]:
    lines = ["## Inputs", ""]
    lines.append(f"- Board: `{review.board}`" if review.board else "- Board: (none)")
    lines.append(f"- Schematic: `{review.schematic}`" if review.schematic else "- Schematic: (none)")
    lines.append(f"- Project: `{review.project}`" if review.project else "- Project: (none)")
    if review.drc_source:
        lines.append(f"- DRC report: {review.drc_source}")
    if review.erc_source:
        lines.append(f"- ERC report: {review.erc_source}")
    if review.bom_source:
        lines.append(f"- BOM: {review.bom_source}")
    cli = review.kicad_cli or "not found"
    if review.kicad_cli_version:
        cli += f" ({review.kicad_cli_version})"
    lines.append(f"- kicad-cli: {cli}")
    for cmd in review.commands:
        lines.append(f"- Ran: `{cmd}`")
    lines.append("")
    return lines


def _render_summary(review: Review) -> list[str]:
    lines = ["## Summary", ""]
    rows = [[c.name, _status_icon(c.status), c.detail] for c in check_statuses(review)]
    lines.append(_md_table(["Check", "Status", "Detail"], rows))
    lines.append("")
    if review.drc is not None:
        counts = count_by_severity(review.drc.all())
        lines.append("DRC counts by severity: " + (", ".join(f"**{n}** {s}" for s, n in counts.items()) or "none"))
    if review.erc is not None:
        counts = count_by_severity(review.erc.all())
        lines.append("ERC counts by severity: " + (", ".join(f"**{n}** {s}" for s, n in counts.items()) or "none"))
    lines.append("")
    for note in review.errors:
        lines.append(f"- **Error:** {note}")
    for note in review.notes:
        lines.append(f"- Note: {note}")
    if review.errors or review.notes:
        lines.append("")
    return lines


def _render_group(group: TypeGroup, units: str, show_sheet: bool = False) -> list[str]:
    """Render one type group with its top locations."""
    lines = [f"### `{group.type}` - {group.count} x {group.severity}", ""]
    first = group.violations[0]
    if first.description:
        lines.append(f"Example: {first.description}")
        lines.append("")
    for v in group.violations[:MAX_LOCATIONS]:
        where = f" (sheet `{v.sheet}`)" if show_sheet and v.sheet else ""
        if v.primary is None:
            lines.append(f"- {v.description or group.type}{where}")
            continue
        lines.append(f"- {v.primary.description} @ {v.primary.format_pos(units)}{where}")
        for extra in v.items[1:2]:
            lines.append(f"  - with {extra.description} @ {extra.format_pos(units)}")
    if group.count > MAX_LOCATIONS:
        lines.append(f"- ... {group.count - MAX_LOCATIONS} more of this type")
    lines.append("")
    return lines


def _render_rc_section(title: str, violations: list[Violation], units: str, show_sheet: bool, empty: str) -> list[str]:
    lines = [f"## {title}", ""]
    groups = group_by_type(violations)
    if not groups:
        lines += [empty, ""]
        return lines
    excluded = len(violations) - len(active(violations))
    lines.append(f"{len(active(violations))} active findings in {len(groups)} types" + (f", {excluded} excluded" if excluded else "") + ".")
    lines.append("")
    for group in groups:
        lines += _render_group(group, units, show_sheet)
    return lines


def _render_drc(review: Review) -> list[str]:
    if review.drc is None:
        return ["## DRC findings", "", "DRC was not run and no `--drc-json` was given.", ""]
    drc = review.drc
    lines = _render_rc_section("DRC findings", drc.violations, drc.units, False, "No DRC violations reported.")
    if drc.unconnected_items:
        lines += _render_rc_section("Unconnected items", drc.unconnected_items, drc.units, False, "")
    if drc.schematic_parity:
        lines += _render_rc_section("Schematic parity", drc.schematic_parity, drc.units, False, "")
    return lines


def _render_erc(review: Review) -> list[str]:
    if review.erc is None:
        return ["## ERC findings", "", "ERC was not run and no `--erc-json` was given.", ""]
    lines = _render_rc_section("ERC findings", review.erc.all(), review.erc.units, True, "No ERC violations reported.")
    sheets = ", ".join(f"`{s.path}` ({len(active(s.violations))})" for s in review.erc.sheets)
    if sheets:
        lines.insert(2, f"Sheets: {sheets}")
        lines.insert(3, "")
    return lines


def _comparison_row(c: Comparison) -> list[str]:
    status = {"ok": "ok", "looser": "**LOOSER**", "unknown": "unknown"}[c.status]
    return [c.scope, c.rule, _fmt_mm(c.project_value), _fmt_mm(c.fab_min), status, c.note]


def _render_fab(review: Review) -> list[str]:
    lines = ["## Fab rule comparison", ""]
    fab = review.fab
    if fab is None:
        lines += ["No `--fab` given; skipped.", ""]
        return lines
    if fab.profile is not None:
        process = f" / process `{fab.process.id}` ({fab.process.label})" if fab.process else ""
        lines.append(f"Fab: **{fab.profile.name}**{process}. Profile retrieved {fab.profile.retrieved or 'n/a'}.")
        if fab.verify_note_text():
            lines.append(fab.verify_note_text())
        lines.append("")
    for note in fab.notes:
        lines.append(f"- {note}")
    if fab.notes:
        lines.append("")
    if fab.comparisons:
        lines.append(f"Project: `{fab.project_path}`")
        lines.append("")
        lines.append(_md_table(["Scope", "Rule", "Project", "Fab minimum", "Status", "Note"], [_comparison_row(c) for c in fab.comparisons]))
        lines.append("")
        if fab.looser:
            lines.append(f"**{len(fab.looser)} setting(s) are looser than what {fab.profile.name if fab.profile else fab.fab} can build.** "
                         "KiCad's DRC will not catch these; tighten the project rules or net classes, then re-run DRC.")
            lines.append("")
    return lines


def _render_bom(review: Review) -> list[str]:
    lines = ["## BOM findings", ""]
    bom = review.bom
    if bom is None:
        lines += ["No BOM checked (no `--bom-csv` and no kicad-cli export).", ""]
        return lines
    lines.append(f"`{bom.path}`: {bom.rows} rows, {bom.components} components, columns: {', '.join(bom.columns)}")
    lines.append("")
    rows = [
        ["Empty Value", str(len(bom.empty_value)), _truncate(bom.empty_value)],
        ["Empty Footprint", str(len(bom.empty_footprint)), _truncate(bom.empty_footprint)],
    ]
    if bom.lcsc_required:
        rows.append(["Missing LCSC Part #", str(len(bom.missing_lcsc)), _truncate(bom.missing_lcsc) if bom.lcsc_column_present else "no LCSC column"])
    rows.append(["MPN with conflicting values", str(len(bom.mpn_conflicts)), "; ".join(f"{m}: {' / '.join(v)}" for m, v in list(bom.mpn_conflicts.items())[:MAX_LIST])])
    rows.append(["DNP parts", str(len(bom.dnp_refs)) if bom.dnp_column_present else "-", _truncate(bom.dnp_refs) if bom.dnp_column_present else "no DNP column"])
    lines.append(_md_table(["Check", "Count", "References"], rows))
    lines.append("")
    for note in bom.notes:
        lines.append(f"- {note}")
    if bom.notes:
        lines.append("")
    return lines


def next_steps(review: Review) -> list[str]:
    """Actionable, ordered next steps derived from the findings."""
    steps: list[str] = []
    if review.drc is not None:
        errors = [v for v in active(review.drc.violations) if v.severity == "error"]
        if errors:
            steps.append(f"Fix the {len(errors)} DRC error(s) first; a fab will reject or silently alter a board that fails its minimums.")
        if active(review.drc.unconnected_items):
            steps.append(f"Route the {len(active(review.drc.unconnected_items))} unconnected item(s) or confirm they are intentional.")
        if active(review.drc.schematic_parity):
            steps.append("Resolve schematic/PCB parity issues (update PCB from schematic or vice versa) before anything else moves.")
    if review.erc is not None and active(review.erc.all()):
        steps.append(f"Work through the {len(active(review.erc.all()))} ERC finding(s); add power flags / no-connect markers where the design is actually fine.")
    if review.fab is not None and review.fab.looser:
        steps.append("Tighten the project rules and net classes listed as LOOSER, then re-run DRC: KiCad only checks what the project allows.")
    if review.bom is not None and review.bom.problems:
        steps.append("Fill in the BOM gaps (values, footprints, LCSC part numbers) and resolve MPN conflicts before ordering assembly.")
    if review.drc is None:
        steps.append("Run DRC (`kicad-cli pcb drc --format json --severity-all --output drc.json <board>`) and re-run with `--drc-json`.")
    if review.erc is None:
        steps.append("Run ERC (`kicad-cli sch erc --format json --severity-all --output erc.json <schematic>`) and re-run with `--erc-json`.")
    if review.fab is None:
        steps.append("Pass `--fab <name>` to compare the project rules with a fab's published minimums.")
    if review.fab is not None and review.fab.profile is not None:
        steps.append(f"Verify {review.fab.profile.name}'s current capability page before ordering; the profile was retrieved {review.fab.profile.retrieved or 'on an unknown date'}.")
    if not steps:
        steps.append("All checks passed. Export gerbers/drill and do a final visual review of the fab preview.")
    return steps


def _render_next_steps(review: Review) -> list[str]:
    lines = ["## Next steps", ""]
    lines += [f"{i}. {step}" for i, step in enumerate(next_steps(review), start=1)]
    lines.append("")
    return lines


def render_report(review: Review) -> str:
    """Render the full ``REPORT.md``."""
    title = review.board.name if review.board else (review.schematic.name if review.schematic else "KiCad project")
    lines = [f"# kistack-review: {title}", "", f"Generated {review.generated} by kistack-review {__version__}.", ""]
    lines += _render_summary(review)
    lines += _render_inputs(review)
    lines += _render_drc(review)
    lines += _render_erc(review)
    lines += _render_fab(review)
    lines += _render_bom(review)
    lines += _render_next_steps(review)
    return "\n".join(lines).rstrip() + "\n"


# --------------------------------------------------------------------------- agent prompt


def engineer_questions(review: Review) -> list[str]:
    """Questions the agent must put to the engineer before touching anything judgement-based."""
    questions: list[str] = []
    seen_types: set[str] = set()
    if review.drc is not None:
        for v in active(review.drc.all()):
            if v.type in ASK_FIRST_TYPES and v.type not in seen_types:
                seen_types.add(v.type)
                questions.append(f"DRC `{v.type}`: {v.description or 'see report'} - how do you want this resolved (re-route, move parts, change rule, or accept)?")
    if review.erc is not None:
        for v in active(review.erc.all()):
            if v.type not in seen_types:
                seen_types.add(v.type)
                questions.append(f"ERC `{v.type}` on sheet `{v.sheet}`: {v.description or 'see report'} - is this a real design issue or should it be marked intentional (no-connect / power flag / exclusion)?")
    if review.fab is not None:
        for c in review.fab.looser:
            questions.append(f"{c.scope} {c.rule} is {_fmt_mm(c.project_value)} but the fab minimum is {_fmt_mm(c.fab_min)} - may I raise it to the fab minimum, or do you want a different process/fab?")
    if review.bom is not None:
        if review.bom.empty_value or review.bom.empty_footprint:
            questions.append("Some BOM lines have no Value or Footprint - which parts are they, and should they be DNP?")
        if review.bom.lcsc_required and review.bom.missing_lcsc:
            questions.append(f"{len(review.bom.missing_lcsc)} placed part(s) have no LCSC Part # - shall I propose LCSC candidates for you to approve, or will you fill them in?")
        for mpn, values in review.bom.mpn_conflicts.items():
            questions.append(f"MPN `{mpn}` is used with different values ({' / '.join(values)}) - which is correct?")
    questions.append("Is the layer count, board outline and stack-up final? I will not change any of these without your explicit go-ahead.")
    questions.append("Which fab, process and surface finish are you ordering, so I can check against the right minimums?")
    return questions


def render_agent_prompt(review: Review, report_md: str) -> str:
    """Render ``AGENT_PROMPT.md`` for Claude Code / Codex / OpenCode."""
    board = f"`{review.board}`" if review.board else "the KiCad project"
    lines = [
        "# Review task: work through the kistack-review findings",
        "",
        "You are helping a hardware engineer bring a KiCad design to a manufacturable state.",
        f"A review of {board} was generated by kistack-review; the full report is embedded below.",
        "",
        "## Rules of engagement (read before touching any file)",
        "",
        "1. **Triage by severity.** Work through `error` first, then `warning`, then `action`/`info`.",
        "   Within a severity, start with the type that has the most instances. Present the triage list to",
        "   the engineer before you change anything.",
        "2. **Ask before editing** for anything that involves component placement, the board outline or edge cuts,",
        "   layer count or stack-up, part substitution (different MPN/LCSC part or value), net class or design",
        "   rule changes, routing changes that alter nets, or anything affecting impedance/current capacity.",
        "   Describe the proposed change, which items it touches (reference designators, UUIDs, coordinates),",
        "   and wait for an explicit yes.",
        "3. **Fix autonomously only mechanical items**: silkscreen overlaps and silk-over-pad (move/shrink text),",
        "   missing or malformed courtyards, trivial courtyard overlaps where nudging a reference designator or",
        "   adding a courtyard line fixes it, missing field values that are unambiguous from the symbol, and",
        "   text size/thickness below minimum. Never move a footprint or a track to do this.",
        "   Mechanical DRC types: " + ", ".join(f"`{t}`" for t in MECHANICAL_TYPES) + ".",
        "4. **Do not mark anything as excluded** in KiCad to make a check pass. Exclusions are the engineer's call.",
        "5. **Verify after each batch**: re-run `kicad-cli pcb drc --format json --severity-all` (and `sch erc`) and",
        "   confirm the count for the type you worked on went down and nothing new appeared. Keep a log of",
        "   what changed, in which file, and why.",
        "6. **Edit KiCad files carefully.** `.kicad_pcb`/`.kicad_sch` are s-expressions; keep UUIDs, do not",
        "   reformat untouched sections, and prefer the KiCad Python API or kicad-cli where available.",
        "7. kistack-review has **no spatial judgement**: it only relays KiCad's DRC/ERC and compares numbers.",
        "   Anything about electrical intent, thermal, EMI or mechanical fit is for the engineer to decide.",
        "",
        "## Deliverables",
        "",
        "- A triage table (type, severity, count, proposed action: fix / ask / accept).",
        "- The mechanical fixes applied, with a before/after DRC count.",
        "- The list of questions below, answered by the engineer, before any judgement-based change.",
        "",
        "---",
        "",
        "## Embedded report",
        "",
        report_md.rstrip(),
        "",
        "---",
        "",
        "## Questions for the engineer (ask these before any non-mechanical change)",
        "",
    ]
    lines += [f"- [ ] {q}" for q in engineer_questions(review)]
    lines.append("")
    return "\n".join(lines)


# --------------------------------------------------------------------------- summary.json


def _violation_summary(violations: list[Violation]) -> dict[str, Any]:
    groups = group_by_type(violations)
    return {
        "total": len(violations),
        "active": len(active(violations)),
        "by_severity": count_by_severity(violations),
        "by_type": [{"type": g.type, "severity": g.severity, "count": g.count} for g in groups],
    }


def build_summary(review: Review) -> dict[str, Any]:
    """Build the machine-readable ``summary.json`` document."""
    summary: dict[str, Any] = {
        "tool": "kistack-review",
        "version": __version__,
        "generated": review.generated,
        "inputs": {
            "board": str(review.board) if review.board else None,
            "schematic": str(review.schematic) if review.schematic else None,
            "project": str(review.project) if review.project else None,
            "kicad_cli": review.kicad_cli,
            "kicad_cli_version": review.kicad_cli_version,
            "drc_source": review.drc_source or None,
            "erc_source": review.erc_source or None,
            "bom_source": review.bom_source or None,
        },
        "checks": {c.name: {"status": c.status, "detail": c.detail} for c in check_statuses(review)},
        "commands": review.commands,
        "notes": review.notes,
        "errors": review.errors,
        "next_steps": next_steps(review),
    }
    if review.drc is not None:
        summary["drc"] = {
            "source": review.drc.source,
            "date": review.drc.date,
            "kicad_version": review.drc.kicad_version,
            "units": review.drc.units,
            "violations": _violation_summary(review.drc.violations),
            "unconnected_items": _violation_summary(review.drc.unconnected_items),
            "schematic_parity": _violation_summary(review.drc.schematic_parity),
        }
    if review.erc is not None:
        summary["erc"] = {
            "source": review.erc.source,
            "date": review.erc.date,
            "kicad_version": review.erc.kicad_version,
            "units": review.erc.units,
            "sheets": [{"path": s.path, "active": len(active(s.violations))} for s in review.erc.sheets],
            "violations": _violation_summary(review.erc.all()),
        }
    if review.fab is not None:
        summary["fab"] = {
            "fab": review.fab.fab,
            "process": review.fab.process_id,
            "profile": str(review.fab.profile.path) if review.fab.profile and review.fab.profile.path else None,
            "retrieved": review.fab.profile.retrieved if review.fab.profile else None,
            "status": review.fab.status,
            "notes": review.fab.notes,
            "comparisons": [
                {
                    "scope": c.scope,
                    "rule": c.rule,
                    "project_key": c.project_key,
                    "fab_key": c.fab_key,
                    "project_value_mm": c.project_value,
                    "fab_min_mm": c.fab_min,
                    "status": c.status,
                    "note": c.note,
                }
                for c in review.fab.comparisons
            ],
        }
    if review.bom is not None:
        bom = review.bom
        summary["bom"] = {
            "path": str(bom.path),
            "rows": bom.rows,
            "components": bom.components,
            "columns": bom.columns,
            "status": bom.status,
            "empty_value": bom.empty_value,
            "empty_footprint": bom.empty_footprint,
            "lcsc_required": bom.lcsc_required,
            "lcsc_column_present": bom.lcsc_column_present,
            "missing_lcsc": bom.missing_lcsc,
            "mpn_conflicts": bom.mpn_conflicts,
            "dnp_column_present": bom.dnp_column_present,
            "dnp_refs": bom.dnp_refs,
            "notes": bom.notes,
        }
    return summary
