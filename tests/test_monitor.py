import pytest

from chainpepu.bot import Monitor
from chainpepu.config import Settings


class FakeMT5:
    def __init__(self):
        self.info = {"currency": "EUR", "balance": 1000.0, "equity": 1000.0, "login": 1, "broker": "Demo"}
        self.open = []
        self.position_deals = {}

    async def account_info(self):
        return self.info

    async def positions(self):
        return self.open

    async def deals_for_position(self, pid):
        return self.position_deals.get(pid, [])

    async def deals(self, start, end):
        return []


class FakeBot:
    def __init__(self):
        self.sent = []

    async def send_message(self, chat_id, text, parse_mode=None):
        self.sent.append((chat_id, text))


class FakeApp:
    def __init__(self):
        self.bot = FakeBot()


@pytest.fixture
def monitor():
    settings = Settings(
        metaapi_token="t", metaapi_account_id="a", metaapi_region=None, telegram_bot_token="b",
        allowed_chat_ids={42}, drawdown_alert_percent=5.0, daily_report_hour=23, timezone="Europe/Berlin",
    )
    mt5 = FakeMT5()
    app = FakeApp()
    return Monitor(settings, mt5, app), mt5, app


async def test_first_poll_is_silent_then_alerts_on_open_and_close(monitor):
    mon, mt5, app = monitor
    mt5.open = [{"id": 1, "symbol": "EURUSD", "type": "POSITION_TYPE_BUY", "volume": 0.1, "openPrice": 1.1, "profit": 0}]
    await mon._poll_once()
    assert app.bot.sent == []  # erster Lauf nur Zustand aufnehmen

    mt5.open.append({"id": 2, "symbol": "XAUUSD", "type": "POSITION_TYPE_SELL", "volume": 0.5, "openPrice": 2400, "profit": 0})
    await mon._poll_once()
    assert len(app.bot.sent) == 1 and "eröffnet" in app.bot.sent[0][1] and "XAUUSD" in app.bot.sent[0][1]

    mt5.open = [mt5.open[1]]
    mt5.position_deals["1"] = [{"entryType": "DEAL_ENTRY_OUT", "profit": 12.0, "swap": 0, "commission": -1}]
    await mon._poll_once()
    assert "geschlossen" in app.bot.sent[-1][1] and "+11,00 EUR" in app.bot.sent[-1][1]


async def test_drawdown_alert_broadcast(monitor):
    mon, mt5, app = monitor
    await mon._poll_once()
    mt5.info["equity"] = 900.0
    await mon._poll_once()
    assert any("Drawdown-Alarm: 10.00 %" in t for _, t in app.bot.sent)
