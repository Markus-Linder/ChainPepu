from chainpepu.alerts import DrawdownWatcher, diff_positions, realized_from_deals


def test_diff_positions_detects_open_and_close():
    prev = {"1": {"id": 1, "symbol": "EURUSD"}}
    current = [{"id": 2, "symbol": "GBPUSD"}]
    diff, new_map = diff_positions(prev, current)
    assert [p["id"] for p in diff.opened] == [2]
    assert [p["id"] for p in diff.closed] == [1]
    assert set(new_map) == {"2"}


def test_drawdown_watcher_fires_once_and_resets():
    w = DrawdownWatcher(5.0)
    assert w.check({"balance": 1000, "equity": 990}) is None
    assert w.check({"balance": 1000, "equity": 940}) == 6.0
    assert w.check({"balance": 1000, "equity": 930}) is None  # noch aktiv, kein zweiter Alarm
    assert w.check({"balance": 1000, "equity": 990}) is None  # zurückgesetzt
    assert w.check({"balance": 1000, "equity": 940}) == 6.0


def test_drawdown_watcher_disabled():
    assert DrawdownWatcher(0).check({"balance": 1000, "equity": 0}) is None


def test_realized_from_deals():
    assert realized_from_deals([{"entryType": "DEAL_ENTRY_IN", "profit": 0}]) is None
    deals = [{"entryType": "DEAL_ENTRY_OUT", "profit": 10.0, "swap": -0.5, "commission": -1.0}]
    assert realized_from_deals(deals) == 8.5
