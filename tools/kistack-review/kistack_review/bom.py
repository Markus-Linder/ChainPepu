"""BOM CSV sanity checks (output of ``kicad-cli sch export bom`` or any similar CSV)."""

from __future__ import annotations

import csv
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger("kistack_review")

#: Header aliases, normalised with :func:`_norm`.
ALIASES: dict[str, tuple[str, ...]] = {
    "reference": ("reference", "references", "refs", "ref", "designator", "designators", "ref des", "refdes"),
    "value": ("value", "val", "comment"),
    "footprint": ("footprint", "package", "fp"),
    "lcsc": ("lcsc part #", "lcsc part", "lcsc", "lcsc#", "lcsc part number", "jlcpcb part #", "jlcpcb part", "jlc", "jlcpcb"),
    "mpn": ("mpn", "manufacturer part number", "mfr. part #", "mfr part #", "mfr part number", "part number", "manufacturer_part_number", "mfr. part number", "mfg part #"),
    "manufacturer": ("manufacturer", "mfr", "mfg", "mfr."),
    "dnp": ("dnp", "do not populate", "${dnp}", "populate"),
}

_FALSE_WORDS = {"", "0", "false", "no", "n", "off"}
_RANGE_RE = re.compile(r"^([A-Za-z_#]+)(\d+)-([A-Za-z_#]+)?(\d+)$")


class BomError(ValueError):
    """Raised when the CSV cannot be read."""


@dataclass
class BomResult:
    """Findings of the BOM check."""

    path: Path
    rows: int = 0
    components: int = 0
    columns: list[str] = field(default_factory=list)
    mapped: dict[str, str] = field(default_factory=dict)
    empty_value: list[str] = field(default_factory=list)
    empty_footprint: list[str] = field(default_factory=list)
    lcsc_required: bool = False
    lcsc_column_present: bool = False
    missing_lcsc: list[str] = field(default_factory=list)
    mpn_conflicts: dict[str, list[str]] = field(default_factory=dict)
    dnp_column_present: bool = False
    dnp_refs: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def problems(self) -> int:
        """Number of blocking findings."""
        return (
            len(self.empty_value)
            + len(self.empty_footprint)
            + (len(self.missing_lcsc) if self.lcsc_required else 0)
            + len(self.mpn_conflicts)
        )

    @property
    def status(self) -> str:
        """``fail`` when a blocking finding exists, else ``pass``."""
        return "fail" if self.problems else "pass"


def _norm(header: str) -> str:
    """Normalise a header for alias matching."""
    return re.sub(r"\s+", " ", header.strip().lower().lstrip("﻿"))


def map_columns(columns: list[str]) -> dict[str, str]:
    """Map logical names (``reference``, ``value`` ...) to actual CSV header names."""
    mapped: dict[str, str] = {}
    normalised = {_norm(c): c for c in columns if c}
    for logical, aliases in ALIASES.items():
        for alias in aliases:
            if alias in normalised:
                mapped[logical] = normalised[alias]
                break
    return mapped


def split_references(text: str) -> list[str]:
    """Split ``"R1, R2 R3-R5"`` into individual references, expanding simple ranges."""
    refs: list[str] = []
    for token in re.split(r"[,\s;]+", text.strip()):
        if not token:
            continue
        match = _RANGE_RE.match(token)
        if match and (match.group(3) is None or match.group(3) == match.group(1)):
            prefix, start, end = match.group(1), int(match.group(2)), int(match.group(4))
            if end >= start and end - start < 1000:
                refs.extend(f"{prefix}{n}" for n in range(start, end + 1))
                continue
        refs.append(token)
    return refs


def is_dnp(value: str) -> bool:
    """Interpret a DNP cell: KiCad writes ``DNP`` or empty; also accept yes/true/1."""
    return _norm(value) not in _FALSE_WORDS


def read_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    """Read the CSV, returning header and rows; raises :class:`BomError` on I/O problems."""
    try:
        with Path(path).open(newline="", encoding="utf-8-sig") as handle:
            sample = handle.read(4096)
            handle.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
            except csv.Error:
                dialect = csv.excel
            reader = csv.DictReader(handle, dialect=dialect)
            columns = [c.strip() for c in (reader.fieldnames or [])]
            rows = [{(k or "").strip(): (v or "").strip() for k, v in row.items()} for row in reader]
    except OSError as exc:
        raise BomError(f"cannot read BOM {path}: {exc}") from exc
    return columns, rows


def check_bom(path: Path, lcsc_required: bool = False) -> BomResult:
    """Run all BOM checks on ``path``."""
    columns, rows = read_rows(path)
    result = BomResult(path=Path(path), rows=len(rows), columns=columns, lcsc_required=lcsc_required)
    mapped = map_columns(columns)
    result.mapped = mapped
    result.lcsc_column_present = "lcsc" in mapped
    result.dnp_column_present = "dnp" in mapped
    if "reference" not in mapped:
        result.notes.append("No Reference column found; references are reported by row number.")
    if "value" not in mapped:
        result.notes.append("No Value column found; empty-value check skipped.")
    if "footprint" not in mapped:
        result.notes.append("No Footprint column found; empty-footprint check skipped.")
    if lcsc_required and not result.lcsc_column_present:
        result.notes.append("No 'LCSC Part #' column; JLCPCB assembly needs it for every placed part.")
    if "mpn" not in mapped:
        result.notes.append("No MPN column found; duplicate-MPN check skipped.")

    mpn_values: dict[str, list[str]] = {}
    for index, row in enumerate(rows, start=2):
        refs = split_references(row.get(mapped.get("reference", ""), "")) or [f"row {index}"]
        result.components += len(refs)
        dnp = result.dnp_column_present and is_dnp(row.get(mapped["dnp"], ""))
        if dnp:
            result.dnp_refs.extend(refs)
        if "value" in mapped and not row.get(mapped["value"]):
            result.empty_value.extend(refs)
        if "footprint" in mapped and not row.get(mapped["footprint"]):
            result.empty_footprint.extend(refs)
        if lcsc_required and not dnp and not row.get(mapped.get("lcsc", ""), ""):
            result.missing_lcsc.extend(refs)
        mpn = row.get(mapped.get("mpn", ""), "")
        value = row.get(mapped.get("value", ""), "")
        if mpn and value:
            seen = mpn_values.setdefault(mpn, [])
            if value not in seen:
                seen.append(value)
    result.mpn_conflicts = {m: v for m, v in mpn_values.items() if len(v) > 1}
    return result
