from chainpepu import formatting as fmt


def test_money_german_format():
    assert fmt.money(1234.5, "EUR") == "1.234,50 EUR"
    assert fmt.money(-0.5) == "-0,50"
    assert fmt.signed(12.0, "USD") == "+12,00 USD"
    assert fmt.signed(None) == "–"


def test_summarize_deals_counts_only_closing_deals():
    deals = [
        {"type": "DEAL_TYPE_BUY", "entryType": "DEAL_ENTRY_IN", "profit": 0.0},
        {"type": "DEAL_TYPE_SELL", "entryType": "DEAL_ENTRY_OUT", "profit": 30.0, "swap": -1.0, "commission": -2.0},
        {"type": "DEAL_TYPE_BUY", "entryType": "DEAL_ENTRY_OUT", "profit": -10.0, "swap": 0.0, "commission": 0.0},
        {"type": "DEAL_TYPE_BALANCE", "entryType": "DEAL_ENTRY_IN", "profit": 500.0},
    ]
    stats = fmt.summarize_deals(deals)
    assert stats["trades"] == 2
    assert stats["wins"] == 1 and stats["losses"] == 1
    assert stats["net"] == 17.0
    assert stats["win_rate"] == 50.0
    assert stats["balance_ops"] == 500.0


def test_format_status_mentions_drawdown_and_investor_mode():
    info = {"login": 123, "broker": "Demo", "currency": "EUR", "balance": 1000.0, "equity": 950.0,
            "freeMargin": 900.0, "investorMode": True}
    text = fmt.format_status(info, [{"profit": -50.0}])
    assert "Drawdown: 5.00 %" in text
    assert "Investor-Modus" in text
    assert "Offene Positionen: 1" in text


def test_format_positions_empty():
    assert fmt.format_positions([]) == "Keine offenen Positionen."
