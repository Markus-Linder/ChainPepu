#!/usr/bin/env python3
"""Prueft, ob Charts gezeichnet werden koennen. Gibt CHART-OK oder CHART-FEHLER mit Ursache aus."""
import os, sys, time, traceback
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
try:
    import chart
    t = int(time.time()) // 60 * 60
    cs = [{"t": t - 60 * (30 - i), "o": 100 + i, "h": 101 + i, "l": 99 + i, "c": 100.5 + i} for i in range(30)]
    out = chart.render(cs, [{"name": "Test", "low": 110, "high": 112, "kind": "resistance"}], os.path.join(HERE, "charts", "selftest.png"),
                       "Selbsttest", "ok", orders=[{"typ": "Buy Limit", "preis": 105.0, "sl": 100.0, "tp": 120.0, "crv": 3.0}], price=129.5)
    print("CHART-OK", out, os.path.getsize(out), "Bytes", "python", sys.executable)
except Exception:
    print("CHART-FEHLER:", traceback.format_exc().strip().replace("\n", " | ")[-600:])
