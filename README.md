# ChainPepu – MT5-Konto-Monitor fürs Smartphone

ChainPepu verbindet dein MetaTrader-5-Konto über [MetaApi](https://metaapi.cloud) mit einem
Telegram-Bot. Du bekommst Kontostand, offene Positionen, Push-Alerts bei eröffneten und
geschlossenen Trades, einen Drawdown-Alarm und einen automatischen Tagesbericht direkt aufs Handy.

Alles läuft **nur lesend**. Ein Investor-Passwort (Read-only) reicht. Der Bot kann keine Trades
ausführen, und deine Zugangsdaten liegen ausschließlich bei MetaApi, nie im Code.

## So funktioniert Weg 1 (MetaApi)

```
MT5-Konto beim Broker  ──►  MetaApi-Cloud (hält die Verbindung zum Broker-Server)
                                    │  REST / Websocket
                                    ▼
                          ChainPepu-Bot (läuft 24/7 auf Railway/Render/Fly)
                                    │  Telegram Bot API
                                    ▼
                          Telegram-App auf deinem Handy
```

Die MT5-App auf dem Handy wird dafür nicht gebraucht. MetaApi loggt sich wie ein eigenes
Terminal beim Broker ein und stellt die Daten per API bereit.

## Einrichtung in 5 Schritten (geht komplett vom Handy)

### 1. MetaApi-Konto anlegen und MT5-Konto verbinden
1. Auf <https://app.metaapi.cloud> registrieren.
2. **Trading accounts → Add account** wählen.
3. Eintragen: Plattform **MT5**, dein **Login**, das **Investor-Passwort** (in der MT5-App unter
   *Einstellungen → Konto → Passwort ändern* findest du bzw. setzt du das Investor-Passwort),
   den **Broker-Servernamen** (steht in der MT5-App beim Konto, z. B. `ICMarketsSC-Demo`) und eine
   **Region** nahe bei dir (`london` für Europa).
4. Nach dem Speichern zeigt MetaApi eine **Account ID** an. Notieren.
5. Unter **Profil → API access token** einen Token erzeugen. Notieren. Niemals in Chats posten.

Preise findest du unter <https://metaapi.cloud/#pricing>. Es gibt eine kostenlose Testphase,
danach ist der Dienst kostenpflichtig (Größenordnung: einige Dollar bis wenige Dutzend Dollar im Monat).

### 2. Telegram-Bot anlegen
1. In Telegram [@BotFather](https://t.me/BotFather) öffnen, `/newbot` senden, Namen vergeben.
2. Den **Bot-Token** kopieren.
3. Deinen neuen Bot öffnen und `/start` senden. Er antwortet mit deiner **Chat-ID**, solange
   der Chat noch nicht freigeschaltet ist.

### 3. Konfiguration
Kopiere `.env.example` nach `.env` und fülle die Werte aus:

| Variable | Bedeutung |
|---|---|
| `METAAPI_TOKEN` | API-Token aus Schritt 1 |
| `METAAPI_ACCOUNT_ID` | Account ID aus Schritt 1 |
| `METAAPI_REGION` | Region des Kontos, z. B. `london` |
| `TELEGRAM_BOT_TOKEN` | Token von BotFather |
| `TELEGRAM_ALLOWED_CHAT_IDS` | deine Chat-ID (mehrere mit Komma) |
| `DRAWDOWN_ALERT_PERCENT` | Alarm ab x % Drawdown, `0` = aus |
| `DAILY_REPORT_HOUR` | Stunde für den Tagesbericht (Zeitzone `TZ`) |

### 4. Lokal testen (optional, am PC)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
python -m chainpepu
```

### 5. Deployen, damit der Bot 24/7 läuft
Der Bot braucht einen dauerhaft laufenden Prozess. Am einfachsten vom Handy aus:

- **Railway** (<https://railway.app>): „New Project → Deploy from GitHub repo“, dieses Repo wählen.
  Railway erkennt das `Dockerfile`. Unter **Variables** die Werte aus `.env` eintragen. Fertig.
- **Render** (<https://render.com>): „New → Background Worker“, Repo wählen, Runtime Docker,
  Umgebungsvariablen eintragen.

Nach dem Start schreibt der Bot „ChainPepu-Monitor ist online“ in deinen Chat.

## Befehle

| Befehl | Antwort |
|---|---|
| `/status` | Balance, Equity, schwebender P/L, Drawdown |
| `/positions` | alle offenen Positionen mit P/L, SL und TP |
| `/orders` | Pending-Orders |
| `/today` | Tagesbericht: Netto-Ergebnis, Trades, Trefferquote |
| `/week` | Wochenbericht ab Montag |
| `/alerts on` / `off` | Push-Alerts für diesen Chat an- oder ausschalten |

Automatisch ohne Befehl:
- 🆕 Alert, wenn eine Position eröffnet wird
- ✅ Alert mit realisiertem Ergebnis, wenn eine Position geschlossen wird
- ⚠️ Drawdown-Alarm, sobald die Equity um `DRAWDOWN_ALERT_PERCENT` unter die Balance fällt
- 📅 Tagesbericht um `DAILY_REPORT_HOUR` Uhr

## Projektstruktur

```
chainpepu/
  config.py      Einstellungen aus Umgebungsvariablen
  mt5.py         MetaApi-Verbindung (nur lesende Aufrufe)
  formatting.py  Telegram-Nachrichten
  alerts.py      Erkennung von Positionsänderungen und Drawdown
  bot.py         Telegram-Befehle, Polling-Schleife, Tagesbericht
tests/           pytest-Tests (ohne Netz lauffähig)
```

## Ausbaustufen zum Business

1. **Eigenes Monitoring** (dieser Stand): dein Konto, dein Bot.
2. **Signal-Kanal**: Alerts zusätzlich in einen Telegram-Kanal posten, Zugang gegen Monatsabo
   (z. B. über Telegram Stars oder Stripe-Link).
3. **Multi-Konto**: mehrere MetaApi-Konten überwachen, Kunden bringen ihr eigenes Konto mit.
4. **Trading-Befehle**: `/close`, `/buy`, `/sell` über die MetaApi-Handelsfunktionen. Dafür ist das
   Master-Passwort statt des Investor-Passworts nötig. Erst aktivieren, wenn Monitoring stabil läuft.

## Sicherheit

- Nur Chat-IDs aus `TELEGRAM_ALLOWED_CHAT_IDS` bekommen Antworten. Alle anderen sehen nur ihre ID.
- `.env` ist in `.gitignore` und darf nie committet werden.
- Für den Betrieb reicht das Investor-Passwort. Das Master-Passwort nur hinterlegen, wenn
  Handelsbefehle gewünscht sind.
