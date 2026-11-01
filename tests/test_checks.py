"""Offline-Tests der technischen Prüfungen mit einem Fake-Fetcher."""

from pathlib import Path

import pytest

from agent_readiness.checks import ALL_CHECKS
from agent_readiness.checks.crawlers import parse_robots, is_fully_blocked, check_crawlers
from agent_readiness.checks.structured_data import extract_jsonld, collect_types, has_price
from agent_readiness.http import Fetched, normalize_url, domain_of
from agent_readiness.models import CategoryResult, CRITICAL
from agent_readiness.scoring import total_score, grade
from agent_readiness.report import to_markdown
from agent_readiness.models import Report

FIX = Path(__file__).parent / "fixtures"


class FakeFetcher:
    """Beantwortet Pfade aus einem Dict, alles andere mit 404."""

    def __init__(self, pages: dict[str, str], base="https://example.de/"):
        self.base_url = base
        self.pages = pages

    def absolute(self, path):
        return path if path.startswith("http") else self.base_url.rstrip("/") + "/" + path.lstrip("/")

    def get(self, path, user_agent=None):
        url = self.absolute(path)
        key = "/" + url[len(self.base_url):] if url.startswith(self.base_url) else url
        key = key if key.startswith("/") else "/" + key
        if key in self.pages:
            body = self.pages[key]
            ctype = "application/json" if key.endswith(".json") else "text/html"
            return Fetched(url, url, 200, {"content-type": ctype}, body)
        return Fetched(url, url, 404, {}, "not found")


def run_all(pages):
    f = FakeFetcher(pages)
    ctx = {}
    home = pages.get("/", "")
    return {c.key: c for c in (chk(f, home, ctx) for chk in ALL_CHECKS)}, ctx


# ---- robots.txt --------------------------------------------------------------

def test_parse_robots_groups_and_blocking():
    txt = """
    User-agent: *
    Disallow: /admin
    Sitemap: https://example.de/sitemap.xml

    User-agent: GPTBot
    User-agent: ClaudeBot
    Disallow: /

    User-agent: PerplexityBot
    Disallow: /
    Allow: /
    """
    g = parse_robots(txt)
    assert is_fully_blocked(g, "*") is False
    assert is_fully_blocked(g, "GPTBot") is True
    assert is_fully_blocked(g, "claudebot") is True
    assert is_fully_blocked(g, "PerplexityBot") is False  # Allow / hebt auf
    assert is_fully_blocked(g, "Unbekannt") is None


def test_crawlers_full_block_is_critical():
    pages = {"/": "<html><body>x</body></html>", "/robots.txt": "User-agent: *\nDisallow: /\n"}
    res = check_crawlers(FakeFetcher(pages), pages["/"], {})
    assert res.score == 0
    assert any(f.severity == CRITICAL for f in res.findings)


def test_crawlers_search_bots_blocked_reduces_score():
    pages = {"/": "<html><body>x</body></html>",
             "/robots.txt": "User-agent: *\nAllow: /\nSitemap: /s.xml\nUser-agent: OAI-SearchBot\nDisallow: /\nUser-agent: PerplexityBot\nDisallow: /\n"}
    res = check_crawlers(FakeFetcher(pages), pages["/"], {})
    assert res.score == 70
    assert any("KI-Such-Crawler" in f.title for f in res.findings)


# ---- strukturierte Daten -----------------------------------------------------

def test_jsonld_extraction():
    html = (FIX / "good_site.html").read_text(encoding="utf-8")
    items = extract_jsonld(html)
    types = collect_types(items)
    assert {"LocalBusiness", "Product", "Offer", "FAQPage", "PostalAddress"} <= types
    assert has_price(items)


def test_invalid_jsonld_is_reported():
    html = '<html><head><script type="application/ld+json">{not json</script></head><body></body></html>'
    items = extract_jsonld(html)
    assert items and items[0]["@type"] == "__invalid__"


# ---- Gesamtlauf --------------------------------------------------------------

def test_good_site_scores_high():
    home = (FIX / "good_site.html").read_text(encoding="utf-8")
    pages = {
        "/": home,
        "/robots.txt": "User-agent: *\nAllow: /\nSitemap: https://example.de/sitemap.xml\n",
        "/sitemap.xml": "<urlset><url><loc>https://example.de/</loc></url></urlset>",
        "/llms.txt": "# Müller Gabelstapler\n\n> Gebrauchte Stapler in Bühl\n",
        "/feed.xml": "<rss></rss>",
        "/openapi.json": '{"openapi":"3.1.0","paths":{}}',
    }
    cats, ctx = run_all(pages)
    assert cats["crawlers"].score == 100
    assert cats["discovery"].score >= 90
    assert cats["structured"].score >= 85
    assert cats["content"].score >= 85
    assert cats["interfaces"].score >= 50
    assert total_score(list(cats.values())) >= 80
    assert ctx["title"].startswith("Müller")


def test_bad_site_scores_low():
    home = (FIX / "bad_site.html").read_text(encoding="utf-8")
    cats, _ = run_all({"/": home})
    assert cats["structured"].score == 0
    assert cats["content"].score <= 10
    assert any(f.severity == CRITICAL and "JavaScript" in f.title for f in cats["content"].findings)
    assert total_score(list(cats.values())) < 40


def test_total_score_ignores_skipped():
    cats = [CategoryResult("a", "A", 50, 100), CategoryResult("b", "B", 50, 0, skipped=True)]
    assert total_score(cats) == 100
    assert grade(100).startswith("A")
    assert grade(10).startswith("E")


def test_markdown_report_renders():
    cats = [CategoryResult("a", "A", 50, 80)]
    cats[0].add("warnung", "Titel", "Detail", "Empfehlung")
    rep = Report("https://example.de/", "example.de", "Beispiel", "heute", cats, 80)
    md = to_markdown(rep)
    assert "# Agent-Readiness-Audit: Beispiel" in md
    assert "Empfehlung: Empfehlung" in md
    assert "80/100" in md


def test_url_helpers():
    assert normalize_url("beispiel.de/pfad?x=1") == "https://beispiel.de/"
    assert domain_of("https://www.beispiel.de/") == "beispiel.de"
