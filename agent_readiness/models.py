"""Datenmodelle für Prüfergebnisse und den Gesamtbericht."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any

# Schweregrade eines Befunds
CRITICAL = "kritisch"
WARNING = "warnung"
INFO = "hinweis"
OK = "ok"


@dataclass
class Finding:
    """Ein einzelner Befund innerhalb einer Prüfkategorie."""

    severity: str
    title: str
    detail: str = ""
    recommendation: str = ""
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass
class CategoryResult:
    """Ergebnis einer Prüfkategorie mit Punktzahl von 0 bis 100."""

    key: str
    name: str
    weight: int
    score: int
    findings: list[Finding] = field(default_factory=list)
    skipped: bool = False
    skipped_reason: str = ""

    def add(self, severity: str, title: str, detail: str = "", recommendation: str = "", **evidence: Any) -> None:
        self.findings.append(Finding(severity, title, detail, recommendation, evidence))


@dataclass
class ProbeQuestion:
    """Eine Testfrage an einen KI-Assistenten und das ausgewertete Ergebnis."""

    question: str
    answer: str = ""
    target_mentioned: bool = False
    target_cited: bool = False
    providers_mentioned: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    error: str = ""


@dataclass
class Report:
    """Gesamtbericht eines Audits."""

    url: str
    domain: str
    brand: str
    generated_at: str
    categories: list[CategoryResult]
    total_score: int
    probe: list[ProbeQuestion] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
