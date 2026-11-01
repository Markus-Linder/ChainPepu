"""Erzeugt den Bericht als Markdown und JSON."""

from __future__ import annotations

import json
from pathlib import Path

from .models import Report, CRITICAL, WARNING, INFO, OK
from .scoring import grade

ICON = {CRITICAL: "🔴", WARNING: "🟠", INFO: "🔵", OK: "🟢"}
ORDER = {CRITICAL: 0, WARNING: 1, INFO: 2, OK: 3}


def to_markdown(report: Report) -> str:
    lines: list[str] = []
    lines.append(f"# Agent-Readiness-Audit: {report.brand or report.domain}")
    lines.append("")
    lines.append(f"**URL:** {report.url}  ")
    lines.append(f"**Erstellt:** {report.generated_at}  ")
    lines.append(f"**Gesamtwert:** {report.total_score}/100 ({grade(report.total_score)})")
    lines.append("")
    lines.append("## Übersicht")
    lines.append("")
    lines.append("| Kategorie | Gewicht | Punkte |")
    lines.append("|---|---|---|")
    for c in report.categories:
        pts = "übersprungen" if c.skipped else f"{c.score}/100"
        lines.append(f"| {c.name} | {c.weight} % | {pts} |")
    lines.append("")

    # Top-Maßnahmen: alle kritischen und Warnungen mit Empfehlung, nach Gewicht der Kategorie
    actions = []
    for c in report.categories:
        for f in c.findings:
            if f.severity in (CRITICAL, WARNING) and f.recommendation:
                actions.append((ORDER[f.severity], -c.weight, c.name, f))
    actions.sort(key=lambda t: (t[0], t[1]))
    if actions:
        lines.append("## Wichtigste Maßnahmen")
        lines.append("")
        for i, (_, _, cname, f) in enumerate(actions[:8], 1):
            lines.append(f"{i}. **{f.title}** ({cname}): {f.recommendation}")
        lines.append("")

    if report.probe:
        s = report.meta.get("probe_summary", {})
        lines.append("## KI-Sichtbarkeit")
        lines.append("")
        lines.append(f"{s.get('asked', 0)} Kundenfragen gestellt, davon {s.get('valid', 0)} auswertbar.  ")
        lines.append(f"**Genannt:** {s.get('mentioned', 0)} mal · **Als Quelle zitiert:** {s.get('cited', 0)} mal  ")
        if s.get("top_competitors"):
            comp = ", ".join(f"{n} ({k}×)" for n, k in s["top_competitors"])
            lines.append(f"**Stattdessen genannt:** {comp}")
        lines.append("")
        lines.append("| Frage | Genannt | Zitiert | Genannte Anbieter |")
        lines.append("|---|---|---|---|")
        for q in report.probe:
            if q.error:
                lines.append(f"| {q.question} | Fehler | – | {q.error[:80]} |")
                continue
            lines.append(
                f"| {q.question} | {'ja' if q.target_mentioned else 'nein'} | {'ja' if q.target_cited else 'nein'} | "
                f"{', '.join(q.providers_mentioned[:5])} |"
            )
        lines.append("")

    lines.append("## Befunde im Detail")
    lines.append("")
    for c in report.categories:
        lines.append(f"### {c.name} – {'übersprungen' if c.skipped else str(c.score) + '/100'}")
        lines.append("")
        if c.skipped:
            lines.append(f"_{c.skipped_reason}_")
            lines.append("")
            continue
        for f in sorted(c.findings, key=lambda f: ORDER[f.severity]):
            line = f"- {ICON[f.severity]} **{f.title}**"
            if f.detail:
                line += f" – {f.detail}"
            lines.append(line)
            if f.recommendation:
                lines.append(f"  - Empfehlung: {f.recommendation}")
        lines.append("")

    lines.append("---")
    lines.append("_Erstellt mit agent-readiness. Die Prüfung ersetzt keine manuelle Analyse, zeigt aber die größten Hürden für KI-Agenten._")
    return "\n".join(lines)


def write_reports(report: Report, out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = report.domain.replace(".", "_")
    md_path = out_dir / f"{stem}.md"
    json_path = out_dir / f"{stem}.json"
    md_path.write_text(to_markdown(report), encoding="utf-8")
    json_path.write_text(json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return md_path, json_path
