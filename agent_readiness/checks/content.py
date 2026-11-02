"""Checks whether the visible content is clear, fact-rich and readable without a browser."""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..i18n import _
from ..models import CategoryResult, CRITICAL, WARNING, INFO, OK

PRICE_RE = re.compile(r"(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?\s?(?:€|EUR|Euro|USD|\$|£|CHF)|(?:€|EUR|USD|\$|£|CHF)\s?\d+)", re.I)
PHONE_RE = re.compile(r"(\+\d{1,3}[\s\d/().-]{6,}|\b0\d{2,5}[\s/-]?\d{3,}[\s\d-]*|\(\d{3}\)\s?\d{3}-\d{4})")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
FLUFF = ["marktführend", "innovativ", "ganzheitlich", "maßgeschneidert", "einzigartig", "führender anbieter",
         "höchste qualität", "kundenorientiert", "leidenschaft", "exzellen",
         "market leader", "market-leading", "innovative", "cutting-edge", "best-in-class", "world-class",
         "tailored", "unique", "passionate", "excellence", "seamless", "unlock"]


def visible_text(html: str) -> str:
    soup = BeautifulSoup(html or "", "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "template"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()


def check_content(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="content", name=_("Content clarity"), weight=25, score=0)
    soup = BeautifulSoup(home_html or "", "html.parser")
    text = visible_text(home_html)
    ctx["visible_text"] = text
    words = len(text.split())

    title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    desc_tag = soup.find("meta", attrs={"name": lambda v: v and v.lower() == "description"})
    desc = (desc_tag.get("content") or "").strip() if desc_tag else ""
    h1s = [h.get_text(" ", strip=True) for h in soup.find_all("h1")]
    ctx["title"], ctx["description"], ctx["h1"] = title, desc, h1s

    if words < 80:
        result.add(CRITICAL, _("Hardly any readable text without JavaScript"),
                   _("Only {n} words in the delivered HTML.").format(n=words),
                   _("Render server-side or use prerendering. Many agents do not execute JavaScript."))
    elif words < 250:
        result.score += 10
        result.add(WARNING, _("Little text on the home page"), _("{n} words").format(n=words),
                   _("Put core offer, audience and terms in clear sentences on the home page."))
    else:
        result.score += 20
        result.add(OK, _("Enough text in the HTML"), _("{n} words readable without JavaScript").format(n=words))

    if title and 10 <= len(title) <= 70:
        result.score += 10
        result.add(OK, _("Page title present"), title)
    elif title:
        result.score += 5
        result.add(INFO, _("Page title too long or too short"), _("{n} characters: {title}").format(n=len(title), title=title),
                   _("Title with company name and core service, 30 to 65 characters."))
    else:
        result.add(WARNING, _("No page title"), "", _("Set a title with company name and core service."))

    if desc and 50 <= len(desc) <= 170:
        result.score += 10
        result.add(OK, _("Meta description present"), desc)
    elif desc:
        result.score += 5
        result.add(INFO, _("Meta description too long or too short"), _("{n} characters").format(n=len(desc)),
                   _("One or two sentences: what, for whom, where."))
    else:
        result.add(WARNING, _("No meta description"), "",
                   _("Add a description with offer, audience and location. Agents often quote it verbatim."))

    if len(h1s) == 1:
        result.score += 10
        result.add(OK, _("Exactly one H1"), h1s[0])
    elif h1s:
        result.score += 5
        result.add(INFO, _("{n} H1 headings").format(n=len(h1s)), "; ".join(h1s[:3]), _("One H1 per page with the core offer."))
    else:
        result.add(WARNING, _("No H1"), "", _("Add an H1 with the core offer."))

    prices = PRICE_RE.findall(text)
    if prices:
        result.score += 15
        result.add(OK, _("Prices visible in text"), ", ".join(dict.fromkeys(p.strip() for p in prices))[:200])
    else:
        result.add(WARNING, _("No prices or price ranges in the text"),
                   _("Agents cannot classify or compare the offer."),
                   _("Name at least 'from' prices or ranges. Sites without prices are skipped in comparison questions."))

    phone = PHONE_RE.search(text)
    email = EMAIL_RE.search(text)
    if phone or email:
        result.score += 10
        result.add(OK, _("Contact details in text"), " / ".join(x.group(0).strip() for x in (phone, email) if x))
    else:
        result.add(WARNING, _("No phone number or email in the HTML"), "",
                   _("Provide contact as text, not only as image or form."))

    fluff_hits = [f for f in FLUFF if f in text.lower()]
    numbers = len(re.findall(r"\b\d{2,}\b", text))
    if len(fluff_hits) >= 3 and numbers < 5:
        result.add(WARNING, _("Much marketing language, few facts"),
                   _("Buzzwords: {words}. Only {n} numbers in the text.").format(words=", ".join(fluff_hits), n=numbers),
                   _("Give concrete figures: quantities, delivery times, prices, years, locations, references."))
    else:
        result.score += 10
        result.add(OK, _("Fact density fine"), _("{n} numeric facts, {f} buzzwords").format(n=numbers, f=len(fluff_hits)))

    imgs = soup.find_all("img")
    no_alt = [i for i in imgs if not (i.get("alt") or "").strip()]
    if imgs and len(no_alt) / len(imgs) > 0.5:
        result.add(INFO, _("Many images without alt text"), _("{a} of {b}").format(a=len(no_alt), b=len(imgs)),
                   _("Alt texts describe products for agents that do not analyze images."))
    else:
        result.score += 5

    pdf_links = [a for a in soup.find_all("a", href=True) if a["href"].lower().endswith(".pdf")]
    if len(pdf_links) >= 3:
        result.add(INFO, _("{n} PDF links on the home page").format(n=len(pdf_links)), "",
                   _("Offer catalogs and price lists as HTML too. PDFs are read less often and less well."))

    result.score = max(0, min(100, result.score))
    return result
