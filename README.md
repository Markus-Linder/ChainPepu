# ChainPepu – die begehbare Suchmaschine

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
| Ins Bild klicken: Maus fangen | Wischen: umsehen |
| W A S D / Pfeiltasten: laufen | ▲ ▼: laufen |
| Shift: schneller | Antippen: Webseite öffnen |
| E oder Klick: Webseite betreten | |

## Wie es funktioniert

- **WebGL (Three.js):** Straße, Gebäude, Licht, Schatten, ACES-Tonemapping. Himmel
  und Spiegelungen kommen aus einem 360°-Panorama.
- **CSS3D-Ebene:** Die echten Webseiten liegen als iframes unter der WebGL-Szene.
  WebGL stanzt an den Bildschirmen durchsichtige Löcher, deshalb verdecken Laternen
  davor die Seite korrekt.
- **Live oder Vorschau:** Weit entfernte Seiten erscheinen als Screenshot. Die vier
  nächsten werden live geladen, sofern die Seite Einbettung erlaubt (Prüfung über
  `/api/frameable`).
- **Texturen:** Himmel-Panorama (4K), Pflaster und Fassade wurden mit Higgsfield
  (GPT Image 2.6) erzeugt und liegen in `public/assets/`.

## Grenzen

- Viele große Seiten (Google, Amazon, YouTube …) verbieten das Einbetten per
  `X-Frame-Options`. Bei ihnen bleibt der Screenshot stehen, und „Betreten“ öffnet
  einen neuen Tab.
