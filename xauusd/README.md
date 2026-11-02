# XAU/USD Zonen-Überwachung

Alle 30 Minuten (Mo–Fr, Europe/Berlin) prüft ein geplanter Auftrag den Goldkurs gegen die Zonen in `zones.json` und erstellt eine regelbasierte Kurzfrist-Einschätzung (Feld `einschaetzung`: Richtung LONG/SHORT/NEUTRAL aus 1h-Trend, 15m-Momentum, RSI und Zonenlage, mit Einstieg, Stopp, Ziel und CRV).

- `check.py` – holt Spot (gold-api.com) und Stundenkerzen (Yahoo GC=F), erkennt Tests (bis 0,25 % an eine Zone) und Brüche (Stundenschluss jenseits der Zone), dedupliziert über `state.json` (gleiche Zone frühestens nach 12 h erneut).
- `zones.json` – die relevanten Unterstützungen/Widerstände. Hier anpassen, wenn sich das Chartbild ändert. Ist `updated_at` älter als 7 Tage, bewertet der Auftrag die Zonen neu.
- `state.json` – zuletzt gemeldete Zonen (wird nur bei Signal geschrieben).

Manuell ausführen:

```bash
python3 xauusd/check.py
```
