#!/usr/bin/env python3
"""Baut signal_page.html: aktuellster Signal-Chart, Stunden-Chart und die letzten Signale, Bilder als data-URI eingebettet."""
import os, re, json, base64, datetime as dt, html
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__)); CH = os.path.join(HERE, "charts")
BERLIN = ZoneInfo("Europe/Berlin")
def b64(p):
    try: return "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()
    except Exception: return ""
lines = []
try: lines = [l.strip() for l in open(os.path.join(HERE, "minute.log")) if l.startswith("SIGNAL|")]
except Exception: pass
sigs = []
for l in lines[-12:][::-1]:
    parts = l.split("|"); chart = ""
    if len(parts) >= 4:
        txt = parts[3]; m = re.search(r"\|?chart=(\S+)", l)
        if m: chart = m.group(1)
        txt = re.sub(r"\|?(chart|push)=[^|]*", "", txt).strip()
        sigs.append({"time": parts[1], "kind": parts[2], "text": txt, "chart": chart})
latest = sigs[0] if sigs else None
latest_img = b64(latest["chart"]) if latest and latest.get("chart") else b64(os.path.join(CH, "latest_signal.png"))
hourly_img = b64(os.path.join(CH, "hourly.png"))
assess = {}
try:
    st = json.load(open(os.path.join(HERE, "minute_state.json"))).get("last", {})
except Exception: st = {}
now = dt.datetime.now(BERLIN).strftime("%d.%m.%Y %H:%M")
def card(title, img, caption):
    if not img: return f'<section class="card"><h2>{title}</h2><p class="muted">Noch kein Chart vorhanden.</p></section>'
    return f'<section class="card"><h2>{title}</h2><div class="chart"><img src="{img}" alt="{html.escape(title)}"></div><p class="cap">{html.escape(caption)}</p></section>'
rows = "".join(f'<li><span class="t">{html.escape(s["time"])}</span><span class="k {html.escape(s["kind"])}">{html.escape(s["kind"])}</span><span class="x">{html.escape(s["text"])}</span></li>' for s in sigs) or '<li class="muted">Noch keine Signale heute.</li>'
page = f'''<title>XAU/USD Signal-Chart</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: eine Spalte, Charts in weissen Karten, Signalliste darunter */
:root {{ --bg:#f3f1ec; --fg:#1d1b17; --muted:#6b665c; --card:#ffffff; --line:#dcd7cc; --accent:#8a5a14; --long:#1f7a46; --short:#b43030; --mono:"DejaVu Sans Mono",ui-monospace,Menlo,Consolas,monospace; --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#17161a; --fg:#ebe8e1; --muted:#a39e93; --card:#232227; --line:#3a383f; --accent:#d9a14a; --long:#4fc27a; --short:#ef6b6b; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg:#17161a; --fg:#ebe8e1; --muted:#a39e93; --card:#232227; --line:#3a383f; --accent:#d9a14a; --long:#4fc27a; --short:#ef6b6b; color-scheme: dark }}
body {{ background:var(--bg); color:var(--fg); font-family:var(--sans); margin:0; }}
main {{ max-width:1100px; margin:0 auto; padding-block:20px 40px; padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); display:grid; gap:18px; }}
h1 {{ font-size:1.5rem; margin:0; text-wrap:balance; }}
h2 {{ font-size:1.05rem; margin:0 0 10px; }}
.muted {{ color:var(--muted); }}
.sub {{ color:var(--muted); font-size:.9rem; margin:4px 0 0; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:8px; padding:14px; min-width:0; }}
.chart {{ background:#fff; border-radius:4px; overflow:hidden; }}
.chart img {{ display:block; width:100%; height:auto; max-width:100%; }}
.cap {{ font-size:.9rem; color:var(--muted); margin:8px 0 0; }}
ul {{ list-style:none; margin:0; padding:0; display:grid; gap:6px; }}
li {{ display:grid; grid-template-columns:52px 110px 1fr; gap:10px; align-items:baseline; font-size:.9rem; border-top:1px solid var(--line); padding-top:6px; min-width:0; }}
li .t {{ font-family:var(--mono); font-variant-numeric:tabular-nums; }}
li .k {{ font-family:var(--mono); font-size:.75rem; letter-spacing:.04em; color:var(--accent); }}
li .x {{ min-width:0; overflow-wrap:anywhere; }}
.stat {{ display:flex; flex-wrap:wrap; gap:14px; font-size:.9rem; }}
.stat b {{ font-family:var(--mono); font-variant-numeric:tabular-nums; }}
@media (max-width:520px) {{ li {{ grid-template-columns:48px 1fr; }} li .x {{ grid-column:1 / -1; }} }}
</style>
<main>
<header><h1>XAU/USD Signal-Chart</h1><p class="sub">Stand {now} Uhr · Zonen, Einstieg, Stopp und Ziel aus dem Minuten-Wächter · Markteinschätzung, keine Anlageberatung</p></header>
<section class="card"><div class="stat"><span>Kurs <b>{st.get("price","–")}</b></span><span>RSI 1m <b>{st.get("rsi1m","–")}</b></span><span>EMA9 <b>{st.get("ema9","–")}</b></span><span>EMA21 <b>{st.get("ema21","–")}</b></span><span>ATR 5m <b>{st.get("atr5","–")}</b></span><span>60-Min-Spanne <b>{" – ".join(str(v) for v in st.get("range60",[])) or "–"}</b></span></div></section>
{card("Letztes Minuten-Signal", latest_img, (latest["time"] + " Uhr · " + latest["text"]) if latest else "")}
{card("Stunden-Einschätzung (15-Minuten-Chart)", hourly_img, "Blau EMA20, orange EMA50. Rote Bänder Widerstand, grüne Bänder Unterstützung.")}
<section class="card"><h2>Letzte Signale</h2><ul>{rows}</ul></section>
</main>'''
open(os.path.join(HERE, "signal_page.html"), "w").write(page)
print("ok", len(page) // 1024, "KB")
