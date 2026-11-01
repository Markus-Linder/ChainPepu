# kiwerbung.de – KI-Werbung & Automatisierung für Unternehmer

Komplette Website für **kiwerbung.de** im Stil der „KI für Unternehmer“-Positionierung
(Werbung, Vertrieb und Content auf Autopilot – *dein Unternehmen funktioniert auch ohne dich*),
inklusive drei **Live-KI-Funktionen** direkt auf der Seite:

| Funktion | Was sie macht | Technik |
|---|---|---|
| 🧠 **KI-Anzeigen-Generator** | 3 Anzeigenvarianten (Hook, Primärtext, Headline, CTA) + TikTok/Reels-Skript + Tipps aus einer Produktbeschreibung | `public/api/generate.php` → Claude mit JSON-Schema-Output |
| 💬 **KI-Chat-Assistent** | Beantwortet Fragen zum Angebot, stellt Rückfragen, führt zum Erstgespräch | `public/api/chat.php` → Claude, Verlauf nur im Browser |
| 📈 **Werbe-ROI-Rechner** | Klicks, Aufträge, Umsatz, ROAS, Gewinn – mit Conversion-Szenario | reines JavaScript |
| ✉️ **Kontaktformular** | Mit Honeypot-Spamschutz, Versand per `mail()` | `public/api/contact.php` |
| 📅 **Terminbuchung** | Cal.com-Inline-Kalender (sobald Link eingetragen) | `index.html` → `KIW_CONFIG.calLink` |

Außerdem: Impressum- und Datenschutz-Vorlagen (inkl. Abschnitt für die KI-Funktionen),
404-Seite, `robots.txt`, `sitemap.xml`, `.htaccess` (HTTPS, saubere URLs, Security-Header, Caching).

## Struktur

```
.
├── composer.json          # Anthropic PHP SDK + Guzzle
├── config.example.php     # → nach config.php kopieren (liegt AUSSERHALB von public/)
├── public/                # DocumentRoot der Domain
│   ├── index.html         # Landingpage
│   ├── impressum.html, datenschutz.html, 404.html
│   ├── .htaccess
│   ├── assets/css/style.css, assets/js/main.js, assets/img/favicon.svg
│   └── api/
│       ├── chat.php       # KI-Chat
│       ├── generate.php   # KI-Anzeigen-Generator
│       ├── contact.php    # Kontaktformular
│       └── lib/bootstrap.php  # Config, Rate-Limit, Fehlerbehandlung, Claude-Client
├── storage/               # wird automatisch angelegt (Rate-Limit-Daten), nicht im Repo
└── vendor/                # Composer-Pakete, nicht im Repo
```

## Lokal starten

```bash
composer install
cp config.example.php config.php   # API-Key & E-Mail eintragen
php -S 127.0.0.1:8080 -t public
```

Dann <http://127.0.0.1:8080> öffnen. Ohne gültigen `anthropic_api_key` antworten Chat und Generator
mit einer verständlichen Fehlermeldung („KI-Funktion noch nicht aktiviert“), alles andere funktioniert.

## Deployment auf All-Inkl (kiwerbung.de)

Die Domain liegt bereits bei All-Inkl (Kasserver) und zeigt aktuell die leere Platzhalterseite.

1. **PHP-Version**: Im KAS unter *Domain → PHP-Version* mindestens **PHP 8.1** (besser 8.3) wählen.
2. **SSL**: *Domain → SSL-Schutz → Let's Encrypt* aktivieren (kostenlos). Die `.htaccess` leitet danach auf HTTPS um.
   Aktuell liefert `https://kiwerbung.de` noch ein falsches Zertifikat – ohne diesen Schritt bleibt der Browser-Fehler.
3. **Abhängigkeiten lokal installieren** (All-Inkl hat kein Composer): `composer install --no-dev` ausführen,
   dadurch entsteht `vendor/`.
4. **Hochladen per FTP/SFTP** in einen Ordner, z. B. `/kiwerbung/`:
   - `public/` (kompletter Inhalt inkl. `.htaccess`)
   - `vendor/`
   - `config.php` (aus `config.example.php` erstellt, mit echtem API-Key)
5. **DocumentRoot setzen**: Im KAS unter *Domain → Bearbeiten → Pfad* den Ordner `/kiwerbung/public` eintragen.
   So liegen `config.php` und `vendor/` außerhalb des Webroots und sind nicht öffentlich abrufbar.
6. **E-Mail**: Im KAS ein Postfach `kontakt@kiwerbung.de` anlegen und in `config.php` `contact_to`/`contact_from`
   eintragen. Absender muss zur Domain gehören, sonst landet das Formular im Spam.
7. **Cal.com**: Unter <https://cal.com> einen 30-Minuten-Termintyp anlegen und den Link (z. B. `deinname/30min`)
   in `public/index.html` bei `window.KIW_CONFIG.calLink` eintragen – der Kalender erscheint dann inline.
8. **Impressum & Datenschutz**: Die rot markierten Platzhalter in `impressum.html` und `datenschutz.html` ersetzen.
   Pflicht in Deutschland.

## Konfiguration (`config.php`)

| Schlüssel | Bedeutung |
|---|---|
| `anthropic_api_key` | API-Key von <https://platform.claude.com> |
| `anthropic_base_url` | optional, nur für Proxy/Gateway |
| `model` | Standard `claude-opus-5-5` |
| `contact_to` / `contact_from` | Empfänger und Absender des Kontaktformulars |
| `rate_limit` / `rate_limit_window` | Anfragen pro IP und Zeitfenster (Schutz des API-Keys) |
| `allowed_origins` | nur nötig, wenn die API von einer anderen Domain aufgerufen wird |
| `cal_link` | Cal.com-Link, den der Chat-Assistent als Buchungslink nennt |

Alternativ kann der Key als Umgebungsvariable `ANTHROPIC_API_KEY` gesetzt werden.

## KI-Details

- Modell `claude-opus-5-5` über das offizielle PHP-SDK (`anthropic-ai/sdk`), Beta-Endpunkt mit
  `fallbacks: 'default'` (serverseitiger Fallback bei Ablehnung durch Sicherheitsfilter).
- Chat: Effort `low`, max. 800 Tokens, System-Prompt mit Prompt-Caching; Verlauf wird auf 20 Nachrichten begrenzt
  und nicht serverseitig gespeichert.
- Generator: Effort `medium`, strukturierte Ausgabe per JSON-Schema (3 Varianten, TikTok-Skript, Tipps).
- Kosten im Blick behalten: Das Rate-Limit (Standard 20 Anfragen / 10 Minuten pro IP) verhindert Missbrauch.
  Zusätzlich im Anthropic-Dashboard ein monatliches Spend-Limit setzen.

## Texte & Preise anpassen

Alle Inhalte stehen direkt in `public/index.html`. Die Paketpreise (490 €, 990 €, individuell) sind
Platzhalter in realistischer Größenordnung – vor dem Livegang auf die eigenen Preise ändern.
Social-Links im Footer (TikTok, Instagram) auf die eigenen Profile setzen.
