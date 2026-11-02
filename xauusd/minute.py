#!/usr/bin/env python3
"""Minuten-Waechter fuer XAU/USD: wertet jede Minute den 1-Minuten-Chart aus und schreibt Signale nach stdout und minute.log.
Signale: ZONE_TEST, ZONE_BREAK (Zonen aus zones.json), EMA_CROSS (EMA9/21 auf 1m in Richtung des 5m-Trends),
RANGE_BREAK (Ausbruch aus der Spanne der letzten 60 Minuten), RSI_REV (RSI14 dreht aus Extremzone).
Aufruf: python3 minute.py [--once]"""
import json, os, sys, time, urllib.request, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
BERLIN = ZoneInfo("Europe/Berlin")
ONCE = "--once" in sys.argv
LOG = os.path.join(HERE, "minute.log")
STATE = os.path.join(HERE, "minute_state.json")
BAND = 0.0025
DEDUP_MIN = {"ZONE_TEST": 120, "ZONE_BREAK": 120, "EMA_CROSS": 30, "RANGE_BREAK": 45, "RSI_REV": 30, "ERROR": 30}

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

def ema(vals, n):
    k = 2 / (n + 1); e = vals[0]; res = []
    for v in vals:
        e = v * k + e * (1 - k); res.append(e)
    return res

def rsi(vals, n=14):
    if len(vals) < n + 1: return None
    g = [max(vals[i] - vals[i-1], 0) for i in range(1, len(vals))]
    l = [max(vals[i-1] - vals[i], 0) for i in range(1, len(vals))]
    ag, al = sum(g[:n]) / n, sum(l[:n]) / n
    for a, b in zip(g[n:], l[n:]):
        ag, al = (ag * (n - 1) + a) / n, (al * (n - 1) + b) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)

def atr(cs, n=14):
    if len(cs) < n + 1: return None
    trs = [max(c["h"] - c["l"], abs(c["h"] - cs[i-1]["c"]), abs(c["l"] - cs[i-1]["c"])) for i, c in enumerate(cs) if i > 0]
    a = sum(trs[:n]) / n
    for t in trs[n:]: a = (a * (n - 1) + t) / n
    return a

def emit(line):
    print(line, flush=True)
    with open(LOG, "a") as f: f.write(line + "\n")

def load_state():
    try: return json.load(open(STATE))
    except Exception: return {"alerts": {}}

def fresh(state, key, kind, now):
    t = state["alerts"].get(key)
    if not t: return True
    return (now - dt.datetime.fromisoformat(t)) > dt.timedelta(minutes=DEDUP_MIN[kind])

def market_open(now):
    wd, hr = now.weekday(), now.hour
    return not (wd == 5 or (wd == 6 and hr < 23) or (wd == 4 and hr >= 22))

def analyze(state, now):
    spot = None
    try: spot = float(get("https://api.gold-api.com/price/XAU")["price"])
    except Exception: pass
    d = get("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d")["chart"]["result"][0]
    fut = float(d["meta"]["regularMarketPrice"]); q = d["indicators"]["quote"][0]
    cs = [{"t": t, "o": o, "h": h, "l": l, "c": c} for t, o, h, l, c in
          zip(d["timestamp"], q["open"], q["high"], q["low"], q["close"]) if None not in (o, h, l, c)]
    if len(cs) < 80: return "zu wenig Kerzen"
    basis = (spot - fut) if spot else 0.0
    for c in cs:
        for k in "ohlc": c[k] += basis
    price = spot or cs[-1]["c"]
    closes = [c["c"] for c in cs]
    e9, e21 = ema(closes, 9), ema(closes, 21)
    r, r_prev = rsi(closes), rsi(closes[:-1])
    # 5-Minuten-Aggregation fuer Trendfilter und ATR
    buckets = {}
    for c in cs:
        b = c["t"] // 300
        if b not in buckets: buckets[b] = dict(c)
        else:
            x = buckets[b]; x["h"] = max(x["h"], c["h"]); x["l"] = min(x["l"], c["l"]); x["c"] = c["c"]
    c5 = [buckets[k] for k in sorted(buckets)]
    e20_5 = ema([c["c"] for c in c5], 20)[-1] if len(c5) >= 20 else price
    trend5 = 1 if price > e20_5 else -1
    a5 = atr(c5) or (atr(cs) or 3.0) * 2.2
    zones = json.load(open(os.path.join(HERE, "zones.json")))["zones"]
    res_above = sorted([z for z in zones if z["low"] > price], key=lambda z: z["low"])
    sup_below = sorted([z for z in zones if z["high"] < price], key=lambda z: -z["high"])
    nr, ns = (res_above[0] if res_above else None), (sup_below[0] if sup_below else None)
    last, prev = cs[-1], cs[-2]
    sig = []

    plans = {}
    def plan(direction):
        if direction == "LONG":
            stop = price - 1.5 * a5; tgt = nr["low"] if nr else price + 3 * a5
        else:
            stop = price + 1.5 * a5; tgt = ns["high"] if ns else price - 3 * a5
        crv = abs(tgt - price) / max(abs(price - stop), 1e-9)
        plans[direction] = {"entry": price, "stop": stop, "target": tgt}
        return f"{direction} Stopp {stop:.1f} Ziel {tgt:.1f} CRV {crv:.1f}"

    for z in zones:
        zl, zh = z["low"] * (1 - BAND), z["high"] * (1 + BAND)
        k = z["name"]
        if last["l"] <= zh and last["h"] >= zl and fresh(state, k + "|test", "ZONE_TEST", now):
            side = "von unten" if price <= (z["low"] + z["high"]) / 2 else "von oben"
            sig.append(("ZONE_TEST", k + "|test", f"Zone {k} {side} angelaufen"))
        if prev["c"] <= z["high"] and last["c"] > z["high"] * (1 + BAND) and fresh(state, k + "|break", "ZONE_BREAK", now):
            sig.append(("ZONE_BREAK", k + "|break", f"Zone {k} nach OBEN gebrochen (1m-Schluss {last['c']:.1f}). {plan('LONG')}"))
        if prev["c"] >= z["low"] and last["c"] < z["low"] * (1 - BAND) and fresh(state, k + "|break", "ZONE_BREAK", now):
            sig.append(("ZONE_BREAK", k + "|break", f"Zone {k} nach UNTEN gebrochen (1m-Schluss {last['c']:.1f}). {plan('SHORT')}"))
    if e9[-2] <= e21[-2] and e9[-1] > e21[-1] and trend5 > 0 and fresh(state, "ema|long", "EMA_CROSS", now):
        sig.append(("EMA_CROSS", "ema|long", f"EMA9 kreuzt EMA21 nach oben, 5m-Trend aufwaerts. {plan('LONG')}"))
    if e9[-2] >= e21[-2] and e9[-1] < e21[-1] and trend5 < 0 and fresh(state, "ema|short", "EMA_CROSS", now):
        sig.append(("EMA_CROSS", "ema|short", f"EMA9 kreuzt EMA21 nach unten, 5m-Trend abwaerts. {plan('SHORT')}"))
    win = cs[-64:-4]
    rh, rl = max(c["h"] for c in win), min(c["l"] for c in win)
    if last["c"] > rh and prev["c"] <= rh and fresh(state, "range|up", "RANGE_BREAK", now):
        sig.append(("RANGE_BREAK", "range|up", f"Ausbruch ueber 60-Minuten-Hoch {rh:.1f}. {plan('LONG')}"))
    if last["c"] < rl and prev["c"] >= rl and fresh(state, "range|down", "RANGE_BREAK", now):
        sig.append(("RANGE_BREAK", "range|down", f"Bruch unter 60-Minuten-Tief {rl:.1f}. {plan('SHORT')}"))
    if r is not None and r_prev is not None:
        if r_prev >= 75 and r < 75 and fresh(state, "rsi|down", "RSI_REV", now):
            sig.append(("RSI_REV", "rsi|down", f"RSI14 (1m) dreht aus ueberkauft ({r_prev:.0f} -> {r:.0f}), Rueckschlag moeglich. {plan('SHORT')}"))
        if r_prev <= 25 and r > 25 and fresh(state, "rsi|up", "RSI_REV", now):
            sig.append(("RSI_REV", "rsi|up", f"RSI14 (1m) dreht aus ueberverkauft ({r_prev:.0f} -> {r:.0f}), Erholung moeglich. {plan('LONG')}"))

    ts = now.astimezone(BERLIN).strftime("%H:%M")
    for kind, key, text in sig:
        state["alerts"][key] = now.isoformat()
        direction = "LONG" if "LONG" in text else "SHORT" if "SHORT" in text else None
        pl = plans.get(direction, {})
        chart = ""
        try:
            import chart as ch
            out = os.path.join(HERE, "charts", now.astimezone(BERLIN).strftime("%Y%m%d_%H%M") + f"_{kind}.png")
            win = cs[-180:]
            ch.render(win, zones, out, f"XAU/USD 1m – {kind}", f"{ts} Uhr: {text}"[:150],
                      entry=pl.get("entry"), stop=pl.get("stop"), target=pl.get("target"), price=price, direction=direction,
                      emas={"EMA9": (e9[-len(win):], (30, 90, 200, 255)), "EMA21": (e21[-len(win):], (230, 140, 20, 255))})
            import shutil; shutil.copy(out, os.path.join(HERE, "charts", "latest_signal.png"))
            chart = "|chart=" + out
        except Exception as e:
            print(f"chart-fehler: {e}", file=sys.stderr, flush=True)
        emit(f"SIGNAL|{ts}|{kind}|XAU/USD {price:.1f}: {text}{chart}")
    state["last"] = {"time": now.isoformat(), "price": round(price, 1), "rsi1m": round(r, 1) if r else None,
                     "ema9": round(e9[-1], 1), "ema21": round(e21[-1], 1), "trend5": trend5, "atr5": round(a5, 1),
                     "range60": [round(rl, 1), round(rh, 1)]}
    json.dump(state, open(STATE, "w"), indent=1)
    return f"ok {price:.1f} rsi={r:.0f} e9={e9[-1]:.1f} e21={e21[-1]:.1f} t5={trend5} sig={len(sig)}"

fails = 0
while True:
    now = dt.datetime.now(dt.timezone.utc)
    state = load_state()
    if market_open(now) or ONCE:
        try:
            msg = analyze(state, now); fails = 0
            print(f"HEARTBEAT {now.astimezone(BERLIN).strftime('%H:%M')} {msg}", file=sys.stderr, flush=True)
        except Exception as e:
            fails += 1
            print(f"fehler {fails}: {e}", file=sys.stderr, flush=True)
            if fails >= 5 and fresh(state, "error", "ERROR", now):
                state["alerts"]["error"] = now.isoformat(); json.dump(state, open(STATE, "w"), indent=1)
                emit(f"ERROR|{now.astimezone(BERLIN).strftime('%H:%M')}|Kursabruf seit {fails} Minuten fehlgeschlagen: {e}")
    if ONCE: break
    time.sleep(max(5, 65 - dt.datetime.now().second))
