"""Prüft, ob Agenten über Schnittstellen mit der Website interagieren können."""

from __future__ import annotations

import json

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..models import CategoryResult, INFO, OK

API_PATHS = ["/openapi.json", "/swagger.json", "/api-docs", "/.well-known/openapi.json", "/api/openapi.json"]
MCP_PATHS = ["/.well-known/mcp.json", "/.well-known/mcp", "/mcp"]
AGENT_PATHS = ["/.well-known/ai-plugin.json", "/.well-known/agent.json", "/.well-known/agent-card.json"]


def _is_json(resp) -> bool:
    if not resp.ok:
        return False
    if "json" in resp.headers.get("content-type", ""):
        return True
    try:
        json.loads(resp.text[:200000])
        return True
    except (json.JSONDecodeError, ValueError):
        return False


def check_interfaces(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="interfaces", name="Agenten-Schnittstellen", weight=15, score=0)
    soup = BeautifulSoup(home_html or "", "html.parser")

    api = next((p for p in API_PATHS if _is_json(fetcher.get(p))), None)
    if api:
        result.score += 40
        result.add(OK, "OpenAPI-Beschreibung gefunden", fetcher.absolute(api),
                   "Agenten können daraus Abfragen bauen. Sicherstellen, dass öffentliche Endpunkte dokumentiert sind.")
    else:
        result.add(INFO, "Keine OpenAPI-Beschreibung", "",
                   "Für Verfügbarkeit, Preise oder Terminbuchung eine kleine öffentliche API mit OpenAPI-Datei anbieten.")

    mcp = next((p for p in MCP_PATHS if fetcher.get(p).ok and fetcher.get(p).status != 404 and "<html" not in fetcher.get(p).text[:300].lower()), None)
    if mcp:
        result.score += 35
        result.add(OK, "MCP-Endpunkt erreichbar", fetcher.absolute(mcp))
    else:
        result.add(INFO, "Kein MCP-Server", "",
                   "Ein Model-Context-Protocol-Server erlaubt Agenten direkte Aktionen: Angebot anfragen, Termin buchen, Bestand prüfen.")

    agent_files = [p for p in AGENT_PATHS if _is_json(fetcher.get(p))]
    if agent_files:
        result.score += 15
        result.add(OK, "Agenten-Manifest vorhanden", ", ".join(agent_files))

    forms = soup.find_all("form")
    booking_words = ("termin", "buch", "anfrage", "angebot", "kontakt", "bestell", "warenkorb", "shop")
    text = (ctx.get("visible_text") or "").lower()
    has_booking = any(w in text for w in booking_words)
    if forms and not api and not mcp:
        result.add(INFO, f"{len(forms)} Formular(e), aber keine Schnittstelle",
                   "Agenten können Formulare schlecht ausfüllen. Direkter Weg fehlt.",
                   "Die wichtigste Aktion (Anfrage, Termin, Bestellung) zusätzlich per API oder E-Mail-Adresse anbieten." if has_booking else "")

    mailto = soup.find("a", href=lambda h: h and h.startswith("mailto:"))
    tel = soup.find("a", href=lambda h: h and h.startswith("tel:"))
    if mailto or tel:
        result.score += 10
        result.add(OK, "Direkte Kontaktlinks (mailto/tel)", "Agenten können Kontakt ohne Formular aufnehmen.")

    result.score = max(0, min(100, result.score))
    return result
