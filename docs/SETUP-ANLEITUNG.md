# kistack.io – Schritt-für-Schritt-Anleitung (für Einsteiger)

Du brauchst keine Programmierkenntnisse. Alles, was Code ist, liegt fertig in diesem Repository.
Du legst fünf Konten an, trägst vier Werte in eine Datei ein und verbindest die Domain. Gesamtaufwand:
ein Nachmittag. Kosten im ersten Monat: 0 Euro (alle Dienste haben kostenlose Stufen, Lemon Squeezy nimmt
nur eine Gebühr pro Verkauf).

## Überblick: Was wo läuft

| Baustein | Dienst | Warum dieser |
|---|---|---|
| Website | Cloudflare Pages | kostenlos, schnell, Domain-Anbindung in 2 Minuten, baut automatisch bei jedem Git-Push |
| Newsletter + Starter-Kit-Versand | Buttondown | einfach, DSGVO-tauglich mit Double-Opt-in, kostenlos bis 100 Abonnenten, danach ab 9 USD |
| Bezahlung Pro Kit | Lemon Squeezy | "Merchant of Record": übernimmt US Sales Tax, EU-Umsatzsteuer und Rechnungen, liefert die Datei automatisch aus |
| Anfrageformular Review-Service | Tally | kostenlos, Formular in 5 Minuten, Antworten per E-Mail |
| Statistik (optional) | Plausible | ohne Cookies, kein Banner nötig; 9 USD/Monat, kann auch wegbleiben |

## Schritt 0: Hypothese prüfen (5 Minuten)

Google Search Console öffnen → Leistung → Suchanfragen. Wenn dort "kistack", "ki stack" oder "kistack kicad"
stehen und der Traffic Anfang September 2026 begonnen hat, stimmt die Annahme hinter diesem Projekt.
Falls du keine Search Console hast: unter https://search.google.com/search-console die Domain anlegen,
per DNS-TXT-Eintrag verifizieren. Daten laufen ab dann auf.

## Schritt 1: Website auf Cloudflare Pages (20 Minuten)

1. Konto auf https://dash.cloudflare.com anlegen.
2. Links "Workers & Pages" → "Create" → "Pages" → "Connect to Git" → GitHub verbinden → Repository
   `Markus-Linder/ChainPepu` auswählen.
3. Build-Einstellungen:
   - Production branch: `main` (oder der Branch, auf dem dieser Stand liegt)
   - Build command: *leer lassen*
   - Build output directory: `site`
4. "Save and Deploy". Nach etwa einer Minute hast du eine Adresse wie `chainpepu.pages.dev`. Öffnen und prüfen.
5. Domain anbinden: im Pages-Projekt "Custom domains" → "Set up a custom domain" → `kistack.io` eintragen.
   - Liegt die Domain schon bei Cloudflare: fertig, DNS wird automatisch gesetzt.
   - Liegt sie woanders (z. B. IONOS, Strato, Namecheap): entweder Nameserver auf Cloudflare umstellen
     (empfohlen, Cloudflare zeigt dir die zwei Nameserver an), oder beim Registrar einen CNAME `kistack.io`
     → `chainpepu.pages.dev` setzen. Zusätzlich `www` als zweite Custom Domain eintragen.
6. Deine bisherige KI-Abo-Seite: Wenn du sie behalten willst, lege sie unter einer eigenen Subdomain ab
   (z. B. `app.kistack.io` oder `de.kistack.io`). Sie bringt keinen US-Traffic und würde die neue Seite verwässern.

## Schritt 2: Newsletter mit Buttondown (20 Minuten)

1. Konto auf https://buttondown.com anlegen. Benutzername merken (z. B. `kistack`).
2. Settings → "Subscribing" → Double opt-in einschalten (Pflicht für DSGVO).
3. Settings → "Tags": drei Tags anlegen: `starter-kit`, `weekly`, `review-waitlist`. Die Formulare auf der
   Website setzen diese Tags automatisch, so siehst du, woher jemand kommt.
4. Willkommens-E-Mail (Settings → "Emails" → "Welcome email"): Text auf Englisch, mit dem Download-Link
   `https://kistack.io/downloads/kicad-agent-starter-kit.zip`. Vorschlag:

   > Subject: Your KiCad Agent Starter Kit
   >
   > Here's the kit: https://kistack.io/downloads/kicad-agent-starter-kit.zip
   > Unzip into your KiCad project folder, copy CLAUDE.md to AGENTS.md if you use Codex or OpenCode,
   > fill the TODO lines, and ask your agent to run docs/REVIEW-CHECKLIST.md.
   > Reply to this email with what broke or what you wish it did. I read every reply.

5. Trage in `site/assets/config.js` ein: `BUTTONDOWN_USERNAME: "kistack"` (dein Name).

## Schritt 3: Pro Kit verkaufen mit Lemon Squeezy (45 Minuten)

1. Konto auf https://lemonsqueezy.com anlegen, Store einrichten, Auszahlung (Bank/PayPal) und Steuerdaten
   hinterlegen. Lemon Squeezy ist Merchant of Record: Käufer kaufen rechtlich von Lemon Squeezy, du bekommst
   die Auszahlung. Damit musst du dich nicht um US Sales Tax oder EU-OSS kümmern.
2. Die Kit-Datei bauen. Im Repository-Ordner im Terminal:
   ```
   bash scripts/build.sh
   ```
   Das erzeugt `dist/kistack-pro-kit-<datum>.zip`. (Terminal nicht vorhanden? Das kann ich für dich machen,
   die Datei liegt dann im Ordner `dist/`, den du herunterlädst.)
3. Products → "New product": Name `KiStack Pro Kit`, Preis 29 USD (später 39), Typ "Single payment".
   Unter "Files" die Zip-Datei hochladen. Lemon Squeezy schickt nach dem Kauf automatisch den Download-Link.
   Refund-Policy: 14 Tage, so steht es auf der Seite.
4. Zweites Produkt: `KiStack Pro Kit – Team licence (5 seats)`, 99 USD, dieselbe Datei.
5. Für jedes Produkt: "Share" → "Checkout link" kopieren. In `site/assets/config.js` eintragen:
   `LEMON_PRO_KIT_URL` und `LEMON_PRO_KIT_TEAM_URL`.
6. Updates: Wenn du eine neue Kit-Version baust, einfach die Datei im Produkt ersetzen. Alle bisherigen
   Käufer bekommen über ihren alten Link automatisch die neue Datei.

## Schritt 4: Review-Anfrageformular mit Tally (15 Minuten)

1. Konto auf https://tally.so anlegen, "Create form". Felder:
   Name, E-Mail, Board-Typ (Auswahl: 2-layer / 4-layer / 6+ layer, RF, power), Fab (Auswahl),
   Stückzahl, "What worries you most about this board?" (Text), Upload (optional, KiCad-Projekt als Zip),
   Checkbox "I understand this is a review, not a design sign-off".
2. Settings → Notifications → E-Mail an dich bei jeder Antwort.
3. "Share" → Link kopieren → in `site/assets/config.js` unter `REVIEW_INTAKE_URL` eintragen.
4. Wenn eine Anfrage kommt: Preis laut Tabelle auf der Review-Seite nennen, Rechnung über Lemon Squeezy
   (Produkt "Pre-Fab Review" mit variablem Preis anlegen) oder normale Rechnung. Die Review selbst:
   `kistack-review` auf das Projekt laufen lassen, dann die 37-Punkte-Checkliste mit einem Agenten
   durchgehen, dann die Ergebnisse selbst oder mit einem Elektronik-Freelancer prüfen. Die ersten
   fünf Reviews kannst du mir als Agent überlassen und die Berichte gegenlesen lassen.

## Schritt 5: Konfiguration eintragen und veröffentlichen (10 Minuten)

Datei `site/assets/config.js` öffnen (auf GitHub direkt im Browser: Datei anklicken → Stift-Symbol):

```js
window.KISTACK = {
  BUTTONDOWN_USERNAME: "kistack",
  LEMON_PRO_KIT_URL: "https://kistack.lemonsqueezy.com/checkout/buy/xxxxxxxx",
  LEMON_PRO_KIT_TEAM_URL: "https://kistack.lemonsqueezy.com/checkout/buy/yyyyyyyy",
  REVIEW_INTAKE_URL: "https://tally.so/r/zzzzzz",
  CONTACT_EMAIL: "hello@kistack.io",
  PLAUSIBLE_DOMAIN: ""
};
```

Speichern = Commit. Cloudflare Pages baut die Seite in einer Minute neu.

## Schritt 6: Rechtliches (30 Minuten, nicht überspringen)

- `site/imprint/index.html`: deine Adresse eintragen (Pflicht in Deutschland, auch bei englischer Seite).
- `site/privacy/index.html`: enthält nur eine Liste dessen, was die Seite technisch tut. Erzeuge eine echte
  Datenschutzerklärung (z. B. e-recht24.de, auf Englisch) und ersetze den Text.
- Eine E-Mail-Adresse auf der Domain (z. B. `hello@kistack.io`): Cloudflare "Email Routing" leitet kostenlos
  an dein Gmail weiter.

## Schritt 7: Die ersten 14 Tage

1. **Tag 1:** Seite live, Search Console prüfen, Buttondown-Testabo mit eigener Adresse machen, Testkauf
   des Pro Kits mit Lemon Squeezy "Test mode" durchspielen.
2. **Tag 2:** American-Embedded auf GitHub ein Issue oder eine E-Mail schreiben. Vorlage:

   > Subject: kistack.io – want to link to your project
   >
   > Hi, I own kistack.io (registered January 2026) and noticed people searching for your KiStack
   > project land there. I've turned the site into an independent guide to KiCad agent tooling that links to
   > your repo as the first install option. If you'd like, I can host docs or a landing page for the project
   > there, add a "maintained by American-Embedded" badge, or hand you a subdomain. Happy to have a call.
   > The site makes clear it's independent. Let me know if anything on it misrepresents your project.

3. **Tag 3 bis 7:** Jeden Tag einen kurzen englischen Beitrag: Reddit r/KiCad und r/PrintedCircuitBoard
   (Regeln lesen, kein reines Werben: Starter Kit verschenken, nach Feedback fragen), EEVblog-Thread
   "Claude Code for pcb design", Hacker News "Show HN" mit dem Starter Kit.
4. **Tag 7:** Erste Newsletter-Ausgabe: drei Links zu neuen KiCad-Agent-Tools, eine Erkenntnis von dir.
5. **Tag 14:** Zahlen anschauen. Besucher, Opt-in-Rate (Ziel 15 %), Verkäufe (Ziel 5), Review-Anfragen (Ziel 1).
   Danach entscheiden wir, ob das gehostete Review-Tool gebaut wird.

## Was du mir überlassen kannst

Alles im Repository: Texte ändern, neue Fab-Profile, neue Board-Klassen, Blogartikel für Suchbegriffe
("kicad claude code", "kicad mcp server", "kicad ai agent"), das gehostete Review-Tool, Newsletter-Entwürfe.
Sag mir einfach, was ansteht.
