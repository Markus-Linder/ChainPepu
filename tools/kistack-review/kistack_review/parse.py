"""Parsers for the JSON reports written by ``kicad-cli pcb drc`` and ``kicad-cli sch erc``.

The shape matches KiCad 8.0/9.0 (``include/rc_json_schema.h`` in the KiCad source):

* DRC: ``{"$schema", "source", "date", "kicad_version", "coordinate_units",
  "violations": [...], "unconnected_items": [...], "schematic_parity": [...]}``
* ERC: ``{"$schema", "source", "date", "kicad_version", "coordinate_units",
  "sheets": [{"path", "uuid_path", "violations": [...]}]}``
* violation: ``{"type", "description", "severity", "excluded", "items": [
  {"uuid", "description", "pos": {"x", "y"}}]}``

Everything here is tolerant of missing keys so partially different versions still parse.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

log = logging.getLogger("kistack_review")

#: Order used when sorting and counting severities (lower = more severe).
SEVERITY_ORDER: dict[str, int] = {
    "error": 0,
    "warning": 1,
    "action": 2,
    "info": 3,
    "exclusion": 4,
    "debug": 5,
    "unknown": 6,
}


class ReportError(ValueError):
    """Raised when a JSON report cannot be read or is not a KiCad RC report."""


@dataclass(frozen=True)
class Location:
    """One affected item of a violation (``items[]`` entry)."""

    description: str
    x: float | None
    y: float | None
    uuid: str = ""

    def format_pos(self, units: str = "mm") -> str:
        """Return the position as ``(x, y) units`` or ``?`` when unknown."""
        if self.x is None or self.y is None:
            return "?"
        return f"({self.x:.3f}, {self.y:.3f}) {units}"


@dataclass
class Violation:
    """One DRC or ERC violation."""

    type: str
    description: str
    severity: str
    excluded: bool = False
    items: list[Location] = field(default_factory=list)
    #: ``violations``, ``unconnected_items`` or ``schematic_parity`` for DRC; ``erc`` for ERC.
    category: str = "violations"
    #: Human readable sheet path for ERC violations (``/``, ``/Power/`` ...).
    sheet: str = ""

    @property
    def primary(self) -> Location | None:
        """The first affected item, if any."""
        return self.items[0] if self.items else None


@dataclass
class DrcReport:
    """Parsed ``kicad-cli pcb drc --format json`` output."""

    source: str = ""
    date: str = ""
    kicad_version: str = ""
    units: str = "mm"
    violations: list[Violation] = field(default_factory=list)
    unconnected_items: list[Violation] = field(default_factory=list)
    schematic_parity: list[Violation] = field(default_factory=list)

    def all(self) -> list[Violation]:
        """Every violation across the three DRC categories."""
        return [*self.violations, *self.unconnected_items, *self.schematic_parity]


@dataclass
class ErcSheet:
    """One schematic sheet in an ERC report."""

    path: str
    uuid_path: str
    violations: list[Violation] = field(default_factory=list)


@dataclass
class ErcReport:
    """Parsed ``kicad-cli sch erc --format json`` output."""

    source: str = ""
    date: str = ""
    kicad_version: str = ""
    units: str = "mm"
    sheets: list[ErcSheet] = field(default_factory=list)

    def all(self) -> list[Violation]:
        """Every violation across all sheets."""
        return [v for sheet in self.sheets for v in sheet.violations]


@dataclass
class TypeGroup:
    """Violations sharing the same ``type`` key."""

    type: str
    severity: str
    count: int
    violations: list[Violation]


def severity_rank(severity: str) -> int:
    """Sort key for a severity string; unknown strings sort last."""
    return SEVERITY_ORDER.get(severity, SEVERITY_ORDER["unknown"])


def _as_float(value: Any) -> float | None:
    """Coerce a JSON number (or numeric string) to float; ``None`` otherwise."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _parse_item(raw: Any) -> Location:
    """Parse one ``items[]`` entry."""
    if not isinstance(raw, dict):
        return Location(description=str(raw), x=None, y=None)
    pos = raw.get("pos") if isinstance(raw.get("pos"), dict) else {}
    return Location(
        description=str(raw.get("description", "")),
        x=_as_float(pos.get("x")),
        y=_as_float(pos.get("y")),
        uuid=str(raw.get("uuid", "")),
    )


def _parse_violation(raw: dict[str, Any], category: str, sheet: str) -> Violation:
    """Parse one violation object."""
    severity = str(raw.get("severity") or "unknown").lower()
    excluded = bool(raw.get("excluded", False)) or severity == "exclusion"
    items_raw = raw.get("items")
    items = [_parse_item(i) for i in items_raw] if isinstance(items_raw, list) else []
    return Violation(
        type=str(raw.get("type") or "unknown"),
        description=str(raw.get("description", "")).strip(),
        severity=severity,
        excluded=excluded,
        items=items,
        category=category,
        sheet=sheet,
    )


def _parse_violations(raws: Any, category: str, sheet: str = "") -> list[Violation]:
    """Parse a list of violation objects, skipping malformed entries."""
    if not isinstance(raws, list):
        return []
    result: list[Violation] = []
    for raw in raws:
        if isinstance(raw, dict):
            result.append(_parse_violation(raw, category, sheet))
        else:
            log.debug("Skipping malformed violation entry: %r", raw)
    return result


def _header(data: dict[str, Any]) -> dict[str, str]:
    """Extract the common header fields."""
    return {
        "source": str(data.get("source", "")),
        "date": str(data.get("date", "")),
        "kicad_version": str(data.get("kicad_version", "")),
        "units": str(data.get("coordinate_units", "mm") or "mm"),
    }


def parse_drc(data: dict[str, Any]) -> DrcReport:
    """Build a :class:`DrcReport` from decoded JSON.

    Raises :class:`ReportError` when the document looks like an ERC report or is not a dict.
    """
    if not isinstance(data, dict):
        raise ReportError("DRC report is not a JSON object")
    if "sheets" in data and "violations" not in data:
        raise ReportError("this looks like an ERC report, not a DRC report (has 'sheets')")
    header = _header(data)
    return DrcReport(
        **header,
        violations=_parse_violations(data.get("violations"), "violations"),
        unconnected_items=_parse_violations(data.get("unconnected_items"), "unconnected_items"),
        schematic_parity=_parse_violations(data.get("schematic_parity"), "schematic_parity"),
    )


def parse_erc(data: dict[str, Any]) -> ErcReport:
    """Build an :class:`ErcReport` from decoded JSON.

    Raises :class:`ReportError` when the document looks like a DRC report or is not a dict.
    """
    if not isinstance(data, dict):
        raise ReportError("ERC report is not a JSON object")
    if "violations" in data and "sheets" not in data:
        raise ReportError("this looks like a DRC report, not an ERC report (has 'violations')")
    header = _header(data)
    sheets: list[ErcSheet] = []
    for raw in data.get("sheets") or []:
        if not isinstance(raw, dict):
            continue
        path = str(raw.get("path", "/"))
        sheets.append(
            ErcSheet(
                path=path,
                uuid_path=str(raw.get("uuid_path", "")),
                violations=_parse_violations(raw.get("violations"), "erc", sheet=path),
            )
        )
    return ErcReport(**header, sheets=sheets)


def load_json(path: Path) -> dict[str, Any]:
    """Read a JSON file into a dict, wrapping I/O and decode errors in :class:`ReportError`."""
    try:
        text = Path(path).read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise ReportError(f"cannot read {path}: {exc}") from exc
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ReportError(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise ReportError(f"{path} does not contain a JSON object")
    return data


def load_drc(path: Path) -> DrcReport:
    """Load and parse a DRC JSON report from disk."""
    return parse_drc(load_json(path))


def load_erc(path: Path) -> ErcReport:
    """Load and parse an ERC JSON report from disk."""
    return parse_erc(load_json(path))


def active(violations: Iterable[Violation]) -> list[Violation]:
    """Violations that are not excluded."""
    return [v for v in violations if not v.excluded]


def count_by_severity(violations: Iterable[Violation]) -> dict[str, int]:
    """Count non-excluded violations per severity plus an ``excluded`` bucket.

    Keys are ordered by severity, most severe first; zero counts are omitted.
    """
    counts: dict[str, int] = {}
    excluded = 0
    for v in violations:
        if v.excluded:
            excluded += 1
        else:
            counts[v.severity] = counts.get(v.severity, 0) + 1
    ordered = {k: counts[k] for k in sorted(counts, key=severity_rank)}
    if excluded:
        ordered["excluded"] = excluded
    return ordered


def worst_severity(violations: Iterable[Violation]) -> str | None:
    """Most severe severity among non-excluded violations, or ``None``."""
    ranked = sorted((v.severity for v in active(violations)), key=severity_rank)
    return ranked[0] if ranked else None


def group_by_type(violations: Iterable[Violation]) -> list[TypeGroup]:
    """Group non-excluded violations by ``type``, worst severity and largest count first."""
    buckets: dict[str, list[Violation]] = {}
    for v in active(violations):
        buckets.setdefault(v.type, []).append(v)
    groups = [
        TypeGroup(type=t, severity=worst_severity(vs) or "unknown", count=len(vs), violations=vs)
        for t, vs in buckets.items()
    ]
    groups.sort(key=lambda g: (severity_rank(g.severity), -g.count, g.type))
    return groups
