"""Prüft strukturierte Daten (JSON-LD, Microdata), die Agenten direkt auswerten können."""

from __future__ import annotations

import json
from typing import Any

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..models import CategoryResult, WARNING, INFO, OK

ENTITY_TYPES = {"Organization", "LocalBusiness", "Corporation", "Store", "Restaurant", "Hotel", "ProfessionalService", "OnlineStore"}
OFFER_TYPES = {"Product", "Offer", "Service", "AggregateOffer", "Event", "Course"}
HELPFUL_TYPES = {"FAQPage", "HowTo", "BreadcrumbList", "WebSite", "Article", "Review", "AggregateRating", "ContactPoint", "OpeningHoursSpecification"}


def extract_jsonld(html: str) -> list[dict[str, Any]]:
    """Liest alle JSON-LD-Blöcke und löst @graph auf."""
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
    result = CategoryResult(key="structured", name="Strukturierte Daten", weight=25, score=0)
    items = extract_jsonld(home_html)
    invalid = [i for i in items if i.get("@type") == "__invalid__"]
    items = [i for i in items if i.get("@type") != "__invalid__"]
    types = collect_types(items)
    ctx["jsonld_types"] = sorted(types)

    soup = BeautifulSoup(home_html or "", "html.parser")
    microdata = bool(soup.find(attrs={"itemscope": True}))
    og = {m.get("property"): m.get("content") for m in soup.find_all("meta", attrs={"property": lambda v: v and v.startswith("og:")})}

    if invalid:
        result.add(WARNING, f"{len(invalid)} JSON-LD-Block(e) mit Syntaxfehler", invalid[0].get("_raw", ""),
                   "JSON-LD validieren (z. B. validator.schema.org). Kaputte Blöcke werden ignoriert.")

    if not items and not microdata:
        result.add(WARNING, "Keine strukturierten Daten auf der Startseite",
                   "Weder JSON-LD noch Microdata gefunden. Agenten müssen alles aus Fließtext raten.",
                   "Mindestens Organization/LocalBusiness mit Name, Adresse, Telefon, URL als JSON-LD einbinden.")
    else:
        result.score += 20
        result.add(OK, "Strukturierte Daten vorhanden", "Typen: " + (", ".join(sorted(types)) or "nur Microdata"), "", types=sorted(types))

    if types & ENTITY_TYPES:
        result.score += 25
        result.add(OK, "Unternehmen/Organisation ausgezeichnet", ", ".join(sorted(types & ENTITY_TYPES)))
        org = next((i for i in items if (i.get("@type") in ENTITY_TYPES) or (isinstance(i.get("@type"), list) and set(i["@type"]) & ENTITY_TYPES)), {})
        missing = [k for k in ("name", "url", "telephone", "address") if k not in org]
        if missing:
            result.score -= 5
            result.add(INFO, "Organisationsdaten unvollständig", "Fehlt: " + ", ".join(missing),
                       "name, url, telephone, address, sameAs (Social-Profile) ergänzen.")
    else:
        result.add(WARNING, "Kein Organization- oder LocalBusiness-Typ",
                   "Agenten können Firma, Standort und Kontakt nicht sicher zuordnen.",
                   "Organization oder LocalBusiness als JSON-LD mit name, url, telephone, address, sameAs einbinden.")

    if types & OFFER_TYPES:
        result.score += 25
        result.add(OK, "Angebote ausgezeichnet", ", ".join(sorted(types & OFFER_TYPES)))
        if has_price(items):
            result.score += 10
            result.add(OK, "Preise maschinenlesbar", "price/priceRange in JSON-LD gefunden")
        else:
            result.add(WARNING, "Angebote ohne Preisangabe in den Daten", "",
                       "Offer mit price, priceCurrency und availability ergänzen, sonst kann kein Agent vergleichen.")
    else:
        result.add(WARNING, "Keine Product-, Service- oder Offer-Auszeichnung",
                   "Startseite nennt keine maschinenlesbaren Leistungen.",
                   "Kernleistungen als Service/Product mit Offer auszeichnen, auf Startseite oder verlinkten Seiten.")

    helpful = types & HELPFUL_TYPES
    if helpful:
        result.score += min(15, 5 * len(helpful))
        result.add(OK, "Ergänzende Typen", ", ".join(sorted(helpful)))
    if "FAQPage" not in types:
        result.add(INFO, "Keine FAQPage", "",
                   "Häufige Kundenfragen als FAQPage auszeichnen. Agenten übernehmen solche Antworten besonders gern.")

    if og.get("og:title") and og.get("og:description"):
        result.score += 5
        result.add(OK, "Open-Graph-Daten vorhanden", og.get("og:title", ""))
    else:
        result.add(INFO, "Open Graph unvollständig", "", "og:title, og:description, og:image setzen.")

    result.score = max(0, min(100, result.score))
    return result
