# ChainPepu — Persönlicher Bot

Ein Python-Agent auf Basis der Claude API (Opus 4.7), der Aufgaben am PC für dich erledigt: Bash-Befehle ausführen, Dateien lesen/schreiben, Webseiten abrufen.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # ANTHROPIC_API_KEY eintragen
python bot.py
```

## Werkzeuge

- `run_bash` — Shell-Befehle (riskante Befehle werden bestätigt)
- `read_file` / `write_file` — Dateien lesen/schreiben
- `list_dir` — Verzeichnisinhalt
- `fetch_url` — HTTP GET
- `take_screenshot` — Bildschirmfoto erstellen (Claude sieht den Desktop)
- `mouse_click` / `type_text` / `press_key` — Maus & Tastatur steuern

Damit kann der Bot praktisch alles erledigen, was du auch am PC machst: Programme öffnen, Dateien organisieren, Code schreiben und ausführen, Webseiten abrufen, GUI-Anwendungen bedienen.

## Optionen

- `BOT_AUTO_APPROVE=1` — überspringt alle Bestätigungsdialoge (nur in vertrauenswürdiger Umgebung)

## Erweiterung

Neue Werkzeuge anlegen: in `bot.py` eine Funktion mit `@beta_tool` dekorieren und in der `tools=`-Liste in `main()` registrieren. So kannst du z. B. Telegram, E-Mail, Browser-Automatisierung (Playwright) oder Computer Use anbinden.
