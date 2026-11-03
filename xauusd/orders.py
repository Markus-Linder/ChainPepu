#!/usr/bin/env python3
"""Order-Vorschlaege (Limit/Stop mit SL und TP) je Signaltyp. Alle Preise auf 0,1 gerundet."""

def _r(v): return round(v, 1)

def _o(typ, preis, sl, tp, note=""):
    crv = abs(tp - preis) / max(abs(preis - sl), 1e-9)
    return {"typ": typ, "preis": _r(preis), "sl": _r(sl), "tp": _r(tp), "crv": round(crv, 1), "note": note}

def fmt(orders):
    return " | ".join(f"{o['typ']} {o['preis']:.1f} SL {o['sl']:.1f} TP {o['tp']:.1f} (CRV {o['crv']})" for o in orders)

def fmt_short(orders):
    return " | ".join(f"{o['typ']} {o['preis']:.0f} SL {o['sl']:.0f} TP {o['tp']:.0f}" for o in orders)

def _tp_up(price, nr, atr): return nr["low"] if nr and nr["low"] > price + atr else price + 3 * atr
def _tp_dn(price, ns, atr): return ns["high"] if ns and ns["high"] < price - atr else price - 3 * atr

def for_zone_test(z, price, atr, nr, ns, nr2=None, ns2=None):
    """Kurs laeuft Zone an. Primaer: Abpraller-Limit an der Zonenkante. Alternativ: Ausbruchs-Stop hinter der Zone."""
    pad = max(0.3 * atr, 0.5)
    if price <= (z["low"] + z["high"]) / 2:   # von unten an Widerstand
        tp_dn = _tp_dn(z["high"], ns, atr)
        tp_up = nr2["low"] if nr2 else z["high"] + 3 * atr
        return [_o("Sell Limit", z["high"], z["high"] + 1.2 * atr + pad, tp_dn, "Abpraller am Widerstand"),
                _o("Buy Stop", z["high"] + pad, z["low"] - 0.5 * atr, tp_up, "Ausbruch ueber die Zone")]
    else:                                        # von oben an Unterstuetzung
        tp_up = _tp_up(z["low"], nr, atr)
        tp_dn = ns2["high"] if ns2 else z["low"] - 3 * atr
        return [_o("Buy Limit", z["low"], z["low"] - 1.2 * atr - pad, tp_up, "Abpraller an der Unterstuetzung"),
                _o("Sell Stop", z["low"] - pad, z["high"] + 0.5 * atr, tp_dn, "Bruch unter die Zone")]

def for_zone_break(z, up, price, atr, nr, ns):
    """Zone per Schluss gebrochen. Primaer: Limit auf den Retest der Zonenkante. Alternativ: Stop ueber/unter der Bruchkerze."""
    pad = max(0.3 * atr, 0.5)
    if up:
        return [_o("Buy Limit", z["high"], z["low"] - 0.8 * atr, _tp_up(price, nr, atr), "Retest der gebrochenen Zone"),
                _o("Buy Stop", price + pad, z["high"] - 1.0 * atr, _tp_up(price, nr, atr), "Fortsetzung ohne Retest")]
    return [_o("Sell Limit", z["low"], z["high"] + 0.8 * atr, _tp_dn(price, ns, atr), "Retest der gebrochenen Zone"),
            _o("Sell Stop", price - pad, z["low"] + 1.0 * atr, _tp_dn(price, ns, atr), "Fortsetzung ohne Retest")]

def for_ema_cross(direction, price, atr, e21, last_hi, last_lo, nr, ns):
    pad = max(0.3 * atr, 0.5)
    if direction == "LONG":
        return [_o("Buy Limit", e21, e21 - 1.5 * atr, _tp_up(price, nr, atr), "Ruecklauf an EMA21"),
                _o("Buy Stop", last_hi + pad, last_lo - 1.0 * atr, _tp_up(price, nr, atr), "ueber dem letzten Kerzenhoch")]
    return [_o("Sell Limit", e21, e21 + 1.5 * atr, _tp_dn(price, ns, atr), "Ruecklauf an EMA21"),
            _o("Sell Stop", last_lo - pad, last_hi + 1.0 * atr, _tp_dn(price, ns, atr), "unter dem letzten Kerzentief")]

def for_range_break(up, price, atr, rh, rl, nr, ns):
    pad = max(0.3 * atr, 0.5); h = rh - rl
    if up:
        tp = min(_tp_up(price, nr, atr), rh + h) if nr else rh + h
        return [_o("Buy Limit", rh, rl + h / 2 - 0.5 * atr, tp, "Retest des Range-Hochs"),
                _o("Buy Stop", price + pad, rh - 1.0 * atr, tp, "Fortsetzung")]
    tp = max(_tp_dn(price, ns, atr), rl - h) if ns else rl - h
    return [_o("Sell Limit", rl, rl + h / 2 + 0.5 * atr, tp, "Retest des Range-Tiefs"),
            _o("Sell Stop", price - pad, rl + 1.0 * atr, tp, "Fortsetzung")]

def for_rsi_rev(direction, price, atr, swing_hi, swing_lo, e21):
    pad = max(0.3 * atr, 0.5)
    if direction == "SHORT":
        return [_o("Sell Limit", swing_hi - pad, swing_hi + 1.0 * atr, e21, "Gegenbewegung bis EMA21")]
    return [_o("Buy Limit", swing_lo + pad, swing_lo - 1.0 * atr, e21, "Gegenbewegung bis EMA21")]

def bracket(price, atr, nr, ns, nr2=None, ns2=None):
    """Stunden-Einschaetzung NEUTRAL: Ausbruchs-Orders ober- und unterhalb der naechsten Zonen."""
    out = []
    pad = max(0.3 * atr, 0.5)
    if nr:
        out.append(_o("Buy Stop", nr["high"] + pad, nr["low"] - 1.0 * atr, nr2["low"] if nr2 else nr["high"] + 3 * atr, "Ausbruch ueber " + nr["name"]))
    if ns:
        out.append(_o("Sell Stop", ns["low"] - pad, ns["high"] + 1.0 * atr, ns2["high"] if ns2 else ns["low"] - 3 * atr, "Bruch unter " + ns["name"]))
    return out

def for_bias(direction, price, atr, ema_fast, nr, ns):
    """Stunden-Einschaetzung LONG/SHORT: Limit am EMA20 (15m) oder Stop ueber/unter dem Kurs."""
    pad = max(0.3 * atr, 0.5)
    if direction == "LONG":
        lim = min(ema_fast, price - pad)
        return [_o("Buy Limit", lim, lim - 1.5 * atr, _tp_up(price, nr, atr), "Ruecklauf an EMA20 (15m)"),
                _o("Buy Stop", price + pad, price - 1.5 * atr, _tp_up(price, nr, atr), "Fortsetzung")]
    lim = max(ema_fast, price + pad)
    return [_o("Sell Limit", lim, lim + 1.5 * atr, _tp_dn(price, ns, atr), "Ruecklauf an EMA20 (15m)"),
            _o("Sell Stop", price - pad, price + 1.5 * atr, _tp_dn(price, ns, atr), "Fortsetzung")]
