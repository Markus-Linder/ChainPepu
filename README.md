# Stamina Coach

Diskrete Web-App (PWA) zum Training von Ausdauer und Kontrolle beim Sex. Nur für Erwachsene.

## Funktionen

- **Stop-Start-Trainer**: Timer mit Erregungs-Regler, „Stopp“-Button, automatischer Pausen-Countdown, Fortschrittsring.
- **Levelsystem**: 7 Level mit steigenden Zielen (aktive Zeit + Mindestanzahl Stopps). Ein Level steigt, wenn das Ziel zweimal erreicht wurde.
- **Beckenboden-Training**: Anspannen/Lockern mit einstellbaren Zeiten, Wiederholungen und Sätzen.
- **Atemübung**: 4-7-8, Box-Breathing und langsames Atmen mit animiertem Kreis.
- **Statistik**: Verlauf, Balkendiagramm der letzten 14 Sessions, Serie, beste Zeit.
- Vibration, Ton und Bildschirm-wach-halten optional. Offline nutzbar, auf dem Homescreen installierbar.

Alle Daten bleiben im `localStorage` des Geräts. Kein Server, keine Tracker.

## Starten

Es gibt keinen Build-Schritt. Einfach einen statischen Server im Projektordner starten, z. B.:

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080` im Browser öffnen. Auf dem Handy über „Zum Startbildschirm hinzufügen“ installieren.

## Hinweis

Die App ersetzt keine medizinische Beratung. Bei anhaltenden Beschwerden bitte ärztlichen oder sexualtherapeutischen Rat einholen.
