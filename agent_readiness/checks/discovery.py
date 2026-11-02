"""Checks discoverability files: sitemap, llms.txt, feeds."""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..i18n import _
from ..models import CategoryResult, WARNING, INFO, OK


def check_discovery(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="discovery", name=_("Discoverability"), weight=15, score=0)
    soup = BeautifulSoup(home_html or "", "html.parser")

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
        result.add(OK, _("Sitemap present"), _("{url} with {n} entries").format(url=sitemap_ok.final_url, n=n), "", url=sitemap_ok.final_url, entries=n)
    else:
        result.add(WARNING, _("No sitemap found"), _("Neither in robots.txt nor at /sitemap.xml"),
                   _("Generate an XML sitemap and reference it in robots.txt."))

    llms = fetcher.get("/llms.txt")
    if llms.ok and llms.text.strip().startswith("#") and "<html" not in llms.text[:500].lower():
        result.score += 35
        result.add(OK, _("llms.txt present"), _("{n} characters").format(n=len(llms.text)),
                   _("Keep it current: services, prices, contact, key pages."))
        full = fetcher.get("/llms-full.txt")
        if full.ok and "<html" not in full.text[:500].lower():
            result.score += 5
            result.add(OK, _("llms-full.txt present"), _("{n} characters").format(n=len(full.text)))
    else:
        result.add(WARNING, _("No llms.txt"),
                   _("Agents find no compact, machine-readable summary of the offer."),
                   _("Create /llms.txt in Markdown: what the company offers, for whom, on what terms, links to the core pages."))

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
        result.add(OK, _("Feed present"), ", ".join(feed_urls[:3]), "", feeds=feed_urls[:5])
    else:
        result.add(INFO, _("No RSS/Atom feed"), _("Not mandatory, but helps with news and product updates."))

    canonical = soup.find("link", rel=lambda v: v and "canonical" in v)
    if canonical and canonical.get("href"):
        result.score += 10
        result.add(OK, _("Canonical set"), canonical["href"])
    else:
        result.add(INFO, _("No canonical link"), "", _("Set one canonical per page to avoid duplicates."))

    html_tag = soup.find("html")
    lang = (html_tag.get("lang") if html_tag else None) or ""
    ctx["lang"] = lang
    if lang:
        result.score += 5
        result.add(OK, _("Language declared"), f'lang="{lang}"')
    else:
        result.add(INFO, _("No lang attribute on <html>"), "", _("Set lang=\"de\" or lang=\"en\"; helps language assignment."))

    result.score = min(100, result.score)
    return result
