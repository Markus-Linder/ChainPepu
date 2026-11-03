#!/usr/bin/env python3
"""Prueft XAU/USD gegen die Zonen in zones.json, dedupliziert ueber state.json und gibt ein JSON-Ergebnis aus."""
import json, os, sys, urllib.request, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
BAND = 0.0025          # 0,25 % Naeherung zaehlt als Test
REALERT_HOURS = 12     # gleiche Zone fruehestens nach 12 h erneut melden
REVIEW_DAYS = 7        # Zonen aelter als 7 Tage -> Neubewertung faellig

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

now = dt.datetime.now(dt.timezone.utc)
out = {"time_utc": now.isoformat(timespec="seconds"), "errors": [], "signals": []}

spot = fut = None
candles = []
try:
    spot = float(get("https://api.gold-api.com/price/XAU")["price"])
except Exception as e:
    out["errors"].append(f"gold-api: {e}")
def yahoo(interval, rng):
    d = get(f"https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval={interval}&range={rng}")["chart"]["result"][0]
    q = d["indicators"]["quote"][0]
    cs = [{"t": t, "o": o, "h": h, "l": l, "c": c}
          for t, o, h, l, c in zip(d["timestamp"], q["open"], q["high"], q["low"], q["close"]) if None not in (o, h, l, c)]
    return float(d["meta"]["regularMarketPrice"]), cs

c15 = []
try:
    fut, candles = yahoo("1h", "1mo")
except Exception as e:
    out["errors"].append(f"yahoo 1h: {e}")
try:
    _, c15 = yahoo("15m", "5d")
except Exception as e:
    out["errors"].append(f"yahoo 15m: {e}")

price = spot if spot else fut
if price is None:
    out["status"] = "keine Kursdaten"
    print(json.dumps(out, ensure_ascii=False, indent=1)); sys.exit(0)

basis = (spot - fut) if (spot and fut) else 0.0   # Spot minus Future, um Kerzen auf Spot umzurechnen
out.update({"spot": spot, "future_gc": fut, "basis": round(basis, 2), "price": round(price, 2)})

# Marktzeiten: Gold handelt So 23:00 UTC bis Fr 22:00 UTC
wd, hr = now.weekday(), now.hour
market_open = not (wd == 5 or (wd == 6 and hr < 23) or (wd == 4 and hr >= 22))
out["market_open"] = market_open

last = candles[-1] if candles else None
prev = candles[-2] if len(candles) > 1 else None
if last:
    hi, lo, close = last["h"] + basis, last["l"] + basis, last["c"] + basis
    hi, lo = max(hi, price), min(lo, price)
    out["last_hour"] = {"high": round(hi, 2), "low": round(lo, 2), "close": round(close, 2)}
else:
    hi = lo = close = price

zones = json.load(open(os.path.join(HERE, "zones.json")))
state_path = os.path.join(HERE, "state.json")
state = json.load(open(state_path)) if os.path.exists(state_path) else {"alerts": {}}
alerts = state.setdefault("alerts", {})

def fresh(key):
    t = alerts.get(key)
    if not t: return True
    return (now - dt.datetime.fromisoformat(t)) > dt.timedelta(hours=REALERT_HOURS)

for z in zones["zones"]:
    zl, zh = z["low"] * (1 - BAND), z["high"] * (1 + BAND)
    touched = lo <= zh and hi >= zl
    key_test, key_break = z["name"] + "|test", z["name"] + "|break"
    if touched and fresh(key_test):
        side = "von unten (Widerstand)" if price <= (z["low"] + z["high"]) / 2 else "von oben (Unterstuetzung)"
        out["signals"].append({"type": "Test", "zone": z["name"], "side": side,
                               "distance_pct": round((price - (z["low"] + z["high"]) / 2) / price * 100, 2)})
        alerts[key_test] = now.isoformat()
    if prev and last:
        pc = prev["c"] + basis
        broke_up = pc <= z["high"] and close > z["high"] * (1 + BAND)
        broke_down = pc >= z["low"] and close < z["low"] * (1 - BAND)
        if (broke_up or broke_down) and fresh(key_break):
            out["signals"].append({"type": "Bruch", "zone": z["name"],
                                   "direction": "nach oben" if broke_up else "nach unten",
                                   "close": round(close, 2)})
            alerts[key_break] = now.isoformat()

# nahe Zonen zur Information (ohne Signal)
near = []
for z in zones["zones"]:
    mid = (z["low"] + z["high"]) / 2
    d = (mid - price) / price * 100
    if abs(d) <= 1.5: near.append({"zone": z["name"], "distance_pct": round(d, 2)})
out["near_zones"] = near

# ---------- Kurzfrist-Einschaetzung (regelbasiert) ----------
def ema(vals, n):
    k = 2 / (n + 1); e = vals[0]; res = []
    for v in vals:
        e = v * k + e * (1 - k); res.append(e)
    return res

def rsi(vals, n=14):
    if len(vals) < n + 1: return None
    gains = [max(vals[i] - vals[i-1], 0) for i in range(1, len(vals))]
    losses = [max(vals[i-1] - vals[i], 0) for i in range(1, len(vals))]
    ag, al = sum(gains[:n]) / n, sum(losses[:n]) / n
    for g, l in zip(gains[n:], losses[n:]):
        ag, al = (ag * (n - 1) + g) / n, (al * (n - 1) + l) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)

def atr(cs, n=14):
    if len(cs) < n + 1: return None
    trs = [max(c["h"] - c["l"], abs(c["h"] - cs[i-1]["c"]), abs(c["l"] - cs[i-1]["c"])) for i, c in enumerate(cs) if i > 0]
    a = sum(trs[:n]) / n
    for t in trs[n:]: a = (a * (n - 1) + t) / n
    return a

assess = {}
if len(candles) >= 60 and len(c15) >= 60:
    cl1 = [c["c"] + basis for c in candles]
    cl15 = [c["c"] + basis for c in c15]
    e20_1, e50_1 = ema(cl1, 20)[-1], ema(cl1, 50)[-1]
    e20_15, e50_15 = ema(cl15, 20)[-1], ema(cl15, 50)[-1]
    r15, r1 = rsi(cl15), rsi(cl1)
    a15 = atr(c15)
    day_cs = [c for c in c15 if c["t"] >= now.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()]
    day_hi = max(c["h"] for c in day_cs) + basis if day_cs else None
    day_lo = min(c["l"] for c in day_cs) + basis if day_cs else None
    chg_1h = (price - cl1[-2]) / cl1[-2] * 100 if len(cl1) > 1 else 0
    chg_4h = (price - cl1[-5]) / cl1[-5] * 100 if len(cl1) > 4 else 0

    score, why = 0.0, []
    if price > e20_1 > e50_1: score += 1; why.append("1h-Trend aufwaerts (Kurs > EMA20 > EMA50)")
    elif price < e20_1 < e50_1: score -= 1; why.append("1h-Trend abwaerts (Kurs < EMA20 < EMA50)")
    else: why.append("1h-Trend uneinheitlich (EMAs verschraenkt)")
    if price > e20_15 > e50_15: score += 1; why.append("15m-Momentum positiv")
    elif price < e20_15 < e50_15: score -= 1; why.append("15m-Momentum negativ")
    else: why.append("15m-Momentum neutral")
    if r15 is not None:
        if r15 >= 70: score -= 0.5; why.append(f"RSI15 ueberkauft ({r15:.0f})")
        elif r15 <= 30: score += 0.5; why.append(f"RSI15 ueberverkauft ({r15:.0f})")
        elif r15 > 55: score += 0.25
        elif r15 < 45: score -= 0.25
    res_above = sorted([z for z in zones["zones"] if z["low"] > price], key=lambda z: z["low"])
    sup_below = sorted([z for z in zones["zones"] if z["high"] < price], key=lambda z: -z["high"])
    nr = res_above[0] if res_above else None
    ns = sup_below[0] if sup_below else None
    if nr and (nr["low"] - price) / price < 0.003: score -= 0.5; why.append(f"direkt unter Widerstand {nr['name']}")
    if ns and (price - ns["high"]) / price < 0.003: score += 0.5; why.append(f"direkt ueber Unterstuetzung {ns['name']}")

    if score >= 1.5: bias = "LONG"
    elif score <= -1.5: bias = "SHORT"
    else: bias = "NEUTRAL / abwarten"
    stop_dist = max(1.5 * a15, price * 0.003) if a15 else price * 0.004
    plan = {}
    if bias == "LONG" and nr:
        stop = min(price - stop_dist, ns["low"] - 0.1 * stop_dist) if ns else price - stop_dist
        plan = {"einstieg": round(price, 1), "stop": round(stop, 1), "ziel": round(nr["low"], 1),
                "crv": round((nr["low"] - price) / max(price - stop, 1e-9), 2)}
    elif bias == "SHORT" and ns:
        stop = max(price + stop_dist, nr["high"] + 0.1 * stop_dist) if nr else price + stop_dist
        plan = {"einstieg": round(price, 1), "stop": round(stop, 1), "ziel": round(ns["high"], 1),
                "crv": round((price - ns["high"]) / max(stop - price, 1e-9), 2)}
    if plan and plan["crv"] < 1.0:
        why.append(f"CRV nur {plan['crv']} -> kein Einstieg, auf Ruecklauf oder Zonenbruch warten")
        bias = "NEUTRAL / abwarten"; plan = {}
    sys.path.insert(0, HERE); import orders as od
    nr2, ns2 = (res_above[1] if len(res_above) > 1 else None), (sup_below[1] if len(sup_below) > 1 else None)
    if bias in ("LONG", "SHORT"): ords = od.for_bias(bias, price, a15 or price * 0.002, e20_15, nr, ns)
    else: ords = od.bracket(price, a15 or price * 0.002, nr, ns, nr2, ns2)
    assess = {
        "richtung": bias, "score": round(score, 2), "begruendung": why, "plan": plan,
        "orders": ords, "orders_text": od.fmt(ords), "orders_kurz": od.fmt_short(ords),
        "indikatoren": {"ema20_1h": round(e20_1, 1), "ema50_1h": round(e50_1, 1), "ema20_15m": round(e20_15, 1),
                        "ema50_15m": round(e50_15, 1), "rsi14_15m": round(r15, 1) if r15 else None,
                        "rsi14_1h": round(r1, 1) if r1 else None, "atr14_15m": round(a15, 1) if a15 else None,
                        "tageshoch": round(day_hi, 1) if day_hi else None, "tagestief": round(day_lo, 1) if day_lo else None,
                        "aenderung_1h_pct": round(chg_1h, 2), "aenderung_4h_pct": round(chg_4h, 2)},
        "naechster_widerstand": nr["name"] if nr else None, "naechste_unterstuetzung": ns["name"] if ns else None,
        "in_zone": [z["name"] for z in zones["zones"] if z["low"] * (1 - BAND) <= price <= z["high"] * (1 + BAND)],
    }
out["einschaetzung"] = assess
if "--chart" in sys.argv and assess and c15:
    try:
        sys.path.insert(0, HERE); import chart as ch
        win = [{k: (v + basis if k in "ohlc" else v) for k, v in c.items()} for c in c15[-160:]]
        pl = assess.get("plan") or {}
        bias = assess["richtung"].split()[0]
        cl = [c["c"] for c in win]
        outp = os.path.join(HERE, "charts", "hourly.png")
        ch.render(win, zones["zones"], outp, f"XAU/USD 15m – Stunden-Einschaetzung: {assess['richtung']}",
                  now.astimezone(ch.BERLIN).strftime("%d.%m.%Y %H:%M") + " · " + "; ".join(assess["begruendung"])[:120],
                  orders=assess.get("orders"), price=price, interval_min=15,
                  direction=bias if bias in ("LONG", "SHORT") else "NEUTRAL",
                  emas={"EMA20": (ema(cl, 20), (30, 90, 200, 255)), "EMA50": (ema(cl, 50), (230, 140, 20, 255))})
        out["chart"] = outp
    except Exception as e:
        import traceback
        out["errors"].append(f"chart: {type(e).__name__}: {e} @ {traceback.format_exc().strip().splitlines()[-3]}")

upd = dt.date.fromisoformat(zones["updated_at"])
out["review_due"] = (now.date() - upd).days >= REVIEW_DAYS
out["status"] = "SIGNAL" if out["signals"] else "kein Signal"

if out["signals"]:   # state nur bei Signal schreiben, damit nicht jede Stunde ein Commit noetig ist
    state["last_run"] = now.isoformat()
    state["last_price"] = round(price, 2)
    json.dump(state, open(state_path, "w"), indent=1, ensure_ascii=False)
print(json.dumps(out, ensure_ascii=False, indent=1))
