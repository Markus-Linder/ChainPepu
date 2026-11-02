"""Checks whether agents can interact with the website through interfaces."""

from __future__ import annotations

import json

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..i18n import _
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
    result = CategoryResult(key="interfaces", name=_("Agent interfaces"), weight=15, score=0)
    soup = BeautifulSoup(home_html or "", "html.parser")

    api = next((p for p in API_PATHS if _is_json(fetcher.get(p))), None)
    if api:
        result.score += 40
        result.add(OK, _("OpenAPI description found"), fetcher.absolute(api),
                   _("Agents can build requests from it. Make sure public endpoints are documented."))
    else:
        result.add(INFO, _("No OpenAPI description"), "",
                   _("Offer a small public API with an OpenAPI file for availability, prices or booking."))

    mcp = next((p for p in MCP_PATHS if fetcher.get(p).ok and fetcher.get(p).status != 404 and "<html" not in fetcher.get(p).text[:300].lower()), None)
    if mcp:
        result.score += 35
        result.add(OK, _("MCP endpoint reachable"), fetcher.absolute(mcp))
    else:
        result.add(INFO, _("No MCP server"), "",
                   _("A Model Context Protocol server lets agents act directly: request a quote, book an appointment, check stock."))

    agent_files = [p for p in AGENT_PATHS if _is_json(fetcher.get(p))]
    if agent_files:
        result.score += 15
        result.add(OK, _("Agent manifest present"), ", ".join(agent_files))

    forms = soup.find_all("form")
    booking_words = ("termin", "buch", "anfrage", "angebot", "kontakt", "bestell", "warenkorb", "shop",
                     "book", "appointment", "quote", "contact", "order", "cart", "checkout")
    text = (ctx.get("visible_text") or "").lower()
    has_booking = any(w in text for w in booking_words)
    if forms and not api and not mcp:
        result.add(INFO, _("{n} form(s), but no interface").format(n=len(forms)),
                   _("Agents are bad at filling forms. A direct path is missing."),
                   _("Offer the key action (inquiry, booking, order) additionally via API or email address.") if has_booking else "")

    mailto = soup.find("a", href=lambda h: h and h.startswith("mailto:"))
    tel = soup.find("a", href=lambda h: h and h.startswith("tel:"))
    if mailto or tel:
        result.score += 10
        result.add(OK, _("Direct contact links (mailto/tel)"), _("Agents can make contact without a form."))

    result.score = max(0, min(100, result.score))
    return result
