# XAU/USD Zonen-Überwachung

Alle 30 Minuten (Mo–Fr, Europe/Berlin) prüft ein geplanter Auftrag den Goldkurs gegen die Zonen in `zones.json` und erstellt eine regelbasierte Kurzfrist-Einschätzung (Feld `einschaetzung`: Richtung LONG/SHORT/NEUTRAL aus 1h-Trend, 15m-Momentum, RSI und Zonenlage, mit Einstieg, Stopp, Ziel und CRV).

- `check.py` – holt Spot (gold-api.com) und Stundenkerzen (Yahoo GC=F), erkennt Tests (bis 0,25 % an eine Zone) und Brüche (Stundenschluss jenseits der Zone), dedupliziert über `state.json` (gleiche Zone frühestens nach 12 h erneut).
- `zones.json` – die relevanten Unterstützungen/Widerstände. Hier anpassen, wenn sich das Chartbild ändert. Ist `updated_at` älter als 7 Tage, bewertet der Auftrag die Zonen neu.
- `state.json` – zuletzt gemeldete Zonen (wird nur bei Signal geschrieben).

Manuell ausführen:

```bash
python3 xauusd/check.py
```

## Minuten-Wächter (1m-Chart)

- `minute.py` – läuft als Daemon, wertet jede Minute den 1-Minuten-Chart aus (Zonen-Test/-Bruch, EMA9/21-Kreuz mit 5m-Trendfilter, 60-Minuten-Range-Ausbruch, RSI14-Umkehr) und schreibt `SIGNAL|…`-Zeilen in `minute.log`. Entprellung in `minute_state.json`.
- `start_watcher.sh` / `stop_watcher.sh` – Daemon starten bzw. stoppen.
- `wait_signal.py [Sekunden]` – blockiert, bis neue Signal-Zeilen erscheinen (oder Timeout), und gibt sie aus. Der stündliche Auftrag ruft es in einer Schleife auf und schickt je Signal eine Push-Nachricht.

## Charts und Signal-Seite

- `chart.py` – zeichnet Kerzencharts (Pillow) mit Zonen, Einstieg, Stopp, Ziel und EMAs. Der Minuten-Wächter hängt an jede `SIGNAL|…`-Zeile `|chart=<pfad>` an (1m-Chart, `charts/`), `check.py --chart` erzeugt `charts/hourly.png` (15m-Chart).
- `build_page.py` – baut `signal_page.html` (letzter Signal-Chart, Stunden-Chart, Signalliste, Bilder eingebettet).
- `artifact_url.txt` – feste Artifact-Adresse der Signal-Seite. Der Auftrag liest die Seite per Artifact-Tool (`read` mit dieser URL) und veröffentlicht `signal_page.html` mit `url` darauf neu. Der Link steht in jeder Push-Nachricht.

## Order-Vorschläge

`orders.py` liefert je Signal bis zu zwei konkrete Orders (Limit oder Stop mit SL und TP, CRV): Abpraller-Limit an der Zonenkante plus Ausbruchs-Stop dahinter (ZONE_TEST), Retest-Limit plus Fortsetzungs-Stop (ZONE_BREAK, RANGE_BREAK), Rücklauf-Limit am EMA21 plus Stop über/unter der Signalkerze (EMA_CROSS), Gegenbewegungs-Limit am Swing (RSI_REV). Die Stunden-Einschätzung liefert bei LONG/SHORT Limit am EMA20 (15m) plus Stop, bei NEUTRAL Ausbruchs-Orders ober- und unterhalb der nächsten Zonen (`einschaetzung.orders_kurz`). Die SIGNAL-Zeile trägt `|push=<Kurzform>` für die Push-Nachricht; im Chart sind die Orders als Linien eingezeichnet (erste Order kräftig, Alternative blass).
