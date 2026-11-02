"""Checks structured data (JSON-LD, Microdata) that agents can parse directly."""

from __future__ import annotations

import json
from typing import Any

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..i18n import _
from ..models import CategoryResult, WARNING, INFO, OK

ENTITY_TYPES = {"Organization", "LocalBusiness", "Corporation", "Store", "Restaurant", "Hotel", "ProfessionalService", "OnlineStore"}
OFFER_TYPES = {"Product", "Offer", "Service", "AggregateOffer", "Event", "Course"}
HELPFUL_TYPES = {"FAQPage", "HowTo", "BreadcrumbList", "WebSite", "Article", "Review", "AggregateRating", "ContactPoint", "OpeningHoursSpecification"}


def extract_jsonld(html: str) -> list[dict[str, Any]]:
    """Reads all JSON-LD blocks and flattens @graph."""
    soup = BeautifulSoup(html or "", "html.parser")
    items: list[dict[str, Any]] = []
    for tag in soup.find_all("script", attrs={"type": lambda v: v and "ld+json" in v.lower()}):
        raw = tag.string or tag.get_text() or ""
        try:
            data = json.loads(raw.strip())
        except json.JSONDecodeError:
            items.append({"@type": "__invalid__", "_raw": raw[:200]})
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            node = stack.pop()
            if not isinstance(node, dict):
                continue
            if "@graph" in node and isinstance(node["@graph"], list):
                stack.extend(node["@graph"])
            items.append(node)
    return items


def collect_types(items: list[dict[str, Any]]) -> set[str]:
    types: set[str] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            t = node.get("@type")
            if isinstance(t, str):
                types.add(t)
            elif isinstance(t, list):
                types.update(x for x in t if isinstance(x, str))
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(items)
    return types


def has_price(items: list[dict[str, Any]]) -> bool:
    def walk(node: Any) -> bool:
        if isinstance(node, dict):
            if any(k in node for k in ("price", "lowPrice", "priceRange", "priceSpecification")):
                return True
            return any(walk(v) for v in node.values())
        if isinstance(node, list):
            return any(walk(v) for v in node)
        return False

    return walk(items)


def check_structured_data(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="structured", name=_("Structured data"), weight=25, score=0)
    items = extract_jsonld(home_html)
    invalid = [i for i in items if i.get("@type") == "__invalid__"]
    items = [i for i in items if i.get("@type") != "__invalid__"]
    types = collect_types(items)
    ctx["jsonld_types"] = sorted(types)

    soup = BeautifulSoup(home_html or "", "html.parser")
    microdata = bool(soup.find(attrs={"itemscope": True}))
    og = {m.get("property"): m.get("content") for m in soup.find_all("meta", attrs={"property": lambda v: v and v.startswith("og:")})}

    if invalid:
        result.add(WARNING, _("{n} JSON-LD block(s) with syntax errors").format(n=len(invalid)), invalid[0].get("_raw", ""),
                   _("Validate JSON-LD (e.g. validator.schema.org). Broken blocks are ignored."))

    if not items and not microdata:
        result.add(WARNING, _("No structured data on the home page"),
                   _("Neither JSON-LD nor Microdata found. Agents have to guess everything from prose."),
                   _("Embed at least Organization/LocalBusiness with name, address, phone, URL as JSON-LD."))
    else:
        result.score += 20
        result.add(OK, _("Structured data present"), _("Types: ") + (", ".join(sorted(types)) or _("Microdata only")), "", types=sorted(types))

    if types & ENTITY_TYPES:
        result.score += 25
        result.add(OK, _("Company/organization marked up"), ", ".join(sorted(types & ENTITY_TYPES)))
        org = next((i for i in items if (i.get("@type") in ENTITY_TYPES) or (isinstance(i.get("@type"), list) and set(i["@type"]) & ENTITY_TYPES)), {})
        missing = [k for k in ("name", "url", "telephone", "address") if k not in org]
        if missing:
            result.score -= 5
            result.add(INFO, _("Organization data incomplete"), _("Missing: ") + ", ".join(missing),
                       _("Add name, url, telephone, address, sameAs (social profiles)."))
    else:
        result.add(WARNING, _("No Organization or LocalBusiness type"),
                   _("Agents cannot reliably identify company, location and contact."),
                   _("Embed Organization or LocalBusiness as JSON-LD with name, url, telephone, address, sameAs."))

    if types & OFFER_TYPES:
        result.score += 25
        result.add(OK, _("Offers marked up"), ", ".join(sorted(types & OFFER_TYPES)))
        if has_price(items):
            result.score += 10
            result.add(OK, _("Prices machine-readable"), _("price/priceRange found in JSON-LD"))
        else:
            result.add(WARNING, _("Offers without price in the data"), "",
                       _("Add Offer with price, priceCurrency and availability, otherwise no agent can compare."))
    else:
        result.add(WARNING, _("No Product, Service or Offer markup"),
                   _("The home page names no machine-readable services."),
                   _("Mark up core services as Service/Product with Offer, on the home page or linked pages."))

    helpful = types & HELPFUL_TYPES
    if helpful:
        result.score += min(15, 5 * len(helpful))
        result.add(OK, _("Supporting types"), ", ".join(sorted(helpful)))
    if "FAQPage" not in types:
        result.add(INFO, _("No FAQPage"), "",
                   _("Mark up frequent customer questions as FAQPage. Agents like to reuse such answers."))

    if og.get("og:title") and og.get("og:description"):
        result.score += 5
        result.add(OK, _("Open Graph data present"), og.get("og:title", ""))
    else:
        result.add(INFO, _("Open Graph incomplete"), "", _("Set og:title, og:description, og:image."))

    result.score = max(0, min(100, result.score))
    return result
