#!/usr/bin/env python3
"""Zeichnet einen Kerzenchart (PNG) mit Zonen, Einstieg, Stopp, Ziel und EMAs. Nur Pillow noetig."""
import os, datetime as dt
from zoneinfo import ZoneInfo
import sys, subprocess, importlib
def _load_pil():
    for m in [k for k in sys.modules if k == "PIL" or k.startswith("PIL.")]: del sys.modules[m]
    from PIL import Image, ImageDraw, ImageFont
    return Image, ImageDraw, ImageFont
try:
    Image, ImageDraw, ImageFont = _load_pil()
except Exception:
    # Selbstheilung: System-Pillow defekt (z. B. "cannot import name '_imaging'") -> frisches Pillow ins User-Verzeichnis
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "--user", "--break-system-packages",
                    "--force-reinstall", "--no-deps", "pillow"], check=False)
    import site; importlib.invalidate_caches()
    usp = site.getusersitepackages()
    if usp not in sys.path: sys.path.insert(0, usp)
    Image, ImageDraw, ImageFont = _load_pil()

BERLIN = ZoneInfo("Europe/Berlin")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def _font(size, bold=False):
    try: return ImageFont.truetype(FONT_B if bold else FONT, size)
    except Exception: return ImageFont.load_default()

def _nice_step(rng, n=8):
    raw = rng / n
    for s in (0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500):
        if s >= raw: return s
    return 1000

def render(cs, zones, out, title, subtitle="", entry=None, stop=None, target=None,
           emas=None, price=None, interval_min=1, direction=None, orders=None):
    """cs: Liste von {t,o,h,l,c} (Spot-Niveau). zones: [{name,low,high,kind}]. emas: {label: [werte je Kerze]}."""
    W, H = 1280, 720
    L, R, T, B = 24, 150, 84, 56
    pw, ph = W - L - R, H - T - B
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    lows, highs = [c["l"] for c in cs], [c["h"] for c in cs]
    ymin, ymax = min(lows), max(highs)
    for v in (entry, stop, target, price):
        if v: ymin, ymax = min(ymin, v), max(ymax, v)
    for o in (orders or []):
        for v in (o["preis"], o["sl"], o["tp"]): ymin, ymax = min(ymin, v), max(ymax, v)
    rng = max(ymax - ymin, 1.0); lo0, hi0 = ymin - rng * 0.3, ymax + rng * 0.3
    for z in zones:   # nur Zonen nahe am Kursbereich aufnehmen
        if z["low"] < hi0 and z["high"] > lo0:
            ymin, ymax = min(ymin, z["low"]), max(ymax, z["high"])
    rng = max(ymax - ymin, 1.0); ymin -= rng * 0.06; ymax += rng * 0.06; rng = ymax - ymin
    y = lambda v: T + ph - (v - ymin) / rng * ph
    n = len(cs); cw = pw / n
    x = lambda i: L + (i + 0.5) * cw

    # Gitter + Preisachse
    step = _nice_step(rng); v = (int(ymin / step) + 1) * step
    while v < ymax:
        d.line([(L, y(v)), (L + pw, y(v))], fill=(232, 232, 232, 255), width=1)
        d.text((L + pw + 8, y(v) - 7), f"{v:,.1f}", fill=(90, 90, 90, 255), font=_font(13))
        v += step
    # Zonen (Baender)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for z in zones:
        if z["high"] < ymin or z["low"] > ymax: continue
        col = (220, 60, 60, 48) if z["kind"] == "resistance" else (40, 160, 90, 48)
        y1, y2 = y(z["high"]), y(z["low"])
        if y2 - y1 < 3: y1, y2 = y1 - 1.5, y2 + 1.5
        od.rectangle([L, y1, L + pw, y2], fill=col)
        od.text((L + 6, min(y1, y2) - 15 if y1 > T + 16 else y2 + 2), z["name"], fill=(col[0], col[1], col[2], 230), font=_font(12))
    img = Image.alpha_composite(img, ov); d = ImageDraw.Draw(img)
    # EMAs
    for label, (vals, col) in (emas or {}).items():
        pts = [(x(i), y(v)) for i, v in enumerate(vals) if v is not None]
        if len(pts) > 1: d.line(pts, fill=col, width=2)
        if pts: d.text((pts[-1][0] - 60, pts[-1][1] - 16), label, fill=col, font=_font(12))
    # Kerzen
    bw = max(2, cw * 0.6)
    for i, c in enumerate(cs):
        up = c["c"] >= c["o"]
        col = (34, 150, 90, 255) if up else (210, 55, 55, 255)
        d.line([(x(i), y(c["h"])), (x(i), y(c["l"]))], fill=col, width=1)
        top, bot = y(max(c["o"], c["c"])), y(min(c["o"], c["c"]))
        if bot - top < 1: bot = top + 1
        d.rectangle([x(i) - bw / 2, top, x(i) + bw / 2, bot], fill=col)
    # Zeitachse
    every = max(1, n // 8)
    for i in range(0, n, every):
        ts = dt.datetime.fromtimestamp(cs[i]["t"], BERLIN).strftime("%H:%M" if interval_min < 60 else "%d.%m %H:%M")
        d.line([(x(i), T + ph), (x(i), T + ph + 5)], fill=(120, 120, 120, 255))
        d.text((x(i) - 18, T + ph + 8), ts, fill=(90, 90, 90, 255), font=_font(12))
    # Plan-Linien
    def hline(v, col, label, dash=True):
        if v is None: return
        yy = y(v)
        if dash:
            for xx in range(L, L + pw, 14): d.line([(xx, yy), (min(xx + 8, L + pw), yy)], fill=col, width=2)
        else: d.line([(L, yy), (L + pw, yy)], fill=col, width=2)
        txt = f"{label} {v:,.1f}"; f = _font(13, True)
        tw = d.textlength(txt, font=f)
        d.rectangle([L + pw + 4, yy - 10, L + pw + 10 + tw, yy + 10], fill=col)
        d.text((L + pw + 7, yy - 8), txt, fill=(255, 255, 255, 255), font=f)
    hline(stop, (200, 40, 40, 255), "SL")
    hline(target, (30, 140, 70, 255), "TP")
    hline(entry, (30, 90, 200, 255), "Einstieg")
    for i, o in enumerate(orders or []):
        a = 255 if i == 0 else 150; p = "" if i == 0 else "Alt "
        hline(o["sl"], (200, 40, 40, a), p + "SL")
        hline(o["tp"], (30, 140, 70, a), p + "TP")
        hline(o["preis"], (30, 90, 200, a), p + o["typ"])
    if price: hline(price, (40, 40, 40, 255), "Kurs", dash=False)
    # Titel
    d.rectangle([0, 0, W, T - 8], fill=(250, 250, 250, 255))
    d.text((L, 12), title, fill=(20, 20, 20, 255), font=_font(22, True))
    if subtitle: d.text((L, 46), subtitle, fill=(80, 80, 80, 255), font=_font(14))
    if direction:
        col = (30, 140, 70, 255) if direction == "LONG" else (200, 40, 40, 255) if direction == "SHORT" else (120, 120, 120, 255)
        f = _font(20, True); tw = d.textlength(direction, font=f)
        d.rectangle([W - R - tw - 30, 14, W - R - 6, 48], fill=col)
        d.text((W - R - tw - 18, 20), direction, fill=(255, 255, 255, 255), font=f)
    d.text((W - 300, H - 20), "Markteinschaetzung, keine Anlageberatung", fill=(150, 150, 150, 255), font=_font(11))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out
