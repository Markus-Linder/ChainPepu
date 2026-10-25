# kistack.io in Lovable: Schritt für Schritt (keine Vorkenntnisse nötig)

## 1. Importieren (5 Minuten)
1. https://lovable.dev öffnen und einloggen.
2. Im Eingabefeld auf **+** klicken → **Import project to Lovable** → **Upload code** → diese Zip-Datei hochladen → **Start import**.
3. Warten, bis im Chat "migration complete" steht. Die Vorschau rechts zeigt die fertige Seite mit allen Unterseiten.

Falls das Design nach dem Import anders aussieht, diesen Satz in den Lovable-Chat kopieren:

> Restore the imported design exactly: dark PCB theme with copper accent from src/index.css and tailwind.config.ts, Inter and JetBrains Mono fonts, dot-grid background. Do not use a light theme or default component styles.

## 2. Anmeldungen speichern lassen (2 Minuten, ohne externes Konto)
Diesen Satz in den Lovable-Chat kopieren:

> Enable Lovable Cloud. Implement submitLead in src/lib/submit.ts so it inserts { kind, email, created_at } into a new table "leads" and returns { ok: true, message: "Thanks! Check your inbox shortly." }. Send me an email notification for every new row. Do not change any component.

Danach funktionieren alle drei Formulare (Starter Kit, Newsletter, Review-Warteliste) sofort. Die E-Mail-Adressen findest du in Lovable unter Cloud → Database → leads.

## 3. Starter-Kit-Versand automatisieren (optional, 2 Minuten)
> When a lead with kind "starter-kit" is inserted, send that email a message with subject "Your KiCad Agent Starter Kit" and the link https://kistack.io/downloads/kicad-agent-starter-kit.zip.

## 4. Review-Anfragen als eigenes Formular (optional, 3 Minuten)
> Create a page /review/request with a form (name, email, board type select: 2-layer / 4-layer / 6+ layers or RF or power, fab select: JLCPCB / PCBWay / OSH Park / Aisler / Eurocircuits / other, quantity, "what worries you most", checkbox "I understand this is a review, not a design sign-off"). Store it in a table "review_requests" in Lovable Cloud, email me on each submission, and set reviewIntakeUrl in src/config.ts to "/review/request" using an internal link. Match the existing design.

## 5. Bezahlung (sobald du verkaufen willst)
Konto bei https://lemonsqueezy.com anlegen, Produkt "KiStack Pro Kit" (29 USD) mit der Datei `kistack-pro-kit-*.zip` anlegen, Checkout-Link kopieren. Dann:

> In src/config.ts set lemonProKitUrl to "HIER-DEN-LINK-EINFÜGEN" and lemonProKitTeamUrl to "HIER-DEN-TEAM-LINK-EINFÜGEN".

Alternative ohne Lemon Squeezy: "Add Stripe checkout for the Pro Kit at $29 one-time and the team licence at $99 using Lovable's Stripe integration; deliver the download link after payment." Lovable fragt dich dann nach deinem Stripe-Konto.

## 6. Impressum und Kontakt (2 Minuten, Pflicht)
> Fill src/pages/Imprint.tsx with: NAME, STRASSE HAUSNUMMER, PLZ ORT, Germany, email HELLO@KISTACK.IO, VAT ID: UST-ID oder "not subject to VAT under § 19 UStG". Set contactEmail in src/config.ts to the same email.

Datenschutz: Die Seite /privacy ist nur ein technischer Entwurf. Lass dir bei e-recht24.de eine englische Datenschutzerklärung erzeugen und sag Lovable: "Replace the content of src/pages/Privacy.tsx with this text: …"

## 7. Veröffentlichen und Domain (10 Minuten)
1. Oben rechts **Publish**.
2. **Settings → Domains → Connect domain** → `kistack.io` eintragen.
3. Lovable zeigt dir DNS-Einträge. Diese bei deinem Domain-Anbieter eintragen (dort, wo du kistack.io gekauft hast). Nach 10 bis 60 Minuten ist die Seite live.

## Was danach noch zu tun ist
- Google Search Console prüfen, ob die Suchanfrage "kistack" den Traffic bringt.
- American-Embedded auf GitHub anschreiben (Vorlage in docs/SETUP-ANLEITUNG.md im Repository).
- Erste Newsletter-Ausgabe nach 7 Tagen.
