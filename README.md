# BauchFit Coach

4-Wochen-Trainingsprogramm gegen Bauchfett, für zuhause und ohne Geräte. Jede Übung hat ein Video mit einer konsistenten Trainerin und eine deutsche Sprachanleitung (ElevenLabs-Stimme). Dazu ein Trainings-Player mit Timer und Ansagen, ein Ernährungsplan mit Kalorienrechner, Wochenziele und Fortschrittsmessung.

Die App ist ein Vite + React + TypeScript + Tailwind-Projekt und läuft direkt in Lovable.

## Funktionen

- **Heute**: aktuelle Einheit, Wochenschwerpunkt (Training + Ernährung), Wochenziele, Statistik, Tipp des Tages
- **Plan**: 4 Wochen × 7 Tage, steigende Belastung, Ablauf pro Tag, abhakbare Wochenziele
- **Übungen**: 12 Übungen mit Video, Sprachanleitung, Schritt-für-Schritt-Text, häufigen Fehlern und leichter/schwerer Variante
- **Trainings-Player**: Intervall-Timer, Video der aktuellen Übung, Sprachansagen der Trainerin (Start, Pause, nächste Übung, letzte 10 Sekunden, Seite wechseln, letzte Runde, Geschafft), Signaltöne, Bildschirm bleibt an
- **Essen**: Kalorien- und Eiweißziel (Mifflin-St Jeor), 7-Tage-Mahlzeitenplan, 6 Grundregeln, Einkaufsliste, Ernährungsfokus pro Woche
- **Fortschritt**: Taille und Gewicht eintragen, Verlaufsdiagramme, Trainingsverlauf, Einstellungen
- **Wissen**: Was beim Bauchfett wirklich zählt
- Offline-fähig als PWA (Service Worker, Manifest), alle Daten bleiben lokal im Browser

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # Produktions-Build nach dist/
npm run preview
```

## In Lovable nutzen

1. In Lovable ein neues Projekt anlegen und **GitHub verbinden**, oder dieses Repository über „Import from GitHub“ einbinden.
2. Alternativ den Inhalt des Zips in ein leeres Lovable-Projekt (per GitHub-Sync) kopieren. Die Medien liegen unter `public/media/`.
3. Lovable erkennt `package.json`, `vite.config.ts` und `src/` automatisch.

## Struktur

```
index.html              Einstieg (Vite)
public/manifest.webmanifest, public/sw.js
public/media/videos/    12 Übungsvideos (mp4, 1:1, 5 s)
public/media/posters/   Vorschaubilder
public/media/audio/     32 Sprachclips (Anleitung + Kurzansage je Übung, allgemeine Ansagen)
src/data/               Übungen, Programm & Wochenziele, Ernährungsplan, Wissen
src/lib/                Zustand (localStorage), Audio-Engine, Hilfsfunktionen
src/components/         Ansichten, Player, Diagramm, Tab-Leiste
```

## Hinweis

Das Programm ersetzt keine ärztliche Beratung. Bei Rückenbeschwerden, Schwangerschaft, nach einer Geburt oder bei Herz-Kreislauf-Erkrankungen vorher ärztlich abklären.
