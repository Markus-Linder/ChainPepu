# XAU/USD Zonen-Überwachung

Stündlich (Mo–Fr, Europe/Berlin) prüft ein geplanter Auftrag den Goldkurs gegen die Zonen in `zones.json`.

- `check.py` – holt Spot (gold-api.com) und Stundenkerzen (Yahoo GC=F), erkennt Tests (bis 0,25 % an eine Zone) und Brüche (Stundenschluss jenseits der Zone), dedupliziert über `state.json` (gleiche Zone frühestens nach 12 h erneut).
- `zones.json` – die relevanten Unterstützungen/Widerstände. Hier anpassen, wenn sich das Chartbild ändert. Ist `updated_at` älter als 7 Tage, bewertet der Auftrag die Zonen neu.
- `state.json` – zuletzt gemeldete Zonen (wird nur bei Signal geschrieben).

Manuell ausführen:

```bash
python3 xauusd/check.py
```
