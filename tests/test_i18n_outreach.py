"""Translation completeness, English reports and outreach drafts (offline)."""

import re
from pathlib import Path

import pytest

from agent_readiness.i18n import set_language, _
from agent_readiness.translations.de import STRINGS
from agent_readiness.models import Report, CategoryResult
from agent_readiness.report import to_markdown
from agent_readiness.scoring import grade
from agent_readiness.outreach import build_email
from agent_readiness.outreach.draft import Sender, is_suppressed, unsubscribe_token

PKG = Path(__file__).resolve().parents[1] / "agent_readiness"


@pytest.fixture(autouse=True)
def _reset_language():
    yield
    set_language("de")


def _source_strings() -> set[str]:
    used = set()
    for p in PKG.rglob("*.py"):
        if "translations" in str(p):
            continue
        for m in re.finditer(r'_\((?:"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\')\)', p.read_text(encoding="utf-8")):
            s = m.group(1) if m.group(1) is not None else m.group(2)
            used.add(s.replace('\\"', '"'))
    return used


def test_every_source_string_has_a_german_translation():
    missing = _source_strings() - set(STRINGS)
    assert not missing, f"Untranslated: {sorted(missing)}"


def test_placeholders_match_between_languages():
    for en, de in STRINGS.items():
        assert set(re.findall(r"\{(\w+)\}", en)) == set(re.findall(r"\{(\w+)\}", de)), en


def test_language_switch():
    set_language("en")
    assert _("Crawler access") == "Crawler access"
    assert grade(90) == "A – agent-ready"
    set_language("de")
    assert _("Crawler access") == "Crawler-Zugang"
    assert grade(90) == "A – agentenfähig"
    with pytest.raises(ValueError):
        set_language("fr")


def _report(lang: str) -> Report:
    set_language(lang)
    c1 = CategoryResult("crawlers", _("Crawler access"), 20, 100)
    c1.add("ok", _("AI search crawlers may read"), "")
    c2 = CategoryResult("structured", _("Structured data"), 25, 10)
    c2.add("warnung", _("No structured data on the home page"), _("Neither JSON-LD nor Microdata found. Agents have to guess everything from prose."),
           _("Embed at least Organization/LocalBusiness with name, address, phone, URL as JSON-LD."))
    c3 = CategoryResult("content", _("Content clarity"), 25, 40)
    c3.add("kritisch", _("Hardly any readable text without JavaScript"), "", _("Render server-side or use prerendering. Many agents do not execute JavaScript."))
    return Report("https://example.com/", "example.com", "Example Inc", "today", [c1, c2, c3], 45)


def test_english_markdown_report():
    md = to_markdown(_report("en"))
    assert "# Agent Readiness Audit: Example Inc" in md
    assert "## Top actions" in md
    assert "Recommendation: Render server-side" in md
    assert "D – hard for agents to use" in md
    assert "Empfehlung" not in md


def test_outreach_email_english_and_german():
    sender = Sender("Jane Doe", "Founder", "LLM Readiness", "https://llmreadiness.com", "+49 1", "Street 1, Berlin", "https://llmreadiness.com/unsubscribe")
    subject, body = build_email(_report("en"), "ceo@example.com", "Mr. Smith", "en", "b2b-allowed-jurisdiction", sender=sender)
    assert "45/100" in subject and "Example Inc" in subject
    assert body.startswith("Hello Mr. Smith,")
    assert "1. Hardly any readable text without JavaScript" in body  # critical first
    assert "2. No structured data on the home page" in body
    assert "What already works well: AI search crawlers may read" in body
    assert "unsubscribe?e=ceo@example.com&t=" in body
    assert "jurisdiction" in body

    subject_de, body_de = build_email(_report("de"), "chef@example.com", "", "de", "inquiry", sender=sender)
    assert body_de.startswith("Guten Tag,")
    assert "1. Kaum lesbarer Text ohne JavaScript" in body_de
    assert "Schnellcheck" in body_de
    assert "Jane Doe" in body_de


def test_suppression_list(tmp_path):
    f = tmp_path / "s.txt"
    f.write_text("# blocked\nno@example.com\n@blocked.org\n", encoding="utf-8")
    assert is_suppressed("No@Example.com", f)
    assert is_suppressed("anyone@blocked.org", f)
    assert not is_suppressed("ok@example.com", f)
    assert not is_suppressed("ok@example.com", tmp_path / "missing.txt")
    assert len(unsubscribe_token("a@b.c")) == 16
