"""Builds a personal email from an audit report and manages drafts, suppression list and log."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from ..i18n import set_language
from ..models import Report, CRITICAL, WARNING, OK
from ..scoring import grade
from . import templates as T

SUPPRESSION_FILE = Path("outreach/suppression.txt")
LOG_FILE = Path("outreach/log.csv")


@dataclass
class Sender:
    name: str
    title: str
    company: str
    site: str
    phone: str
    address: str
    unsubscribe_base: str  # e.g. https://llmreadiness.com/unsubscribe

    @classmethod
    def from_env(cls) -> "Sender":
        return cls(
            name=os.environ.get("OUTREACH_SENDER_NAME", "Markus Linder"),
            title=os.environ.get("OUTREACH_SENDER_TITLE", "LLM Readiness"),
            company=os.environ.get("OUTREACH_SENDER_COMPANY", "LLM Readiness"),
            site=os.environ.get("OUTREACH_SENDER_SITE", "https://llmreadiness.com"),
            phone=os.environ.get("OUTREACH_SENDER_PHONE", ""),
            address=os.environ.get("OUTREACH_SENDER_ADDRESS", "[Adresse eintragen]"),
            unsubscribe_base=os.environ.get("OUTREACH_UNSUBSCRIBE_BASE", "https://llmreadiness.com/unsubscribe"),
        )


def _top_findings(report: Report, n: int = 3) -> list[tuple[str, str]]:
    """Picks the n most important actionable findings, weighted by severity and category weight."""
    order = {CRITICAL: 0, WARNING: 1}
    items = []
    for c in report.categories:
        if c.skipped:
            continue
        for f in c.findings:
            if f.severity in order and f.recommendation:
                items.append((order[f.severity], -c.weight, f.title, f.recommendation))
    items.sort(key=lambda t: (t[0], t[1]))
    return [(t, r) for _o, _w, t, r in items[:n]]


def _strength(report: Report) -> str:
    for c in sorted(report.categories, key=lambda c: -c.score):
        if c.skipped:
            continue
        oks = [f for f in c.findings if f.severity == OK]
        if c.score >= 70 and oks:
            return oks[0].title
    return ""


def unsubscribe_token(email: str) -> str:
    secret = os.environ.get("OUTREACH_UNSUBSCRIBE_SECRET", "change-me")
    return hashlib.sha256(f"{secret}:{email.lower()}".encode()).hexdigest()[:16]


def build_email(report: Report, to: str, name: str, lang: str, legal_basis: str,
                sender: Sender | None = None, subject_variant: int = 0) -> tuple[str, str]:
    """Returns (subject, body) in the requested language."""
    set_language(lang)
    sender = sender or Sender.from_env()
    findings = _top_findings(report)
    n_all = sum(len(c.findings) for c in report.categories if not c.skipped)
    lines = []
    for i, (title, rec) in enumerate(findings, 1):
        lines.append(f"{i}. {title}\n   {rec}")
    strength = _strength(report)
    strength_line = T.STRENGTH[lang].format(strength=strength) if strength else ""
    sal = T.SALUTATION[lang]["named"].format(name=name) if name else T.SALUTATION[lang]["anonymous"]
    unsubscribe_url = f"{sender.unsubscribe_base}?e={to}&t={unsubscribe_token(to)}"
    fields = dict(
        salutation=sal,
        domain=report.domain,
        brand=report.brand,
        score=report.total_score,
        grade=grade(report.total_score),
        findings="\n".join(lines),
        strength_line=strength_line,
        n_findings=n_all,
        proposed_slot=T.PROPOSED_SLOT[lang],
        sender_name=sender.name,
        sender_title=sender.title,
        sender_company=sender.company,
        sender_site=sender.site,
        sender_phone=sender.phone,
        legal_reason=T.LEGAL_REASON[lang][legal_basis],
        unsubscribe_url=unsubscribe_url,
        imprint_line=T.IMPRINT[lang].format(sender_company=sender.company, sender_address=sender.address, sender_name=sender.name),
    )
    subject = T.SUBJECTS[lang][subject_variant % len(T.SUBJECTS[lang])].format(**fields)
    body = T.BODY[lang].format(**fields)
    return subject, body


def is_suppressed(email: str, path: Path = SUPPRESSION_FILE) -> bool:
    if not path.exists():
        return False
    entries = {l.strip().lower() for l in path.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")}
    email = email.lower()
    domain = email.split("@")[-1]
    return email in entries or f"@{domain}" in entries


def log_event(to: str, domain: str, lang: str, legal_basis: str, status: str, message_id: str = "", path: Path = LOG_FILE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.exists()
    with path.open("a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(["timestamp", "to", "domain", "lang", "legal_basis", "status", "message_id"])
        w.writerow([datetime.now(timezone.utc).isoformat(timespec="seconds"), to, domain, lang, legal_basis, status, message_id])


def run_outreach(url: str, to: str, name: str, lang: str, out_dir: Path, legal_basis: str,
                 send: bool = False, verbose: bool = True, brand: str | None = None) -> int:
    from ..cli import run_audit

    log = (lambda *a: print(*a, file=sys.stderr)) if verbose else (lambda *a: None)
    if is_suppressed(to):
        log(f"{to} is on the suppression list. Nothing sent.")
        log_event(to, url, lang, legal_basis, "suppressed")
        return 2

    report = run_audit(url, brand, out_dir / "audits", probe=False, n_questions=0, model=None, region="DE",
                       questions_file=None, no_fallbacks=True, verbose=verbose, lang=lang)
    subject, body = build_email(report, to, name, lang, legal_basis)

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{report.domain.replace('.', '_')}.{lang}"
    draft_path = out_dir / f"{stem}.txt"
    draft_path.write_text(f"To: {to}\nSubject: {subject}\nLegal-Basis: {legal_basis}\n\n{body}", encoding="utf-8")
    (out_dir / f"{stem}.json").write_text(json.dumps({"to": to, "name": name, "subject": subject, "body": body,
                                                     "legal_basis": legal_basis, "domain": report.domain,
                                                     "score": report.total_score}, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"\nDraft: {draft_path}")

    if not send:
        log_event(to, report.domain, lang, legal_basis, "drafted")
        return 0

    from .sender import SmtpConfig, build_message, send_email

    cfg = SmtpConfig.from_env()
    sender = Sender.from_env()
    unsubscribe_url = f"{sender.unsubscribe_base}?e={to}&t={unsubscribe_token(to)}"
    msg = build_message(cfg, to, subject, body, unsubscribe_url, unsubscribe_mailto=cfg.reply_to or cfg.from_email)
    try:
        mid = send_email(cfg, msg)
    except Exception as exc:  # noqa: BLE001
        log(f"Send failed: {type(exc).__name__}: {exc}")
        log_event(to, report.domain, lang, legal_basis, f"failed: {type(exc).__name__}")
        return 1
    log(f"Sent to {to} ({mid})")
    log_event(to, report.domain, lang, legal_basis, "sent", mid)
    return 0
