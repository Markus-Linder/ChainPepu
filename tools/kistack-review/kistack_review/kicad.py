"""Thin wrapper around ``kicad-cli`` (KiCad 8.0 / 9.0 command line).

Commands used (verified against https://docs.kicad.org/8.0/en/cli/cli.html):

* ``kicad-cli pcb drc --format json --severity-all [--schematic-parity] --output F board.kicad_pcb``
* ``kicad-cli sch erc --format json --severity-all --output F sch.kicad_sch``
* ``kicad-cli sch export bom --fields ... --labels ... --output F sch.kicad_sch``

Only command construction and execution live here; parsing is in :mod:`kistack_review.parse`.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger("kistack_review")

#: BOM fields requested from kicad-cli. ``${DNP}`` is KiCad's special "Do not populate" field.
BOM_FIELDS: tuple[str, ...] = (
    "Reference",
    "Value",
    "Footprint",
    "LCSC Part #",
    "MPN",
    "Manufacturer",
    "${DNP}",
)
#: Column labels written to the CSV header; one per entry of :data:`BOM_FIELDS`.
BOM_LABELS: tuple[str, ...] = (
    "Reference",
    "Value",
    "Footprint",
    "LCSC Part #",
    "MPN",
    "Manufacturer",
    "DNP",
)


@dataclass
class RunResult:
    """Outcome of one ``kicad-cli`` invocation."""

    command: list[str]
    returncode: int
    stdout: str = ""
    stderr: str = ""
    output: Path | None = None
    error: str = ""

    @property
    def ok(self) -> bool:
        """True when the process exited 0 and the expected output file exists."""
        return self.returncode == 0 and not self.error and (self.output is None or self.output.exists())

    @property
    def command_line(self) -> str:
        """The command as a copy-pasteable shell string."""
        return " ".join(_quote(part) for part in self.command)


def _quote(part: str) -> str:
    """Quote a shell word when it contains spaces or shell metacharacters."""
    if part and all(c.isalnum() or c in "-_./=:+,#$%@" for c in part):
        return part
    return "'" + part.replace("'", "'\\''") + "'"


def find_kicad_cli(explicit: str | None = None) -> str | None:
    """Locate ``kicad-cli``.

    With ``explicit`` the given path/name is used and must exist or be on PATH; nothing else is tried.
    Otherwise ``kicad-cli`` is looked up on PATH, then in the usual macOS bundle location.
    """
    if explicit:
        candidate = Path(explicit)
        if candidate.is_file():
            return str(candidate)
        found = shutil.which(explicit)
        if found:
            return found
        log.warning("kicad-cli not found at %s", explicit)
        return None
    found = shutil.which("kicad-cli")
    if found:
        return found
    for candidate in (
        Path("/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"),
        Path("/usr/lib/kicad/bin/kicad-cli"),
    ):
        if candidate.is_file():
            return str(candidate)
    return None


def version(cli: str) -> str | None:
    """Return ``kicad-cli version`` output (e.g. ``8.0.4``), or ``None`` if it fails."""
    try:
        proc = subprocess.run([cli, "version"], capture_output=True, text=True, timeout=30, check=False)
    except (OSError, subprocess.SubprocessError) as exc:
        log.debug("kicad-cli version failed: %s", exc)
        return None
    text = (proc.stdout or proc.stderr).strip()
    return text.splitlines()[0].strip() if text else None


def drc_command(cli: str, board: Path, output: Path, schematic_parity: bool = False) -> list[str]:
    """Build the DRC command line."""
    cmd = [cli, "pcb", "drc", "--format", "json", "--severity-all"]
    if schematic_parity:
        cmd.append("--schematic-parity")
    cmd += ["--output", str(output), str(board)]
    return cmd


def erc_command(cli: str, schematic: Path, output: Path) -> list[str]:
    """Build the ERC command line."""
    return [cli, "sch", "erc", "--format", "json", "--severity-all", "--output", str(output), str(schematic)]


def bom_command(cli: str, schematic: Path, output: Path) -> list[str]:
    """Build the BOM export command line (one row per symbol, no grouping)."""
    return [
        cli,
        "sch",
        "export",
        "bom",
        "--fields",
        ",".join(BOM_FIELDS),
        "--labels",
        ",".join(BOM_LABELS),
        "--output",
        str(output),
        str(schematic),
    ]


def run(command: list[str], output: Path | None = None, timeout: int = 600) -> RunResult:
    """Execute ``command`` and capture the result; never raises for a failing process."""
    log.info("Running: %s", " ".join(command))
    try:
        proc = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    except FileNotFoundError as exc:
        return RunResult(command=command, returncode=127, output=output, error=f"cannot execute: {exc}")
    except subprocess.TimeoutExpired:
        return RunResult(command=command, returncode=124, output=output, error=f"timed out after {timeout}s")
    except OSError as exc:
        return RunResult(command=command, returncode=1, output=output, error=str(exc))
    result = RunResult(command=command, returncode=proc.returncode, stdout=proc.stdout, stderr=proc.stderr, output=output)
    if proc.returncode != 0:
        log.error("kicad-cli exited %d: %s", proc.returncode, (proc.stderr or proc.stdout).strip())
    elif output is not None and not output.exists():
        result.error = f"kicad-cli exited 0 but did not write {output}"
        log.error("%s", result.error)
    return result


def run_drc(cli: str, board: Path, output: Path, schematic_parity: bool = False) -> RunResult:
    """Run DRC and write JSON to ``output``."""
    return run(drc_command(cli, board, output, schematic_parity), output)


def run_erc(cli: str, schematic: Path, output: Path) -> RunResult:
    """Run ERC and write JSON to ``output``."""
    return run(erc_command(cli, schematic, output), output)


def export_bom(cli: str, schematic: Path, output: Path) -> RunResult:
    """Export the BOM CSV to ``output``."""
    return run(bom_command(cli, schematic, output), output)
