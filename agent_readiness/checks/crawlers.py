"""Checks whether AI crawlers are allowed to read the website at all."""

from __future__ import annotations

from ..http import Fetcher
from ..i18n import _
from ..models import CategoryResult, CRITICAL, WARNING, INFO, OK

# Known AI crawlers grouped by purpose. Search/answer bots decide visibility,
# training bots are a business decision of the client.
SEARCH_BOTS = {
    "OAI-SearchBot": "ChatGPT Search",
    "ChatGPT-User": "ChatGPT live fetch",
    "Claude-SearchBot": "Claude Search",
    "Claude-User": "Claude live fetch",
    "PerplexityBot": "Perplexity",
    "Perplexity-User": "Perplexity live fetch",
    "Google-Extended": "Google Gemini",
    "Applebot-Extended": "Apple Intelligence",
    "meta-externalagent": "Meta AI",
    "DuckAssistBot": "DuckDuckGo AI",
    "Amazonbot": "Alexa / Amazon",
}
TRAINING_BOTS = {
    "GPTBot": "OpenAI training",
    "ClaudeBot": "Anthropic training",
    "anthropic-ai": "Anthropic (legacy)",
    "CCBot": "Common Crawl",
    "Bytespider": "ByteDance",
    "cohere-ai": "Cohere",
}


def parse_robots(text: str) -> dict[str, list[tuple[str, str]]]:
    """Parses robots.txt into {user-agent (lowercase): [(directive, value), ...]}."""
    groups: dict[str, list[tuple[str, str]]] = {}
    current: list[str] = []
    last_was_agent = False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, _sep, value = line.partition(":")
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
    """True = agent fully blocked, False = allowed, None = no own rule (falls back to *)."""
    rules = groups.get(agent.lower())
    if rules is None:
        return None
    disallow_all = any(k == "disallow" and v == "/" for k, v in rules)
    allow_root = any(k == "allow" and v in ("/", "") for k, v in rules)
    return disallow_all and not allow_root


def check_crawlers(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="crawlers", name=_("Crawler access"), weight=20, score=100)
    if ctx.get("tls_error"):
        result.score = 50
        result.add(CRITICAL, _("HTTPS certificate invalid"), ctx["tls_error"],
                   _("Install a valid certificate (e.g. Let's Encrypt). Crawlers and agents abort on TLS errors; this audit continued over HTTP."))
    robots = fetcher.get("/robots.txt")
    ctx["robots"] = robots

    if robots.error or robots.status >= 500:
        result.score = 60
        result.add(WARNING, _("robots.txt not reachable"), robots.error or f"HTTP {robots.status}",
                   _("A reachable robots.txt is standard. Without it crawler defaults apply and errors make bots cautious."))
        return _check_blocking_headers(fetcher, result)

    if robots.status == 404:
        result.add(INFO, _("No robots.txt"), _("All crawlers may read everything."),
                   _("Add a robots.txt with a sitemap reference; otherwise fine."))
        return _check_blocking_headers(fetcher, result)

    groups = parse_robots(robots.text)
    ctx["robots_groups"] = groups
    wildcard_blocked = is_fully_blocked(groups, "*") is True

    if wildcard_blocked:
        result.score = 0
        result.add(CRITICAL, _("robots.txt blocks all crawlers (User-agent: * / Disallow: /)"),
                   _("Neither search engines nor AI agents may read the site."),
                   _("Remove Disallow: / for * and block only genuinely private paths."))
        return result

    blocked_search = [n for a, n in SEARCH_BOTS.items() if is_fully_blocked(groups, a)]
    blocked_training = [n for a, n in TRAINING_BOTS.items() if is_fully_blocked(groups, a)]

    if blocked_search:
        penalty = min(70, 15 * len(blocked_search))
        result.score -= penalty
        result.add(CRITICAL if len(blocked_search) >= 3 else WARNING,
                   _("{n} AI search crawlers blocked").format(n=len(blocked_search)),
                   _("Blocked: ") + ", ".join(blocked_search),
                   _("Allow search and answer crawlers. They decide whether the company appears in AI answers."),
                   blocked=blocked_search)
    else:
        result.add(OK, _("AI search crawlers may read"), _("None of the known answer crawlers is blocked."))

    if blocked_training:
        result.add(INFO, _("{n} training crawlers blocked").format(n=len(blocked_training)),
                   _("Blocked: ") + ", ".join(blocked_training),
                   _("Not a visibility problem. Refusing training data is a legitimate choice."),
                   blocked=blocked_training)

    sitemaps = [v for rules in groups.values() for k, v in rules if k == "sitemap"]
    sitemap_lines = [l.split(":", 1)[1].strip() for l in robots.text.splitlines() if l.lower().startswith("sitemap:")]
    sitemaps = list(dict.fromkeys(sitemaps + sitemap_lines))
    ctx["sitemaps_from_robots"] = sitemaps
    if not sitemaps:
        result.score -= 10
        result.add(WARNING, _("No sitemap reference in robots.txt"), "",
                   _("Add the line 'Sitemap: https://domain/sitemap.xml'."))

    crawl_delay = [v for rules in groups.values() for k, v in rules if k == "crawl-delay"]
    if crawl_delay:
        try:
            if max(float(v) for v in crawl_delay) >= 10:
                result.score -= 5
                result.add(INFO, _("High crawl-delay"), _("Values: ") + ", ".join(crawl_delay),
                           _("Slows down full indexing. Keep below 5 seconds or remove."))
        except ValueError:
            pass

    result.score = max(0, result.score)
    return _check_blocking_headers(fetcher, result)


def _check_blocking_headers(fetcher: Fetcher, result: CategoryResult) -> CategoryResult:
    """Checks whether the home page forbids indexing via header or blocks bots at the network level."""
    home = fetcher.get("/")
    xrt = home.headers.get("x-robots-tag", "")
    if "noindex" in xrt.lower() or "noai" in xrt.lower():
        result.score = max(0, result.score - 40)
        result.add(CRITICAL, _("X-Robots-Tag forbids indexing"), f"Header: {xrt}",
                   _("Remove the header if the site is meant to be found publicly."))
    bot_view = fetcher.get("/", user_agent="Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)")
    if home.ok and bot_view.status in (401, 403, 429, 503):
        result.score = max(0, result.score - 40)
        result.add(CRITICAL, _("Server blocks AI bot at network level"),
                   _("Response for GPTBot user agent: HTTP {bot}, for browser: HTTP {browser}").format(bot=bot_view.status, browser=home.status),
                   _("Check firewall, CDN or bot protection (e.g. Cloudflare 'Block AI bots') and allow search crawlers."))
    elif home.ok and bot_view.ok and len(bot_view.text) < len(home.text) * 0.3:
        result.score = max(0, result.score - 15)
        result.add(WARNING, _("AI bot receives far less content than a browser"),
                   _("{bot} characters for the bot versus {browser} for the browser").format(bot=len(bot_view.text), browser=len(home.text)),
                   _("Check whether bot protection or cloaking trims the content."))
    return result
