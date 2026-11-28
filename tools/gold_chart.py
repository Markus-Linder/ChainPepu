#!/usr/bin/env python3
"""Draw an XAUUSD (GC=F) H1 chart with support/resistance zones, bias arrow and TP/SL.

Usage:
  python3 tools/gold_chart.py --plan plan.json --out docs/chart.png

plan.json:
{
  "bias": "long" | "short" | "neutral",
  "entry": [3640, 3645],            # optional zone
  "tp": [3660, 3691],               # one or more take-profit prices
  "sl": 3632,                       # optional stop
  "resistance": [[3683, 3691], [3720, 3760]],   # zones [low, high] or single prices
  "support": [[3635, 3640], [3550, 3590]],
  "title": "optional subtitle"
}
"""
import argparse, json, datetime as dt, urllib.request

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

BG, FG, MUTED, GRID = "#0f1218", "#e8eaee", "#8e97a7", "#232935"
WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
YLO = YHI = 0
UP, DOWN, GOLD = "#46d18f", "#ff7b70", "#e8b94c"


def fetch(range_="5d", interval="1h"):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?range={range_}&interval={interval}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    r = json.load(urllib.request.urlopen(req, timeout=20))["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    rows = []
    for t, o, h, l, c in zip(r["timestamp"], q["open"], q["high"], q["low"], q["close"]):
        if None not in (o, h, l, c):
            rows.append((dt.datetime.fromtimestamp(t, dt.timezone.utc), o, h, l, c))
    return rows


def zone(z):
    if isinstance(z, (int, float)):
        return float(z) - 2, float(z) + 2
    a, b = float(z[0]), float(z[1])
    return min(a, b), max(a, b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--bars", type=int, default=60)
    a = ap.parse_args()
    plan = json.load(open(a.plan, encoding="utf8"))
    rows = fetch()[-a.bars:]
    n = len(rows)
    last = rows[-1][4]

    lows = [r[3] for r in rows] + [last]
    highs = [r[2] for r in rows] + [last]
    tps = plan.get("tp") or []
    for v in list(tps) + ([plan["sl"]] if plan.get("sl") else []):
        lows.append(float(v)); highs.append(float(v))
    pad = (max(highs) - min(lows)) * 0.08
    global YLO, YHI
    YLO, YHI = min(lows) - pad, max(highs) + pad

    fig, ax = plt.subplots(figsize=(10, 6.2), dpi=120)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    xmax = n + 20  # room on the right for projection and labels

    # zones
    for key, col in (("resistance", DOWN), ("support", UP)):
        for z in plan.get(key, []):
            lo, hi = zone(z)
            ax.add_patch(Rectangle((-1, lo), xmax + 1, hi - lo, color=col, alpha=0.13, lw=0))
            ax.axhline(lo, color=col, alpha=0.35, lw=0.8)
            ax.axhline(hi, color=col, alpha=0.35, lw=0.8)
            lbl = f"{lo:,.0f}" if hi - lo <= 4 else f"{lo:,.0f}–{hi:,.0f}"
            if hi < YLO or lo > YHI:
                continue
            ax.text(xmax - 0.3, (lo + hi) / 2, lbl.replace(",", "."), color=col, fontsize=8.5,
                    ha="right", va="center", fontweight="bold")

    # candles
    for i, (_, o, h, l, c) in enumerate(rows):
        col = UP if c >= o else DOWN
        ax.vlines(i, l, h, color=col, lw=1)
        ax.add_patch(Rectangle((i - 0.32, min(o, c)), 0.64, max(abs(c - o), 0.15), color=col, lw=0))

    # last price
    ax.axhline(last, color=FG, lw=0.8, ls=":")
    ax.text(n + 0.5, last, f" {last:,.1f}".replace(",", "."), color=BG, fontsize=9, va="center",
            bbox=dict(boxstyle="round,pad=0.25", fc=FG, ec="none"))

    # entry / tp / sl
    if plan.get("entry"):
        lo, hi = zone(plan["entry"])
        ax.add_patch(Rectangle((n - 0.5, lo), 13, hi - lo, color=GOLD, alpha=0.25, lw=0))
        ax.text(n + 5, (lo + hi) / 2, "Einstieg", color=GOLD, fontsize=8.5, va="center")
    for i, tp in enumerate(plan.get("tp", []) or []):
        ax.hlines(tp, n - 0.5, xmax, color=GOLD, lw=1.6)
        ax.text(n + 5, tp, f"TP{i + 1} {tp:,.1f}".replace(",", "."), color=GOLD, fontsize=9,
                va="bottom", fontweight="bold")
    if plan.get("sl"):
        sl = float(plan["sl"])
        ax.hlines(sl, n - 0.5, xmax, color=DOWN, lw=1.6, ls="--")
        ax.text(n + 5, sl, f"SL {sl:,.1f}".replace(",", "."), color=DOWN, fontsize=9, va="top", fontweight="bold")

    # bias arrow
    bias = (plan.get("bias") or "neutral").lower()
    tps = plan.get("tp") or []
    if bias in ("long", "short"):
        target = float(tps[-1]) if tps else last + (15 if bias == "long" else -15)
        col = UP if bias == "long" else DOWN
        ax.annotate("", xy=(n + 4, target), xytext=(n - 0.5, last),
                    arrowprops=dict(arrowstyle="-|>", color=col, lw=2.4, mutation_scale=18))

    # axes
    ax.set_ylim(YLO, YHI)
    ax.set_xlim(-1, xmax)
    step = max(1, n // 6)
    ticks = list(range(0, n, step))
    ax.set_xticks(ticks)
    ax.set_xticklabels([WD[rows[i][0].astimezone(dt.timezone(dt.timedelta(hours=1))).weekday()] + rows[i][0].astimezone(dt.timezone(dt.timedelta(hours=1))).strftime(" %H:%M") for i in ticks],
                       color=MUTED, fontsize=8)
    ax.tick_params(axis="y", colors=MUTED, labelsize=8)
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}".replace(",", ".")))
    ax.grid(color=GRID, lw=0.6)
    for s in ax.spines.values():
        s.set_visible(False)
    bias_txt = {"long": "LONG", "short": "SHORT"}.get(bias, "ABWARTEN")
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=1))).strftime("%d.%m. %H:%M")
    fig.text(0.015, 0.965, f"XAUUSD · H1 · Bias {bias_txt} · {now} MEZ", color=FG, fontsize=13, fontweight="bold")
    if plan.get("title"):
        fig.text(0.015, 0.93, plan["title"], color=MUTED, fontsize=10)
    fig.tight_layout(rect=(0, 0, 1, 0.91))
    fig.savefig(a.out, facecolor=BG)
    print(a.out)


if __name__ == "__main__":
    main()
