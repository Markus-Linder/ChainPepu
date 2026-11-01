"""Prüft, ob KI-Crawler die Website überhaupt lesen dürfen."""

from __future__ import annotations

from ..http import Fetcher
from ..models import CategoryResult, CRITICAL, WARNING, INFO, OK

# Bekannte KI-Crawler, gruppiert nach Zweck. Suche/Antworten ist für Sichtbarkeit entscheidend,
# Training ist eine Geschäftsentscheidung des Kunden.
SEARCH_BOTS = {
    "OAI-SearchBot": "ChatGPT Suche",
    "ChatGPT-User": "ChatGPT Live-Abruf",
    "Claude-SearchBot": "Claude Suche",
    "Claude-User": "Claude Live-Abruf",
    "PerplexityBot": "Perplexity",
    "Perplexity-User": "Perplexity Live-Abruf",
    "Google-Extended": "Google Gemini",
    "Applebot-Extended": "Apple Intelligence",
    "meta-externalagent": "Meta AI",
    "DuckAssistBot": "DuckDuckGo AI",
    "Amazonbot": "Alexa / Amazon",
}
TRAINING_BOTS = {
    "GPTBot": "OpenAI Training",
    "ClaudeBot": "Anthropic Training",
    "anthropic-ai": "Anthropic (alt)",
    "CCBot": "Common Crawl",
    "Bytespider": "ByteDance",
    "cohere-ai": "Cohere",
}


def parse_robots(text: str) -> dict[str, list[tuple[str, str]]]:
    """Zerlegt robots.txt in {user-agent (lowercase): [(direktive, wert), ...]}."""
    groups: dict[str, list[tuple[str, str]]] = {}
    current: list[str] = []
    last_was_agent = False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()
        if key == "user-agent":
            if not last_was_agent:
                current = []
            current.append(value.lower())
            groups.setdefault(value.lower(), [])
            last_was_agent = True
            continue
        last_was_agent = False
        for agent in current:
            groups[agent].append((key, value))
    return groups


def is_fully_blocked(groups: dict[str, list[tuple[str, str]]], agent: str) -> bool | None:
    """True = Agent komplett gesperrt, False = erlaubt, None = keine eigene Regel (Fallback auf *)."""
    rules = groups.get(agent.lower())
    if rules is None:
        return None
    disallow_all = any(k == "disallow" and v == "/" for k, v in rules)
    allow_root = any(k == "allow" and v in ("/", "") for k, v in rules)
    return disallow_all and not allow_root


def check_crawlers(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="crawlers", name="Crawler-Zugang", weight=20, score=100)
    if ctx.get("tls_error"):
        result.score = 50
        result.add(CRITICAL, "HTTPS-Zertifikat ungültig", ctx["tls_error"],
                   "Gültiges Zertifikat einrichten (z. B. Let's Encrypt). Crawler und Agenten brechen bei TLS-Fehlern ab, die Prüfung lief über HTTP weiter.")
    robots = fetcher.get("/robots.txt")
    ctx["robots"] = robots

    if robots.error or robots.status >= 500:
        result.score = 60
        result.add(WARNING, "robots.txt nicht erreichbar", robots.error or f"HTTP {robots.status}",
                   "Eine erreichbare robots.txt ist Standard. Ohne sie gelten Crawler-Defaults, Fehler verunsichern Bots.")
        return _check_blocking_headers(fetcher, result)

    if robots.status == 404:
        result.add(INFO, "Keine robots.txt vorhanden", "Alle Crawler dürfen alles lesen.",
                   "Eine robots.txt mit Sitemap-Verweis anlegen, sonst in Ordnung.")
        return _check_blocking_headers(fetcher, result)

    groups = parse_robots(robots.text)
    ctx["robots_groups"] = groups
    wildcard_blocked = is_fully_blocked(groups, "*") is True

    if wildcard_blocked:
        result.score = 0
        result.add(CRITICAL, "robots.txt sperrt alle Crawler (User-agent: * / Disallow: /)",
                   "Weder Suchmaschinen noch KI-Agenten dürfen die Seite lesen.",
                   "Disallow: / für * entfernen und nur wirklich private Pfade sperren.")
        return result

    blocked_search = [n for a, n in SEARCH_BOTS.items() if is_fully_blocked(groups, a)]
    blocked_training = [n for a, n in TRAINING_BOTS.items() if is_fully_blocked(groups, a)]

    if blocked_search:
        penalty = min(70, 15 * len(blocked_search))
        result.score -= penalty
        result.add(CRITICAL if len(blocked_search) >= 3 else WARNING,
                   f"{len(blocked_search)} KI-Such-Crawler ausgesperrt",
                   "Gesperrt: " + ", ".join(blocked_search),
                   "Such- und Antwort-Crawler freigeben. Sie entscheiden, ob die Firma in KI-Antworten auftaucht.",
                   blocked=blocked_search)
    else:
        result.add(OK, "KI-Such-Crawler dürfen lesen", "Keiner der bekannten Antwort-Crawler ist gesperrt.")

    if blocked_training:
        result.add(INFO, f"{len(blocked_training)} Trainings-Crawler gesperrt",
                   "Gesperrt: " + ", ".join(blocked_training),
                   "Kein Sichtbarkeitsproblem. Bewusste Entscheidung, Trainingsdaten zu verweigern, ist legitim.",
                   blocked=blocked_training)

    sitemaps = [v for rules in groups.values() for k, v in rules if k == "sitemap"]
    sitemap_lines = [l.split(":", 1)[1].strip() for l in robots.text.splitlines() if l.lower().startswith("sitemap:")]
    sitemaps = list(dict.fromkeys(sitemaps + sitemap_lines))
    ctx["sitemaps_from_robots"] = sitemaps
    if not sitemaps:
        result.score -= 10
        result.add(WARNING, "Kein Sitemap-Verweis in robots.txt", "",
                   "Zeile 'Sitemap: https://domain/sitemap.xml' ergänzen.")

    crawl_delay = [v for rules in groups.values() for k, v in rules if k == "crawl-delay"]
    if crawl_delay:
        try:
            if max(float(v) for v in crawl_delay) >= 10:
                result.score -= 5
                result.add(INFO, "Hoher Crawl-delay", f"Werte: {', '.join(crawl_delay)}",
                           "Bremst vollständiges Indexieren. Unter 5 Sekunden halten oder entfernen.")
        except ValueError:
            pass

    result.score = max(0, result.score)
    return _check_blocking_headers(fetcher, result)


def _check_blocking_headers(fetcher: Fetcher, result: CategoryResult) -> CategoryResult:
    """Prüft, ob die Startseite per HTTP-Header oder Meta-Tag Indexierung untersagt oder Bots blockt."""
    home = fetcher.get("/")
    xrt = home.headers.get("x-robots-tag", "")
    if "noindex" in xrt.lower() or "noai" in xrt.lower():
        result.score = max(0, result.score - 40)
        result.add(CRITICAL, "X-Robots-Tag verbietet Indexierung", f"Header: {xrt}",
                   "Header entfernen, sofern die Seite öffentlich gefunden werden soll.")
    # Test mit Bot-Kennung: antwortet der Server anders als dem normalen Browser?
    bot_view = fetcher.get("/", user_agent="Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)")
    if home.ok and bot_view.status in (401, 403, 429, 503):
        result.score = max(0, result.score - 40)
        result.add(CRITICAL, "Server blockt KI-Bot auf Netzwerkebene",
                   f"Antwort für GPTBot-Kennung: HTTP {bot_view.status}, für Browser: HTTP {home.status}",
                   "Firewall, CDN oder Bot-Schutz (z. B. Cloudflare 'Block AI bots') prüfen und Such-Crawler freigeben.")
    elif home.ok and bot_view.ok and len(bot_view.text) < len(home.text) * 0.3:
        result.score = max(0, result.score - 15)
        result.add(WARNING, "KI-Bot bekommt deutlich weniger Inhalt als Browser",
                   f"{len(bot_view.text)} Zeichen für Bot gegenüber {len(home.text)} für Browser",
                   "Prüfen, ob ein Bot-Schutz oder Cloaking den Inhalt kürzt.")
    return result
