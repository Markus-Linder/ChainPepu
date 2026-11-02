# Agent-Readiness-Audit: Startseite Linde Material Handling

**URL:** https://www.linde-mh.de/  
**Erstellt:** 2026-11-01 22:43 UTC  
**Gesamtwert:** 61/100 (C – teilweise sichtbar)

## Übersicht

| Kategorie | Gewicht | Punkte |
|---|---|---|
| Crawler-Zugang | 20 % | 100/100 |
| Auffindbarkeit | 15 % | 45/100 |
| Strukturierte Daten | 25 % | 55/100 |
| Inhaltsklarheit | 25 % | 75/100 |
| Agenten-Schnittstellen | 15 % | 10/100 |
| KI-Sichtbarkeit | 30 % | übersprungen |

## Wichtigste Maßnahmen

1. **Keine Product-, Service- oder Offer-Auszeichnung** (Strukturierte Daten): Kernleistungen als Service/Product mit Offer auszeichnen, auf Startseite oder verlinkten Seiten.
2. **Keine Preise oder Preisspannen im Text** (Inhaltsklarheit): Zumindest 'ab'-Preise oder Preisspannen nennen. Wer keine Preise zeigt, wird bei Vergleichsfragen übergangen.
3. **Keine llms.txt** (Auffindbarkeit): Eine /llms.txt im Markdown-Format anlegen: Was bietet die Firma, für wen, zu welchen Konditionen, Links zu den Kernseiten.

## Befunde im Detail

### Crawler-Zugang – 100/100

- 🟢 **KI-Such-Crawler dürfen lesen** – Keiner der bekannten Antwort-Crawler ist gesperrt.

### Auffindbarkeit – 45/100

- 🟠 **Keine llms.txt** – Agenten finden keine kompakte, maschinenlesbare Zusammenfassung des Angebots.
  - Empfehlung: Eine /llms.txt im Markdown-Format anlegen: Was bietet die Firma, für wen, zu welchen Konditionen, Links zu den Kernseiten.
- 🔵 **Kein RSS/Atom-Feed** – Nicht zwingend, hilft aber bei Neuigkeiten und Produktupdates.
- 🟢 **Sitemap vorhanden** – https://www.linde-mh.de/de/technical/sitemap.xml mit 402 Einträgen
- 🟢 **Canonical gesetzt** – https://www.linde-mh.de/de/
- 🟢 **Sprache deklariert** – lang="de"

### Strukturierte Daten – 55/100

- 🟠 **Keine Product-, Service- oder Offer-Auszeichnung** – Startseite nennt keine maschinenlesbaren Leistungen.
  - Empfehlung: Kernleistungen als Service/Product mit Offer auszeichnen, auf Startseite oder verlinkten Seiten.
- 🔵 **Organisationsdaten unvollständig** – Fehlt: telephone
  - Empfehlung: name, url, telephone, address, sameAs (Social-Profile) ergänzen.
- 🔵 **Keine FAQPage**
  - Empfehlung: Häufige Kundenfragen als FAQPage auszeichnen. Agenten übernehmen solche Antworten besonders gern.
- 🟢 **Strukturierte Daten vorhanden** – Typen: Brand, ContactPoint, Country, ImageObject, Organization, PostalAddress, WebPage, WebSite
- 🟢 **Unternehmen/Organisation ausgezeichnet** – Organization
- 🟢 **Ergänzende Typen** – ContactPoint, WebSite
- 🟢 **Open-Graph-Daten vorhanden** – Willkommen bei Linde Material Handling!

### Inhaltsklarheit – 75/100

- 🟠 **Keine Preise oder Preisspannen im Text** – Agenten können das Angebot nicht einordnen oder vergleichen.
  - Empfehlung: Zumindest 'ab'-Preise oder Preisspannen nennen. Wer keine Preise zeigt, wird bei Vergleichsfragen übergangen.
- 🟢 **Ausreichend Text im HTML** – 1229 Wörter ohne JavaScript lesbar
- 🟢 **Seitentitel vorhanden** – Startseite Linde Material Handling
- 🟢 **Meta-Description vorhanden** – Linde Material Handling: Stapler, Lagertechnik und Automatisierung für effiziente Intralogistik ✓Produkte ✓Service ✓Lösungen ✓Beratung
- 🟢 **Genau eine H1** – Linde Material Handling
- 🟢 **Kontaktdaten im Text** – +49 6021 99 0 / info@linde-mh.de
- 🟢 **Faktendichte in Ordnung** – 45 Zahlenangaben, 1 Floskeln

### Agenten-Schnittstellen – 10/100

- 🔵 **Keine OpenAPI-Beschreibung**
  - Empfehlung: Für Verfügbarkeit, Preise oder Terminbuchung eine kleine öffentliche API mit OpenAPI-Datei anbieten.
- 🔵 **Kein MCP-Server**
  - Empfehlung: Ein Model-Context-Protocol-Server erlaubt Agenten direkte Aktionen: Angebot anfragen, Termin buchen, Bestand prüfen.
- 🔵 **2 Formular(e), aber keine Schnittstelle** – Agenten können Formulare schlecht ausfüllen. Direkter Weg fehlt.
  - Empfehlung: Die wichtigste Aktion (Anfrage, Termin, Bestellung) zusätzlich per API oder E-Mail-Adresse anbieten.
- 🟢 **Direkte Kontaktlinks (mailto/tel)** – Agenten können Kontakt ohne Formular aufnehmen.

### KI-Sichtbarkeit – übersprungen

_Nicht ausgeführt. Mit --probe aktivieren (benötigt Anthropic-API-Zugang)._

---
_Erstellt mit agent-readiness. Die Prüfung ersetzt keine manuelle Analyse, zeigt aber die größten Hürden für KI-Agenten._