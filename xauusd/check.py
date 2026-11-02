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
try:
    d = get("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1h&range=2d")["chart"]["result"][0]
    fut = float(d["meta"]["regularMarketPrice"])
    q = d["indicators"]["quote"][0]
    for t, o, h, l, c in zip(d["timestamp"], q["open"], q["high"], q["low"], q["close"]):
        if None not in (o, h, l, c):
            candles.append({"t": t, "o": o, "h": h, "l": l, "c": c})
except Exception as e:
    out["errors"].append(f"yahoo: {e}")

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

upd = dt.date.fromisoformat(zones["updated_at"])
out["review_due"] = (now.date() - upd).days >= REVIEW_DAYS
out["status"] = "SIGNAL" if out["signals"] else "kein Signal"

if out["signals"]:   # state nur bei Signal schreiben, damit nicht jede Stunde ein Commit noetig ist
    state["last_run"] = now.isoformat()
    state["last_price"] = round(price, 2)
    json.dump(state, open(state_path, "w"), indent=1, ensure_ascii=False)
print(json.dumps(out, ensure_ascii=False, indent=1))
