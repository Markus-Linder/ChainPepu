"""Command line entry point: ``kistack-review``.

Exit codes: ``0`` report produced, ``2`` nothing to do, ``1`` an error occurred (the report is still
written when possible).
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import __version__, bom, fab, kicad, parse, report

log = logging.getLogger("kistack_review")

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_NOTHING = 2

DRC_HINT = "kicad-cli pcb drc --format json --severity-all --output drc.json <board.kicad_pcb>"
ERC_HINT = "kicad-cli sch erc --format json --severity-all --output erc.json <schematic.kicad_sch>"
BOM_HINT = 'kicad-cli sch export bom --fields "Reference,Value,Footprint,LCSC Part #,MPN,Manufacturer,${DNP}" --labels "Reference,Value,Footprint,LCSC Part #,MPN,Manufacturer,DNP" --output bom.csv <schematic.kicad_sch>'


def build_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog="kistack-review",
        description="Run KiCad DRC/ERC/BOM checks (or read pre-generated JSON) and produce REPORT.md, AGENT_PROMPT.md and summary.json.",
    )
    parser.add_argument("--board", type=Path, help="Board file (.kicad_pcb)")
    parser.add_argument("--schematic", type=Path, help="Root schematic (.kicad_sch); auto-detected next to the board")
    parser.add_argument("--project", type=Path, help="Project file (.kicad_pro); auto-detected next to the board")
    parser.add_argument("--fab", choices=fab.KNOWN_FABS, help="Fab to compare design rules against")
    parser.add_argument("--process", help="Fab process id from the profile (default: standard-2l)")
    parser.add_argument("--fab-profiles", help=f"Directory with fab profile JSON files (default: {fab.default_profiles_dir()})")
    parser.add_argument("--drc-json", type=Path, help="Pre-generated DRC JSON (skips running kicad-cli pcb drc)")
    parser.add_argument("--erc-json", type=Path, help="Pre-generated ERC JSON (skips running kicad-cli sch erc)")
    parser.add_argument("--bom-csv", type=Path, help="Pre-generated BOM CSV (skips running kicad-cli sch export bom)")
    parser.add_argument("--out", type=Path, default=Path("kistack-review-out"), help="Output directory (default: ./kistack-review-out)")
    parser.add_argument("--kicad-cli", help="Path to kicad-cli (default: search PATH)")
    parser.add_argument("--no-kicad-cli", action="store_true", help="Never run kicad-cli, only use the given JSON/CSV files")
    parser.add_argument("-v", "--verbose", action="store_true", help="Debug logging")
    parser.add_argument("-q", "--quiet", action="store_true", help="Only log errors")
    parser.add_argument("--version", action="version", version=f"kistack-review {__version__}")
    return parser


def _configure_logging(verbose: bool, quiet: bool) -> None:
    level = logging.DEBUG if verbose else logging.ERROR if quiet else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s", stream=sys.stderr)


def _sibling(base: Path | None, suffix: str) -> Path | None:
    """``base`` with a different suffix, if that file exists."""
    if base is None:
        return None
    candidate = base.with_suffix(suffix)
    return candidate if candidate.is_file() else None


def _check_input(path: Path | None, label: str, review: report.Review) -> Path | None:
    """Return the path when it exists; otherwise record an error and return ``None``."""
    if path is None:
        return None
    if path.is_file():
        return path
    review.errors.append(f"{label} not found: {path}")
    log.error("%s not found: %s", label, path)
    return None


def _obtain_drc(args: argparse.Namespace, review: report.Review, cli: str | None, board: Path | None) -> None:
    """Fill ``review.drc`` from --drc-json or by running kicad-cli."""
    if args.drc_json is not None:
        path = _check_input(args.drc_json, "DRC JSON", review)
        if path is None:
            return
        try:
            review.drc = parse.load_drc(path)
        except parse.ReportError as exc:
            review.errors.append(f"DRC JSON: {exc}")
            log.error("DRC JSON: %s", exc)
            return
        review.drc_source = f"`{path}` (pre-generated)"
        return
    if board is None:
        review.notes.append("No board given, DRC skipped.")
        return
    if cli is None:
        review.notes.append(f"kicad-cli not available; generate DRC with `{DRC_HINT}` and pass --drc-json drc.json.")
        return
    output = review.out_dir / "drc.json"
    result = kicad.run_drc(cli, board, output, schematic_parity=review.schematic is not None)
    review.commands.append(result.command_line)
    if not result.ok:
        review.errors.append(f"DRC run failed (exit {result.returncode}): {(result.error or result.stderr or result.stdout).strip()}")
        return
    try:
        review.drc = parse.load_drc(output)
        review.drc_source = f"`{output}` (kicad-cli)"
    except parse.ReportError as exc:
        review.errors.append(f"DRC output unreadable: {exc}")


def _obtain_erc(args: argparse.Namespace, review: report.Review, cli: str | None, schematic: Path | None) -> None:
    """Fill ``review.erc`` from --erc-json or by running kicad-cli."""
    if args.erc_json is not None:
        path = _check_input(args.erc_json, "ERC JSON", review)
        if path is None:
            return
        try:
            review.erc = parse.load_erc(path)
        except parse.ReportError as exc:
            review.errors.append(f"ERC JSON: {exc}")
            log.error("ERC JSON: %s", exc)
            return
        review.erc_source = f"`{path}` (pre-generated)"
        return
    if schematic is None:
        review.notes.append("No schematic given or found next to the board; ERC skipped.")
        return
    if cli is None:
        review.notes.append(f"kicad-cli not available; generate ERC with `{ERC_HINT}` and pass --erc-json erc.json.")
        return
    output = review.out_dir / "erc.json"
    result = kicad.run_erc(cli, schematic, output)
    review.commands.append(result.command_line)
    if not result.ok:
        review.errors.append(f"ERC run failed (exit {result.returncode}): {(result.error or result.stderr or result.stdout).strip()}")
        return
    try:
        review.erc = parse.load_erc(output)
        review.erc_source = f"`{output}` (kicad-cli)"
    except parse.ReportError as exc:
        review.errors.append(f"ERC output unreadable: {exc}")


def _lcsc_required(args: argparse.Namespace, review: report.Review) -> bool:
    """JLCPCB (or a profile that lists it) needs an LCSC part number per placed part."""
    if args.fab == "jlcpcb":
        return True
    profile = review.fab.profile if review.fab else None
    return bool(profile and any("lcsc" in f.lower() for f in profile.required_bom_fields))


def _obtain_bom(args: argparse.Namespace, review: report.Review, cli: str | None, schematic: Path | None) -> None:
    """Fill ``review.bom`` from --bom-csv or by exporting with kicad-cli."""
    path: Path | None
    if args.bom_csv is not None:
        path = _check_input(args.bom_csv, "BOM CSV", review)
        if path is None:
            return
        review.bom_source = f"`{path}` (pre-generated)"
    elif schematic is None or cli is None:
        if schematic is not None:
            review.notes.append(f"kicad-cli not available; export the BOM with `{BOM_HINT}` and pass --bom-csv bom.csv.")
        return
    else:
        path = review.out_dir / "bom.csv"
        result = kicad.export_bom(cli, schematic, path)
        review.commands.append(result.command_line)
        if not result.ok:
            review.errors.append(f"BOM export failed (exit {result.returncode}): {(result.error or result.stderr or result.stdout).strip()}")
            return
        review.bom_source = f"`{path}` (kicad-cli)"
    try:
        review.bom = bom.check_bom(path, lcsc_required=_lcsc_required(args, review))
    except bom.BomError as exc:
        review.errors.append(str(exc))
        log.error("%s", exc)


def _write_outputs(review: report.Review) -> list[Path]:
    """Write REPORT.md, AGENT_PROMPT.md and summary.json; return their paths."""
    report_md = report.render_report(review)
    paths = [review.out_dir / "REPORT.md", review.out_dir / "AGENT_PROMPT.md", review.out_dir / "summary.json"]
    paths[0].write_text(report_md, encoding="utf-8")
    paths[1].write_text(report.render_agent_prompt(review, report_md), encoding="utf-8")
    paths[2].write_text(json.dumps(report.build_summary(review), indent=2) + "\n", encoding="utf-8")
    return paths


def _print_nothing_to_do(review: report.Review) -> None:
    """Explain how to get inputs when neither kicad-cli nor pre-generated files are available."""
    print("kistack-review: nothing to check.", file=sys.stderr)
    print("kicad-cli was not found (install KiCad 8/9 or pass --kicad-cli PATH), and no --drc-json/--erc-json/--bom-csv was given.", file=sys.stderr)
    print("Generate the inputs on a machine with KiCad and re-run with the flags:", file=sys.stderr)
    print(f"  {DRC_HINT}", file=sys.stderr)
    print(f"  {ERC_HINT}", file=sys.stderr)
    print(f"  {BOM_HINT}", file=sys.stderr)
    for note in review.errors:
        print(f"  error: {note}", file=sys.stderr)


def run(args: argparse.Namespace) -> int:
    """Execute the review; returns the process exit code."""
    review = report.Review(out_dir=args.out, generated=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    args.out.mkdir(parents=True, exist_ok=True)

    review.board = args.board
    if args.board is not None and not args.board.is_file():
        review.notes.append(f"Board file not found: {args.board}")
        log.warning("Board file not found: %s", args.board)
    review.schematic = args.schematic or _sibling(args.board, ".kicad_sch")
    review.project = args.project or _sibling(args.board, ".kicad_pro")
    board = args.board if args.board is not None and args.board.is_file() else None
    schematic = _check_input(args.schematic, "Schematic", review) if args.schematic else review.schematic
    if args.project is not None:
        review.project = _check_input(args.project, "Project", review)

    cli = None if args.no_kicad_cli else kicad.find_kicad_cli(args.kicad_cli)
    review.kicad_cli = cli
    if cli:
        review.kicad_cli_version = kicad.version(cli)

    _obtain_drc(args, review, cli, board)
    _obtain_erc(args, review, cli, schematic)
    if args.fab:
        review.fab = fab.review_fab(args.fab, args.process, review.project, fab.resolve_profiles_dir(args.fab_profiles))
        for note in review.fab.notes:
            log.warning("%s", note)
    _obtain_bom(args, review, cli, schematic)

    if review.drc is None and review.erc is None and review.bom is None and (review.fab is None or not review.fab.comparisons):
        _print_nothing_to_do(review)
        return EXIT_ERROR if review.errors else EXIT_NOTHING

    paths = _write_outputs(review)
    for check in report.check_statuses(review):
        print(f"{check.name:18s} {check.status.upper():7s} {check.detail}")
    print("Wrote: " + ", ".join(str(p) for p in paths))
    print(f"Paste {paths[1]} into your agent (Claude Code / Codex / OpenCode) to start the review.")
    return EXIT_ERROR if review.errors else EXIT_OK


def main(argv: list[str] | None = None) -> int:
    """Console-script entry point."""
    args = build_parser().parse_args(argv)
    _configure_logging(args.verbose, args.quiet)
    try:
        return run(args)
    except (parse.ReportError, fab.FabProfileError, bom.BomError, OSError) as exc:
        log.error("%s", exc)
        return EXIT_ERROR


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
