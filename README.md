# ChainPepu – die begehbare Suchmaschine

**Live:** https://chainpepu.higgsfield.app

Statt einer Ergebnisliste läufst du durch eine fotorealistische 3D-Straße.
Jedes Suchergebnis ist ein Gebäude mit einem großen Bildschirm. Darauf läuft
die echte Webseite, und zwar live, sobald du in die Nähe kommst.

## Starten

```bash
npm start
```

Danach http://localhost:8080 öffnen. Es werden keine Abhängigkeiten installiert, Node 18 oder neuer reicht.

### Echte Websuche statt Wikipedia

Ohne API-Schlüssel sucht ChainPepu in Wikipedia. Für Ergebnisse aus dem ganzen
Web kannst du einen (kostenlosen) Brave-Search-API-Schlüssel setzen:

```bash
BRAVE_API_KEY=dein_schluessel npm start
```

## Steuerung

| Desktop | Handy |
|---|---|
| Klick auf eine Webseite: hineingehen | Antippen einer Webseite: hineingehen |
| Klick auf den Boden: dorthin laufen | Antippen des Bodens: dorthin laufen |
| Ziehen: umsehen | Wischen: umsehen |
| Mausrad, W A S D, Pfeiltasten: laufen | ▲ ▼: laufen |
| ☾ / ☀ oben rechts: Nacht oder Tag | ☾ / ☀ oben rechts: Nacht oder Tag |

## Wie es funktioniert

- **WebGL (Three.js):** Straße, Gebäude, Licht, Schatten, ACES-Tonemapping. Himmel
  und Spiegelungen kommen aus einem 360°-Panorama.
- **CSS3D-Ebene:** Die echten Webseiten liegen als iframes unter der WebGL-Szene.
  WebGL stanzt an den Bildschirmen durchsichtige Löcher, deshalb verdecken Laternen
  davor die Seite korrekt.
- **Live oder Vorschau:** Weit entfernte Seiten erscheinen als Screenshot. Die vier
  nächsten werden live geladen, sofern die Seite Einbettung erlaubt (Prüfung über
  `/api/frameable`).
- **Mit Higgsfield erzeugt** (liegt in `public/world/assets/`):
  - zwei 360°-Panoramen (Sonnenuntergang und Nacht), Pflaster, vier Fassaden (GPT Image 2.6)
  - 3D-Modelle: Platane, Pariser Laterne, Parkbank, zwei Passanten mit Laufanimation (Meshy 6),
    mit glTF-Transform auf je ca. 1 MB komprimiert
- **Tag und Nacht** richten sich nach der Uhrzeit des Besuchers.
- **Hosting:** Die Live-Seite läuft als Higgsfield-Website (Cloudflare Worker).
  Dort übernehmen die Server-Routen `/api/search` und `/api/frameable` die Aufgaben von `server.js`.

## Grenzen

- Viele große Seiten (Google, Amazon, YouTube …) verbieten das Einbetten per
  `X-Frame-Options`. Bei ihnen bleibt der Screenshot stehen, und „Betreten“ öffnet
  einen neuen Tab.
