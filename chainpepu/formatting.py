"""Reine Formatierungsfunktionen für Telegram-Nachrichten (HTML-Parse-Mode)."""
from __future__ import annotations

from html import escape
from typing import Iterable


def money(value: float | None, currency: str = "") -> str:
    if value is None:
        return "–"
    sign = "-" if value < 0 else ""
    text = f"{sign}{abs(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{text} {currency}".strip()


def signed(value: float | None, currency: str = "") -> str:
    if value is None:
        return "–"
    prefix = "+" if value > 0 else ""
    return prefix + money(value, currency)


def pnl_emoji(value: float) -> str:
    if value > 0:
        return "🟢"
    if value < 0:
        return "🔴"
    return "⚪️"


def direction(position_type: str) -> str:
    return "BUY" if "BUY" in position_type.upper() else "SELL"


def format_status(info: dict, open_positions: Iterable[dict]) -> str:
    cur = info.get("currency", "")
    positions = list(open_positions)
    floating = sum(p.get("profit", 0.0) for p in positions)
    balance = info.get("balance", 0.0)
    equity = info.get("equity", 0.0)
    drawdown = (balance - equity) / balance * 100 if balance else 0.0
    lines = [
        f"<b>📊 Konto {escape(str(info.get('login', '')))}</b> · {escape(info.get('broker', ''))}",
        f"Balance: <b>{money(balance, cur)}</b>",
        f"Equity: <b>{money(equity, cur)}</b>",
        f"Schwebend: {pnl_emoji(floating)} {signed(floating, cur)}",
        f"Freie Margin: {money(info.get('freeMargin'), cur)}",
        f"Offene Positionen: {len(positions)}",
    ]
    if drawdown > 0:
        lines.append(f"Drawdown: {drawdown:.2f} %")
    if info.get("investorMode"):
        lines.append("🔒 Investor-Modus (nur lesen)")
    return "\n".join(lines)


def format_position(p: dict, cur: str = "") -> str:
    profit = p.get("profit", 0.0)
    sl = money(p.get("stopLoss")) if p.get("stopLoss") else "–"
    tp = money(p.get("takeProfit")) if p.get("takeProfit") else "–"
    return (
        f"{pnl_emoji(profit)} <b>{escape(p.get('symbol', '?'))}</b> {direction(p.get('type', ''))} "
        f"{p.get('volume', 0):g} Lot @ {p.get('openPrice', 0):g}\n"
        f"   P/L {signed(profit, cur)} · SL {sl} · TP {tp}"
    )


def format_positions(positions: Iterable[dict], cur: str = "") -> str:
    positions = list(positions)
    if not positions:
        return "Keine offenen Positionen."
    total = sum(p.get("profit", 0.0) for p in positions)
    body = "\n".join(format_position(p, cur) for p in positions)
    return f"<b>📂 Offene Positionen ({len(positions)})</b>\n{body}\n\nSumme: {signed(total, cur)}"


def format_orders(orders: Iterable[dict]) -> str:
    orders = list(orders)
    if not orders:
        return "Keine offenen Pending-Orders."
    lines = [f"<b>⏳ Pending-Orders ({len(orders)})</b>"]
    for o in orders:
        lines.append(
            f"• {escape(o.get('symbol', '?'))} {escape(o.get('type', '').replace('ORDER_TYPE_', ''))} "
            f"{o.get('volume', 0):g} Lot @ {o.get('openPrice', 0):g}"
        )
    return "\n".join(lines)


def summarize_deals(deals: Iterable[dict]) -> dict:
    """Fasst Abschluss-Deals (DEAL_ENTRY_OUT / OUT_BY) zu Kennzahlen zusammen."""
    closed = [
        d
        for d in deals
        if d.get("entryType") in ("DEAL_ENTRY_OUT", "DEAL_ENTRY_OUT_BY", "DEAL_ENTRY_INOUT")
        and d.get("type") in ("DEAL_TYPE_BUY", "DEAL_TYPE_SELL")
    ]
    net = sum(
        (d.get("profit", 0.0) or 0.0) + (d.get("swap", 0.0) or 0.0) + (d.get("commission", 0.0) or 0.0)
        for d in closed
    )
    wins = [d for d in closed if (d.get("profit", 0.0) or 0.0) > 0]
    losses = [d for d in closed if (d.get("profit", 0.0) or 0.0) < 0]
    best = max((d.get("profit", 0.0) or 0.0 for d in closed), default=0.0)
    worst = min((d.get("profit", 0.0) or 0.0 for d in closed), default=0.0)
    balance_ops = sum(
        d.get("profit", 0.0) or 0.0
        for d in deals
        if d.get("type") in ("DEAL_TYPE_BALANCE", "DEAL_TYPE_CREDIT")
    )
    return {
        "trades": len(closed),
        "wins": len(wins),
        "losses": len(losses),
        "net": net,
        "best": best,
        "worst": worst,
        "win_rate": (len(wins) / len(closed) * 100) if closed else 0.0,
        "balance_ops": balance_ops,
    }


def format_report(title: str, stats: dict, info: dict) -> str:
    cur = info.get("currency", "")
    lines = [
        f"<b>{escape(title)}</b>",
        f"Ergebnis: {pnl_emoji(stats['net'])} <b>{signed(stats['net'], cur)}</b>",
        f"Trades: {stats['trades']} · Gewinner {stats['wins']} · Verlierer {stats['losses']}",
    ]
    if stats["trades"]:
        lines.append(f"Trefferquote: {stats['win_rate']:.0f} %")
        lines.append(f"Bester Trade: {signed(stats['best'], cur)} · Schlechtester: {signed(stats['worst'], cur)}")
    if stats["balance_ops"]:
        lines.append(f"Ein-/Auszahlungen: {signed(stats['balance_ops'], cur)}")
    lines.append(f"Balance jetzt: {money(info.get('balance'), cur)} · Equity: {money(info.get('equity'), cur)}")
    return "\n".join(lines)


def format_opened(p: dict, cur: str = "") -> str:
    return (
        f"🆕 <b>Position eröffnet</b>\n"
        f"{escape(p.get('symbol', '?'))} {direction(p.get('type', ''))} {p.get('volume', 0):g} Lot "
        f"@ {p.get('openPrice', 0):g}\n"
        f"SL {money(p.get('stopLoss')) if p.get('stopLoss') else '–'} · "
        f"TP {money(p.get('takeProfit')) if p.get('takeProfit') else '–'}"
    )


def format_closed(p: dict, realized: float | None, cur: str = "") -> str:
    value = realized if realized is not None else p.get("profit", 0.0)
    return (
        f"✅ <b>Position geschlossen</b>\n"
        f"{escape(p.get('symbol', '?'))} {direction(p.get('type', ''))} {p.get('volume', 0):g} Lot\n"
        f"Ergebnis: {pnl_emoji(value)} <b>{signed(value, cur)}</b>"
    )


def format_drawdown(drawdown_pct: float, info: dict) -> str:
    cur = info.get("currency", "")
    return (
        f"⚠️ <b>Drawdown-Alarm: {drawdown_pct:.2f} %</b>\n"
        f"Balance {money(info.get('balance'), cur)} · Equity {money(info.get('equity'), cur)}"
    )
