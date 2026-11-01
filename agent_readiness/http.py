"""Kleiner HTTP-Client mit Zeitlimits, Größenbegrenzung und Ergebnis-Cache."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import httpx

USER_AGENT = "AgentReadinessAudit/0.1 (+https://github.com/markus-linder/chainpepu)"
MAX_BYTES = 2_000_000


@dataclass
class Fetched:
    url: str
    final_url: str
    status: int
    headers: dict[str, str]
    text: str
    error: str = ""

    @property
    def ok(self) -> bool:
        return not self.error and 200 <= self.status < 300


class Fetcher:
    """Lädt Seiten einer Domain und merkt sich Ergebnisse, damit jede URL nur einmal geholt wird."""

    def __init__(self, base_url: str, timeout: float = 15.0, user_agent: str = USER_AGENT):
        self.base_url = base_url
        self._cache: dict[str, Fetched] = {}
        self._client = httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": user_agent, "Accept-Language": "de,en;q=0.8"},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "Fetcher":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def absolute(self, path: str) -> str:
        return urljoin(self.base_url, path)

    def get(self, path_or_url: str, user_agent: str | None = None) -> Fetched:
        url = self.absolute(path_or_url)
        cache_key = f"{user_agent or ''}|{url}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        headers = {"User-Agent": user_agent} if user_agent else None
        try:
            with self._client.stream("GET", url, headers=headers) as resp:
                chunks: list[bytes] = []
                size = 0
                for chunk in resp.iter_bytes():
                    chunks.append(chunk)
                    size += len(chunk)
                    if size > MAX_BYTES:
                        break
                raw = b"".join(chunks)
                encoding = resp.encoding or "utf-8"
                try:
                    text = raw.decode(encoding, errors="replace")
                except LookupError:
                    text = raw.decode("utf-8", errors="replace")
                result = Fetched(
                    url=url,
                    final_url=str(resp.url),
                    status=resp.status_code,
                    headers={k.lower(): v for k, v in resp.headers.items()},
                    text=text,
                )
        except httpx.HTTPError as exc:
            result = Fetched(url=url, final_url=url, status=0, headers={}, text="", error=f"{type(exc).__name__}: {exc}")
        self._cache[cache_key] = result
        return result


def normalize_url(raw: str) -> str:
    """Ergänzt das Schema und entfernt Pfad-Reste, sodass nur die Startseite übrig bleibt."""
    raw = raw.strip()
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    parsed = urlparse(raw)
    return f"{parsed.scheme}://{parsed.netloc}/"


def domain_of(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host
