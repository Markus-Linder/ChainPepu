"""Fab capability profiles and comparison against KiCad project design rules.

Profiles follow ``kit-pro/fab-profiles/SCHEMA.md``: one JSON per fab with ``processes[]``,
each carrying ``min_*_mm`` values (``null`` when the fab does not publish a number).

Project rules come from ``<project>.kicad_pro``:

* ``board.design_settings.rules`` (``min_clearance``, ``min_track_width`` ... in mm)
* ``net_settings.classes[]`` (``clearance``, ``track_width``, ``via_diameter``, ``via_drill`` in mm)
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

log = logging.getLogger("kistack_review")

#: Environment variable overriding the fab profile directory.
PROFILES_ENV = "KISTACK_FAB_PROFILES"
#: Comparison tolerance in mm (values are stored with ~4 decimals).
EPSILON = 1e-6
#: Known fab names accepted on the command line.
KNOWN_FABS: tuple[str, ...] = ("jlcpcb", "pcbway", "oshpark", "aisler", "eurocircuits")

#: (project rule key, fab profile key or None, label)
RULE_MAP: tuple[tuple[str, str | None, str], ...] = (
    ("min_clearance", "min_clearance_mm", "Copper clearance"),
    ("min_track_width", "min_track_mm", "Track width"),
    ("min_via_diameter", "min_via_diameter_mm", "Via diameter"),
    ("min_via_annular_width", "min_annular_ring_mm", "Via annular ring"),
    ("min_through_hole_diameter", "min_pth_drill_mm", "Through-hole drill"),
    ("min_hole_to_hole", "min_hole_to_hole_mm", "Hole to hole"),
    ("min_hole_clearance", "min_hole_to_copper_mm", "Hole to copper"),
    ("min_copper_edge_clearance", "min_board_edge_to_copper_mm", "Copper to board edge"),
    ("min_silk_clearance", None, "Silkscreen clearance"),
    ("min_text_thickness", "min_silkscreen_line_mm", "Silkscreen line width"),
    ("min_text_height", "min_silkscreen_text_height_mm", "Silkscreen text height"),
)

#: (net class key, fab profile key, label)
NETCLASS_MAP: tuple[tuple[str, str, str], ...] = (
    ("clearance", "min_clearance_mm", "Clearance"),
    ("track_width", "min_track_mm", "Track width"),
    ("via_diameter", "min_via_diameter_mm", "Via diameter"),
    ("via_drill", "min_via_drill_mm", "Via drill"),
)


class FabProfileError(ValueError):
    """Raised when a fab profile or project file cannot be loaded."""


@dataclass
class FabProcess:
    """One manufacturing process of a fab (e.g. ``standard-2l``)."""

    id: str
    label: str
    layers: list[int] = field(default_factory=list)
    values: dict[str, float | None] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)

    def minimum(self, key: str | None) -> float | None:
        """Fab minimum for ``key`` or ``None`` when unknown/unspecified."""
        return self.values.get(key) if key else None


@dataclass
class FabProfile:
    """A loaded fab profile."""

    fab: str
    name: str
    retrieved: str = ""
    sources: list[str] = field(default_factory=list)
    verify_note: str = ""
    processes: list[FabProcess] = field(default_factory=list)
    required_bom_fields: list[str] = field(default_factory=list)
    path: Path | None = None


@dataclass
class NetClass:
    """A KiCad net class with its numeric settings (mm)."""

    name: str
    values: dict[str, float | None] = field(default_factory=dict)


@dataclass
class ProjectRules:
    """Design rules read from a ``.kicad_pro`` file."""

    path: Path
    rules: dict[str, float | None] = field(default_factory=dict)
    netclasses: list[NetClass] = field(default_factory=list)


@dataclass
class Comparison:
    """One project value compared with one fab minimum."""

    scope: str
    rule: str
    project_key: str
    fab_key: str | None
    project_value: float | None
    fab_min: float | None
    status: str  # "ok" | "looser" | "unknown"
    note: str = ""


@dataclass
class FabResult:
    """Everything the report needs about the fab comparison."""

    fab: str
    process_id: str | None = None
    profile: FabProfile | None = None
    process: FabProcess | None = None
    project_path: Path | None = None
    comparisons: list[Comparison] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def verify_note_text(self) -> str:
        """The profile's verify note, or an empty string."""
        return self.profile.verify_note if self.profile else ""

    @property
    def looser(self) -> list[Comparison]:
        """Comparisons where the project allows something the fab cannot build."""
        return [c for c in self.comparisons if c.status == "looser"]

    @property
    def status(self) -> str:
        """``fail`` if anything is looser, ``skipped`` if nothing was compared, else ``pass``."""
        if self.looser:
            return "fail"
        if not self.comparisons:
            return "skipped"
        return "pass"


def _number(value: Any) -> float | None:
    """Coerce JSON numbers to float, treating bools/strings/None as unknown."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def default_profiles_dir() -> Path:
    """``kit-pro/fab-profiles`` at the repository root, resolved relative to this package."""
    return Path(__file__).resolve().parents[2] / "kit-pro" / "fab-profiles"


def resolve_profiles_dir(explicit: str | None = None) -> Path | None:
    """Pick the fab profile directory: explicit flag, then env var, then the repo default.

    Returns ``None`` when no candidate exists on disk.
    """
    candidates: list[Path] = []
    if explicit:
        candidates.append(Path(explicit))
    env = os.environ.get(PROFILES_ENV)
    if env:
        candidates.append(Path(env))
    candidates.append(default_profiles_dir())
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
        log.debug("fab profile dir not found: %s", candidate)
    return None


def _parse_process(raw: dict[str, Any]) -> FabProcess:
    """Build a :class:`FabProcess` from its JSON object."""
    values = {k: _number(v) for k, v in raw.items() if k.startswith("min_") or k.startswith("max_")}
    layers = [int(x) for x in raw.get("layers", []) if isinstance(x, (int, float))]
    return FabProcess(id=str(raw.get("id", "")), label=str(raw.get("label", "")), layers=layers, values=values, raw=raw)


def load_profile(directory: Path, fab: str) -> FabProfile:
    """Load ``<directory>/<fab>.json``; raise :class:`FabProfileError` if missing or malformed."""
    path = Path(directory) / f"{fab.lower()}.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise FabProfileError(f"no fab profile for '{fab}' at {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise FabProfileError(f"fab profile {path} is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise FabProfileError(f"fab profile {path} is not a JSON object")
    assembly = data.get("assembly") if isinstance(data.get("assembly"), dict) else {}
    processes = [_parse_process(p) for p in data.get("processes", []) if isinstance(p, dict)]
    return FabProfile(
        fab=str(data.get("fab", fab)),
        name=str(data.get("name", fab)),
        retrieved=str(data.get("retrieved", "")),
        sources=[str(s) for s in data.get("sources", [])],
        verify_note=str(data.get("verify_note", "")),
        processes=processes,
        required_bom_fields=[str(f) for f in assembly.get("required_bom_fields", [])],
        path=path,
    )


def select_process(profile: FabProfile, process_id: str | None) -> FabProcess | None:
    """Pick a process by id; defaults to ``standard-2l`` or the first listed."""
    if not profile.processes:
        return None
    wanted = process_id or "standard-2l"
    for process in profile.processes:
        if process.id == wanted:
            return process
    if process_id:
        return None
    return profile.processes[0]


def load_project(path: Path) -> ProjectRules:
    """Read design rules and net classes from a ``.kicad_pro`` file."""
    path = Path(path)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise FabProfileError(f"cannot read project {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise FabProfileError(f"project {path} is not valid JSON: {exc}") from exc
    board = data.get("board") if isinstance(data, dict) else None
    settings = board.get("design_settings") if isinstance(board, dict) else None
    rules_raw = settings.get("rules") if isinstance(settings, dict) else None
    rules = {k: _number(v) for k, v in rules_raw.items()} if isinstance(rules_raw, dict) else {}
    net_settings = data.get("net_settings") if isinstance(data, dict) else None
    classes_raw = net_settings.get("classes") if isinstance(net_settings, dict) else None
    netclasses: list[NetClass] = []
    for raw in classes_raw or []:
        if isinstance(raw, dict):
            name = str(raw.get("name", "?"))
            netclasses.append(NetClass(name=name, values={k: _number(v) for k, v in raw.items() if k != "name"}))
    return ProjectRules(path=path, rules=rules, netclasses=netclasses)


def _judge(project_value: float | None, fab_min: float | None, fab_key: str | None) -> tuple[str, str]:
    """Return ``(status, note)`` for one value pair."""
    if fab_key is None:
        return "unknown", "no matching fab capability in profile schema"
    if fab_min is None:
        return "unknown", "fab profile does not publish this value"
    if project_value is None:
        return "unknown", "not set in project"
    if project_value <= 0:
        return "looser", f"0 means KiCad does not enforce it; fab needs >= {fab_min:g} mm"
    if project_value + EPSILON < fab_min:
        return "looser", f"project allows {project_value:g} mm, fab minimum is {fab_min:g} mm"
    return "ok", ""


def compare_rules(project: ProjectRules, process: FabProcess) -> list[Comparison]:
    """Compare ``board.design_settings.rules`` with the fab minimums."""
    result: list[Comparison] = []
    for project_key, fab_key, label in RULE_MAP:
        project_value = project.rules.get(project_key)
        fab_min = process.minimum(fab_key)
        status, note = _judge(project_value, fab_min, fab_key)
        result.append(Comparison("Board rules", label, project_key, fab_key, project_value, fab_min, status, note))
    return result


def _annular_ring(netclass: NetClass) -> float | None:
    """Annular ring implied by a net class' via diameter and drill."""
    diameter = netclass.values.get("via_diameter")
    drill = netclass.values.get("via_drill")
    if diameter is None or drill is None:
        return None
    return (diameter - drill) / 2.0


def compare_netclasses(project: ProjectRules, process: FabProcess) -> list[Comparison]:
    """Compare every net class' track/clearance/via settings with the fab minimums."""
    result: list[Comparison] = []
    for netclass in project.netclasses:
        scope = f"Net class '{netclass.name}'"
        for key, fab_key, label in NETCLASS_MAP:
            value = netclass.values.get(key)
            fab_min = process.minimum(fab_key)
            status, note = _judge(value, fab_min, fab_key)
            if value is None:
                note = "not set in this class (inherits Default)"
            result.append(Comparison(scope, label, key, fab_key, value, fab_min, status, note))
        ring = _annular_ring(netclass)
        status, note = _judge(ring, process.minimum("min_annular_ring_mm"), "min_annular_ring_mm")
        result.append(
            Comparison(scope, "Via annular ring (derived)", "via_annular", "min_annular_ring_mm", ring, process.minimum("min_annular_ring_mm"), status, note)
        )
    return result


def compare(project: ProjectRules, process: FabProcess) -> list[Comparison]:
    """All comparisons: board rules first, then net classes."""
    return compare_rules(project, process) + compare_netclasses(project, process)


def review_fab(fab: str, process_id: str | None, project_path: Path | None, profiles_dir: Path | None) -> FabResult:
    """Load the profile and project and compare them, recording problems as notes rather than raising."""
    result = FabResult(fab=fab, process_id=process_id, project_path=project_path)
    if profiles_dir is None:
        result.notes.append(
            f"No fab profile directory found (pass --fab-profiles DIR or set {PROFILES_ENV}); "
            "fab rule comparison skipped."
        )
        return result
    try:
        result.profile = load_profile(profiles_dir, fab)
    except FabProfileError as exc:
        result.notes.append(f"{exc}; fab rule comparison skipped.")
        return result
    result.process = select_process(result.profile, process_id)
    if result.process is None:
        available = ", ".join(p.id for p in result.profile.processes) or "none"
        result.notes.append(f"Process '{process_id}' not in profile {fab} (available: {available}); comparison skipped.")
        return result
    result.process_id = result.process.id
    if project_path is None:
        result.notes.append("No .kicad_pro given or found next to the board; design rules were not compared.")
        return result
    try:
        project = load_project(project_path)
    except FabProfileError as exc:
        result.notes.append(f"{exc}; design rules were not compared.")
        return result
    result.comparisons = compare(project, result.process)
    return result
