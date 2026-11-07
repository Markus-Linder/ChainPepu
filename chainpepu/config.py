"""Konfiguration aus Umgebungsvariablen (.env wird automatisch geladen)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _parse_chat_ids(raw: str) -> set[int]:
    ids: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if part:
            ids.add(int(part))
    return ids


@dataclass(frozen=True)
class Settings:
    metaapi_token: str
    metaapi_account_id: str
    metaapi_region: str | None
    telegram_bot_token: str
    allowed_chat_ids: set[int] = field(default_factory=set)
    poll_interval_seconds: int = 20
    drawdown_alert_percent: float = 5.0
    daily_report_hour: int = 22
    timezone: str = "Europe/Berlin"

    @classmethod
    def from_env(cls) -> "Settings":
        missing = [
            name
            for name in ("METAAPI_TOKEN", "METAAPI_ACCOUNT_ID", "TELEGRAM_BOT_TOKEN")
            if not os.environ.get(name)
        ]
        if missing:
            raise SystemExit(
                "Fehlende Umgebungsvariablen: "
                + ", ".join(missing)
                + ". Siehe .env.example."
            )
        return cls(
            metaapi_token=os.environ["METAAPI_TOKEN"],
            metaapi_account_id=os.environ["METAAPI_ACCOUNT_ID"],
            metaapi_region=os.environ.get("METAAPI_REGION") or None,
            telegram_bot_token=os.environ["TELEGRAM_BOT_TOKEN"],
            allowed_chat_ids=_parse_chat_ids(os.environ.get("TELEGRAM_ALLOWED_CHAT_IDS", "")),
            poll_interval_seconds=int(os.environ.get("POLL_INTERVAL_SECONDS", "20")),
            drawdown_alert_percent=float(os.environ.get("DRAWDOWN_ALERT_PERCENT", "5")),
            daily_report_hour=int(os.environ.get("DAILY_REPORT_HOUR", "22")),
            timezone=os.environ.get("TZ", "Europe/Berlin"),
        )
