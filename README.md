# StepInShop · Begehbare 3D-Shops

Verkaufsfertige Demo und Landingpage für ein Angebot aus begehbaren 3D-Shops: Kundinnen und Kunden gehen im Browser durch einen Laden, klicken Produkte an, wechseln Varianten und legen in den Warenkorb.

## Inhalt

| Datei | Zweck |
| --- | --- |
| `index.html` | Landingpage der Marke StepInShop (Leistungen, Ablauf, Pakete, FAQ, Kontakt) |
| `demo/index.html` | Begehbarer Demo-Shop „Atelier Nord“ (Three.js, First-Person, 8 Produkte) |
| `DOMAINS.md` | Domain-Recherche mit Verfügbarkeitsprüfung (Stand 30.10.2026) |

Beide Seiten sind reine HTML-Dateien ohne Build-Schritt. Three.js und die Schriften kommen per CDN.

## Lokal ansehen

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080/` (Landingpage) oder `http://localhost:8080/demo/` (Shop) öffnen. Pointer-Lock für die Maussteuerung braucht einen echten Server oder `file://` in Chrome.

## Demo-Shop: Funktionen

- First-Person-Steuerung: WASD/Pfeiltasten, Maus, Shift zum Laufen; auf Touch-Geräten Joystick plus Wischen
- Kollision mit Wänden, Podesten und Tresen, leichte Kopfbewegung beim Gehen
- 8 prozedural gebaute Produkte auf Podesten, Preisschilder erscheinen beim Näherkommen
- Produktpanel mit Beschreibung, Specs und Farbvarianten, die das 3D-Objekt sofort umfärben
- Warenkorb mit Mengen, Summe und Demo-Checkout
- Geführter Rundgang (Kamerafahrt an allen Produkten vorbei)
- Minimap, Neon-Schriftzug mit Flackern, Tageslichtfenster, Staubpartikel, echte Uhrzeit auf der Wanduhr
- Läuft ohne Assets: Boden- und Schildtexturen werden zur Laufzeit gezeichnet

## Anpassen

- Produkte: im Block `/* ---------- Products ---------- */` in `demo/index.html`. Jedes Produkt hat Name, Kategorie, Preis, Text, Specs, Varianten und die Meshes, die umgefärbt werden.
- Raumgröße: Konstante `ROOM` (Breite, Tiefe, Höhe in Metern).
- Marke: Schriftzug im Canvas `neonTex` und im HUD oben links.
- Checkout: `checkoutBtn` ruft aktuell nur einen Hinweis auf. Hier den Warenkorb an Shopify, Shopware oder WooCommerce übergeben.
- Landingpage: Preise im Abschnitt `#pakete`, E-Mail-Adresse `hallo@stepinshop.com` im Abschnitt `#kontakt` ersetzen, sobald die Domain registriert ist.
