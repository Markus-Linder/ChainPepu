# llmreadiness.com – Unterlagen für Lovable

Dieser Ordner enthält alles, was Lovable braucht, um die Website **llmreadiness.com** rund um das Audit-Werkzeug `agent_readiness` zu bauen.

| Datei | Zweck |
|---|---|
| `LOVABLE_PROMPT.md` | Fertiger Start-Prompt zum Einfügen in Lovable |
| `KNOWLEDGE.md` | Projektwissen für Lovables "Knowledge"-Feld: Positionierung, Seiten, Preise, Regeln |
| `DATA_CONTRACT.md` | JSON-Struktur eines Berichts und geplante API, damit das Frontend die echten Daten anzeigen kann |
| `samples/sample-report.json` | Echter Beispielbericht (linde-mh.de) zum Entwickeln der Ergebnisansicht |
| `samples/sample-report.md` | Derselbe Bericht als Markdown, so sieht die Kundendatei aus |

## Vorgehen in Lovable

1. Neues Projekt anlegen, `KNOWLEDGE.md` komplett in das Knowledge-Feld des Projekts kopieren.
2. `LOVABLE_PROMPT.md` als ersten Prompt einfügen.
3. `samples/sample-report.json` hochladen, wenn Lovable nach Beispieldaten fragt, oder den Inhalt in den Prompt einfügen.
4. Seite für Seite verfeinern. Die Reihenfolge im Prompt ist nach Wichtigkeit sortiert.
5. Domain llmreadiness.com in Lovable unter Settings → Domains verbinden.

## Backend

Das Python-Werkzeug im Hauptordner des Repositories ist der Motor. Für die Website wird es in einem zweiten Schritt als kleine HTTP-API bereitgestellt (siehe `DATA_CONTRACT.md`). Bis dahin arbeitet die Lovable-Seite mit den Beispieldaten und einem Formular, das Anfragen per E-Mail oder in eine Supabase-Tabelle schreibt.

## Eigene Messlatte

Die Website muss im eigenen Audit mindestens 90 von 100 Punkten erreichen. Das heißt: JSON-LD für Organization, Service und Offer mit Preisen, FAQPage, sichtbare Preise im Text, llms.txt, Sitemap, robots.txt ohne Sperren für KI-Crawler, Inhalte ohne JavaScript lesbar. Lovable rendert standardmäßig clientseitig, deshalb ist Prerendering oder statische Generierung für die öffentlichen Seiten Pflicht.
