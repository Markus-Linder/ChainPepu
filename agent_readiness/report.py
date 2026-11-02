"""Renders the report as Markdown and JSON."""

from __future__ import annotations

import json
from pathlib import Path

from .i18n import _, get_language
from .models import Report, CRITICAL, WARNING, INFO, OK
from .scoring import grade

ICON = {CRITICAL: "🔴", WARNING: "🟠", INFO: "🔵", OK: "🟢"}
ORDER = {CRITICAL: 0, WARNING: 1, INFO: 2, OK: 3}


def severity_label(sev: str) -> str:
    return {CRITICAL: _("Critical"), WARNING: _("Warning"), INFO: _("Note"), OK: _("OK")}.get(sev, sev)


def to_markdown(report: Report) -> str:
    yes, no = _("yes"), _("no")
    lines: list[str] = []
    lines.append(f"# {_('Agent Readiness Audit')}: {report.brand or report.domain}")
    lines.append("")
    lines.append(f"**URL:** {report.url}  ")
    lines.append(f"**{_('Generated')}:** {report.generated_at}  ")
    lines.append(f"**{_('Total score')}:** {report.total_score}/100 ({grade(report.total_score)})")
    lines.append("")
    lines.append(f"## {_('Overview')}")
    lines.append("")
    lines.append(f"| {_('Category')} | {_('Weight')} | {_('Score')} |")
    lines.append("|---|---|---|")
    for c in report.categories:
        pts = _("skipped") if c.skipped else f"{c.score}/100"
        lines.append(f"| {c.name} | {c.weight} % | {pts} |")
    lines.append("")

    actions = []
    for c in report.categories:
        for f in c.findings:
            if f.severity in (CRITICAL, WARNING) and f.recommendation:
                actions.append((ORDER[f.severity], -c.weight, c.name, f))
    actions.sort(key=lambda t: (t[0], t[1]))
    if actions:
        lines.append(f"## {_('Top actions')}")
        lines.append("")
        for i, (_o, _w, cname, f) in enumerate(actions[:8], 1):
            lines.append(f"{i}. **{f.title}** ({cname}): {f.recommendation}")
        lines.append("")

    if report.probe:
        s = report.meta.get("probe_summary", {})
        lines.append(f"## {_('AI visibility')}")
        lines.append("")
        lines.append(_("{asked} customer questions asked, {valid} of them evaluable.").format(asked=s.get("asked", 0), valid=s.get("valid", 0)) + "  ")
        lines.append(f"**{_('Mentioned')}:** {s.get('mentioned', 0)}× · **{_('Cited as source')}:** {s.get('cited', 0)}×  ")
        if s.get("top_competitors"):
            comp = ", ".join(f"{n} ({k}×)" for n, k in s["top_competitors"])
            lines.append(f"**{_('Named instead')}:** {comp}")
        lines.append("")
        lines.append(f"| {_('Question')} | {_('Mentioned')} | {_('Cited')} | {_('Providers named')} |")
        lines.append("|---|---|---|---|")
        for q in report.probe:
            if q.error:
                lines.append(f"| {q.question} | {_('error')} | – | {q.error[:80]} |")
                continue
            lines.append(
                f"| {q.question} | {yes if q.target_mentioned else no} | {yes if q.target_cited else no} | "
                f"{', '.join(q.providers_mentioned[:5])} |"
            )
        lines.append("")

    lines.append(f"## {_('Findings in detail')}")
    lines.append("")
    for c in report.categories:
        lines.append(f"### {c.name} – {_('skipped') if c.skipped else str(c.score) + '/100'}")
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
                lines.append(f"  - {_('Recommendation')}: {f.recommendation}")
        lines.append("")

    lines.append("---")
    lines.append("_" + _("Created with agent-readiness. The check does not replace a manual analysis but shows the biggest hurdles for AI agents.") + "_")
    return "\n".join(lines)


def write_reports(report: Report, out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = report.domain.replace(".", "_")
    suffix = "" if get_language() == "de" else f".{get_language()}"
    md_path = out_dir / f"{stem}{suffix}.md"
    json_path = out_dir / f"{stem}{suffix}.json"
    report.meta["language"] = get_language()
    md_path.write_text(to_markdown(report), encoding="utf-8")
    json_path.write_text(json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return md_path, json_path
