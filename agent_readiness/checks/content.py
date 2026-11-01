"""Prüft, ob der sichtbare Inhalt für Agenten klar, faktenreich und ohne Browser lesbar ist."""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from ..http import Fetcher
from ..models import CategoryResult, CRITICAL, WARNING, INFO, OK

PRICE_RE = re.compile(r"(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s?(?:€|EUR|Euro)|(?:€|EUR)\s?\d+)", re.I)
PHONE_RE = re.compile(r"(\+\d{2,3}[\s\d/()-]{6,}|\b0\d{2,5}[\s/-]?\d{3,}[\s\d-]*)")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
FLUFF = ["marktführend", "innovativ", "ganzheitlich", "maßgeschneidert", "einzigartig", "führender anbieter",
         "höchste qualität", "kundenorientiert", "leidenschaft", "exzellen"]


def visible_text(html: str) -> str:
    soup = BeautifulSoup(html or "", "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "template"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()


def check_content(fetcher: Fetcher, home_html: str, ctx: dict) -> CategoryResult:
    result = CategoryResult(key="content", name="Inhaltsklarheit", weight=25, score=0)
    soup = BeautifulSoup(home_html or "", "html.parser")
    text = visible_text(home_html)
    ctx["visible_text"] = text
    words = len(text.split())

    title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    desc_tag = soup.find("meta", attrs={"name": lambda v: v and v.lower() == "description"})
    desc = (desc_tag.get("content") or "").strip() if desc_tag else ""
    h1s = [h.get_text(" ", strip=True) for h in soup.find_all("h1")]
    ctx["title"], ctx["description"], ctx["h1"] = title, desc, h1s

    if words < 80:
        result.add(CRITICAL, "Kaum lesbarer Text ohne JavaScript",
                   f"Nur {words} Wörter im ausgelieferten HTML.",
                   "Server-seitig rendern oder Prerendering einsetzen. Viele Agenten führen kein JavaScript aus.")
    elif words < 250:
        result.score += 10
        result.add(WARNING, "Wenig Text auf der Startseite", f"{words} Wörter",
                   "Kernangebot, Zielgruppe und Konditionen in klaren Sätzen auf die Startseite.")
    else:
        result.score += 20
        result.add(OK, "Ausreichend Text im HTML", f"{words} Wörter ohne JavaScript lesbar")

    if title and 10 <= len(title) <= 70:
        result.score += 10
        result.add(OK, "Seitentitel vorhanden", title)
    elif title:
        result.score += 5
        result.add(INFO, "Seitentitel ungünstig lang oder kurz", f"{len(title)} Zeichen: {title}",
                   "Titel mit Firmenname und Kernleistung, 30 bis 65 Zeichen.")
    else:
        result.add(WARNING, "Kein Seitentitel", "", "Titel mit Firmenname und Kernleistung setzen.")

    if desc and 50 <= len(desc) <= 170:
        result.score += 10
        result.add(OK, "Meta-Description vorhanden", desc)
    elif desc:
        result.score += 5
        result.add(INFO, "Meta-Description ungünstig lang oder kurz", f"{len(desc)} Zeichen",
                   "Ein bis zwei Sätze: Was, für wen, wo.")
    else:
        result.add(WARNING, "Keine Meta-Description", "",
                   "Beschreibung mit Angebot, Zielgruppe und Standort ergänzen. Wird oft wörtlich von Agenten übernommen.")

    if len(h1s) == 1:
        result.score += 10
        result.add(OK, "Genau eine H1", h1s[0])
    elif h1s:
        result.score += 5
        result.add(INFO, f"{len(h1s)} H1-Überschriften", "; ".join(h1s[:3]), "Eine H1 pro Seite mit dem Kernangebot.")
    else:
        result.add(WARNING, "Keine H1", "", "H1 mit dem Kernangebot ergänzen.")

    prices = PRICE_RE.findall(text)
    if prices:
        result.score += 15
        result.add(OK, "Preise im Text sichtbar", ", ".join(dict.fromkeys(p.strip() for p in prices))[:200])
    else:
        result.add(WARNING, "Keine Preise oder Preisspannen im Text",
                   "Agenten können das Angebot nicht einordnen oder vergleichen.",
                   "Zumindest 'ab'-Preise oder Preisspannen nennen. Wer keine Preise zeigt, wird bei Vergleichsfragen übergangen.")

    phone = PHONE_RE.search(text)
    email = EMAIL_RE.search(text)
    if phone or email:
        result.score += 10
        result.add(OK, "Kontaktdaten im Text", " / ".join(x.group(0).strip() for x in (phone, email) if x))
    else:
        result.add(WARNING, "Keine Telefonnummer oder E-Mail im HTML", "",
                   "Kontakt als Text, nicht nur als Bild oder Formular.")

    fluff_hits = [f for f in FLUFF if f in text.lower()]
    numbers = len(re.findall(r"\b\d{2,}\b", text))
    if len(fluff_hits) >= 3 and numbers < 5:
        result.add(WARNING, "Viel Marketingsprache, wenig Fakten",
                   "Floskeln: " + ", ".join(fluff_hits) + f". Nur {numbers} Zahlen im Text.",
                   "Konkrete Angaben: Stückzahlen, Lieferzeiten, Preise, Jahre, Standorte, Referenzen.")
    else:
        result.score += 10
        result.add(OK, "Faktendichte in Ordnung", f"{numbers} Zahlenangaben, {len(fluff_hits)} Floskeln")

    imgs = soup.find_all("img")
    no_alt = [i for i in imgs if not (i.get("alt") or "").strip()]
    if imgs and len(no_alt) / len(imgs) > 0.5:
        result.add(INFO, "Viele Bilder ohne Alt-Text", f"{len(no_alt)} von {len(imgs)}",
                   "Alt-Texte beschreiben Produkte für Agenten, die Bilder nicht auswerten.")
    else:
        result.score += 5

    pdf_links = [a for a in soup.find_all("a", href=True) if a["href"].lower().endswith(".pdf")]
    if len(pdf_links) >= 3:
        result.add(INFO, f"{len(pdf_links)} PDF-Links auf der Startseite", "",
                   "Kataloge und Preislisten zusätzlich als HTML anbieten. PDFs werden seltener und schlechter gelesen.")

    result.score = max(0, min(100, result.score))
    return result
