"""Prüft Auffindbarkeits-Dateien: Sitemap, llms.txt, Feeds."""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..models import CategoryResult, WARNING, INFO, OK


def check_discovery(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="discovery", name="Auffindbarkeit", weight=15, score=0)
    soup = BeautifulSoup(home_html or "", "html.parser")

    # Sitemap
    candidates = list(ctx.get("sitemaps_from_robots") or []) + ["/sitemap.xml", "/sitemap_index.xml"]
    sitemap_ok = None
    for cand in dict.fromkeys(candidates):
        resp = fetcher.get(cand)
        if resp.ok and ("<urlset" in resp.text or "<sitemapindex" in resp.text):
            sitemap_ok = resp
            break
    if sitemap_ok:
        n = len(re.findall(r"<loc>", sitemap_ok.text))
        result.score += 30
        result.add(OK, "Sitemap vorhanden", f"{sitemap_ok.final_url} mit {n} Einträgen", "", url=sitemap_ok.final_url, entries=n)
    else:
        result.add(WARNING, "Keine Sitemap gefunden", "Weder in robots.txt noch unter /sitemap.xml",
                   "XML-Sitemap erzeugen und in robots.txt eintragen.")

    # llms.txt
    llms = fetcher.get("/llms.txt")
    if llms.ok and llms.text.strip().startswith("#") and "<html" not in llms.text[:500].lower():
        result.score += 35
        result.add(OK, "llms.txt vorhanden", f"{len(llms.text)} Zeichen",
                   "Regelmäßig pflegen: Leistungen, Preise, Kontakt, wichtigste Seiten.")
        full = fetcher.get("/llms-full.txt")
        if full.ok and "<html" not in full.text[:500].lower():
            result.score += 5
            result.add(OK, "llms-full.txt vorhanden", f"{len(full.text)} Zeichen")
    else:
        result.add(WARNING, "Keine llms.txt",
                   "Agenten finden keine kompakte, maschinenlesbare Zusammenfassung des Angebots.",
                   "Eine /llms.txt im Markdown-Format anlegen: Was bietet die Firma, für wen, zu welchen Konditionen, Links zu den Kernseiten.")

    # Feeds
    feed_links = soup.find_all("link", attrs={"type": re.compile(r"application/(rss|atom)\+xml", re.I)})
    feed_urls = [l.get("href") for l in feed_links if l.get("href")]
    if not feed_urls:
        for cand in ("/feed", "/feed/", "/rss.xml", "/atom.xml", "/feed.xml"):
            r = fetcher.get(cand)
            if r.ok and ("<rss" in r.text[:2000] or "<feed" in r.text[:2000]):
                feed_urls.append(r.final_url)
                break
    if feed_urls:
        result.score += 15
        result.add(OK, "Feed vorhanden", ", ".join(feed_urls[:3]), "", feeds=feed_urls[:5])
    else:
        result.add(INFO, "Kein RSS/Atom-Feed", "Nicht zwingend, hilft aber bei Neuigkeiten und Produktupdates.")

    # Canonical, hreflang, Sprache
    canonical = soup.find("link", rel=lambda v: v and "canonical" in v)
    if canonical and canonical.get("href"):
        result.score += 10
        result.add(OK, "Canonical gesetzt", canonical["href"])
    else:
        result.add(INFO, "Kein Canonical-Link", "", "Pro Seite einen Canonical setzen, vermeidet Duplikate.")

    html_tag = soup.find("html")
    lang = (html_tag.get("lang") if html_tag else None) or ""
    ctx["lang"] = lang
    if lang:
        result.score += 5
        result.add(OK, "Sprache deklariert", f"lang=\"{lang}\"")
    else:
        result.add(INFO, "Kein lang-Attribut im <html>", "", "lang=\"de\" setzen, hilft bei Sprachzuordnung.")

    result.score = min(100, result.score)
    return result
