# ChainPepu – Agent-Readiness-Audit

Werkzeug für die Beratung **„Agent-Readiness“**: Wie gut können KI-Agenten (ChatGPT, Claude, Perplexity, Gemini und Einkaufsassistenten) eine Website finden, lesen, verstehen und nutzen?

Das Tool nimmt eine Domain, prüft sie technisch und erzeugt einen Bericht mit Punktzahl, Befunden und priorisierten Maßnahmen. Optional stellt es echte Kundenfragen an Claude mit Websuche und misst, ob die Firma in den Antworten vorkommt.

## Was geprüft wird

| Kategorie | Gewicht | Inhalt |
|---|---|---|
| Crawler-Zugang | 20 % | robots.txt, Sperren für KI-Such-Crawler (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Google-Extended …), X-Robots-Tag, Bot-Blockaden auf Netzwerkebene, TLS |
| Auffindbarkeit | 15 % | Sitemap, llms.txt, Feeds, Canonical, Sprachangabe |
| Strukturierte Daten | 25 % | JSON-LD: Organization/LocalBusiness, Product/Service/Offer mit Preis, FAQPage, Open Graph, Syntaxfehler |
| Inhaltsklarheit | 25 % | Lesbarer Text ohne JavaScript, Titel, Description, H1, sichtbare Preise, Kontaktdaten, Faktendichte statt Floskeln, Alt-Texte, PDF-Abhängigkeit |
| Agenten-Schnittstellen | 15 % | OpenAPI, MCP-Endpunkt, Agenten-Manifeste, direkte Kontaktlinks statt Formulare |
| KI-Sichtbarkeit | 30 % | Nur mit `--probe`: generierte Kundenfragen an Claude mit Websuche, Auswertung von Nennung, Zitierung und genannten Wettbewerbern |

Ohne `--probe` wird die Sichtbarkeit übersprungen und der Gesamtwert aus den technischen Kategorien gebildet.

## Installation

```bash
pip install -e ".[probe,dev]"
```

Python 3.11 oder neuer. Für den Sichtbarkeitstest wird ein Anthropic-API-Zugang benötigt (`ANTHROPIC_API_KEY` setzen oder `ant auth login`).

## Nutzung

Technisches Audit, Bericht nach `reports/`:

```bash
agent-readiness audit https://beispiel.de
```

Mit KI-Sichtbarkeitstest, 10 Fragen, Firmenname vorgeben:

```bash
agent-readiness audit https://beispiel.de --probe --questions 10 --brand "Beispiel GmbH"
```

Eigene Fragen statt generierter (eine Frage pro Zeile):

```bash
agent-readiness audit https://beispiel.de --probe --questions-file fragen.txt
```

Weitere Optionen: `--out ORDNER`, `--region AT`, `--model claude-opus-5-5`, `--no-fallbacks`, `--quiet`.

Ohne Installation geht auch `python -m agent_readiness audit …`.

## Ergebnis

Pro Lauf entstehen zwei Dateien im Zielordner:

- `domain_de.md`: lesbarer Bericht mit Übersicht, wichtigsten Maßnahmen, Sichtbarkeitstabelle und Befunden je Kategorie. Geeignet als Grundlage für das Kundengespräch.
- `domain_de.json`: alle Daten maschinenlesbar, z. B. für Vorher-Nachher-Vergleiche oder ein Dashboard.

Noten: A (85+) agentenfähig, B (70+) gut mit Lücken, C (50+) teilweise sichtbar, D (30+) schwer nutzbar, E praktisch unsichtbar.

## Sichtbarkeitstest und Kosten

Der Test nutzt standardmäßig `claude-opus-5-5` mit Websuche. Pro Frage fallen zwei Aufrufe an (Antwort mit bis zu drei Suchen, Auswertung) plus ein Aufruf für die Fragengenerierung. Bei 8 Fragen liegt ein Lauf typischerweise im Bereich weniger Euro. Der serverseitige Modell-Fallback bei Sicherheitsablehnungen ist eingeschaltet und lässt sich mit `--no-fallbacks` abschalten.

Die Nennungsquote schwankt zwischen Läufen, weil Suchergebnisse und Antworten nicht deterministisch sind. Für belastbare Vorher-Nachher-Vergleiche denselben Fragenkatalog per `--questions-file` verwenden und mehrfach messen.

## Entwicklung

```bash
pytest
```

Die Tests laufen offline mit Fixtures und einem Fake-Client, es werden keine API-Aufrufe gemacht.

Aufbau:

```
agent_readiness/
  cli.py            Kommandozeile und Ablauf
  http.py           HTTP-Client mit Cache und TLS-Rückfall
  checks/           eine Datei pro Prüfkategorie
  probe.py          Sichtbarkeitstest mit Claude
  scoring.py        Gewichtung und Noten
  report.py         Markdown- und JSON-Ausgabe
tests/              Offline-Tests und HTML-Fixtures
```

## Grenzen des Prototyps

- Geprüft wird nur die Startseite plus Standardpfade. Unterseiten (Produkte, Preise, FAQ) folgen in einer späteren Version.
- JavaScript wird nicht ausgeführt. Das ist Absicht, weil viele Agenten das auch nicht tun, führt aber bei reinen Single-Page-Apps zu einem schlechten Inhaltswert.
- Die Liste der KI-Crawler und Agenten-Dateien ändert sich laufend und muss gepflegt werden.
