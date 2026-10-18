# ChainPepu für Lovable

Dieselbe Plattform wie im Hauptordner, aber auf dem Stack, den Lovable benutzt:
**Vite + React + TypeScript + Tailwind**, Backend über **Supabase** (Postgres, Auth, Storage, Edge Functions).

Damit sind die Skalierungsfragen vom Start weg gelöst: Postgres mit automatischen Backups,
Bilder im Objektspeicher statt auf dem App-Server, zustandsloses Frontend.

## So bringst du das in Lovable

**1. Projekt in Lovable anlegen**
Neues Projekt erstellen. Den Text aus `LOVABLE_PROMPT.md` als ersten Prompt einfügen. Lovable baut daraus die Grundstruktur.

**2. Supabase verbinden**
In Lovable oben rechts auf Supabase klicken und ein Projekt verbinden (neu oder bestehend). Lovable legt dabei
`src/integrations/supabase/client.ts` und die Umgebungsvariablen selbst an.

**3. Datenbank einrichten**
Die beiden Dateien aus `supabase/migrations/` nacheinander an Lovable geben mit der Bitte, sie als
Migration auszuführen. Alternativ: im Supabase-Dashboard unter *SQL Editor* einfügen und ausführen.
- `20261017000000_chainpepu.sql`: Tabellen, Sichten, Zeilensicherheit (RLS), Grundfunktionen, Bild-Bucket
- `20261018000000_creator_features.sql`: Videos, Folgen, Mitteilungen, Spenden (80/20), Auszahlungen, Meldungen, Moderation, Wortfilter, Video-Bucket

**4. Code übernehmen**
Die Dateien aus `src/` in das Lovable-Projekt übernehmen. Am einfachsten über GitHub:
In Lovable *GitHub verbinden*, dann die Dateien in das von Lovable angelegte Repository pushen.
Lovable zieht Änderungen aus GitHub automatisch nach.
Wenn Lovable schon ein `src/integrations/supabase/client.ts` angelegt hat, dessen Version behalten.

**5. E-Mail-Bestätigung (für Tests)**
Im Supabase-Dashboard unter *Authentication → Providers → Email* die Option *Confirm email* ausschalten,
damit Nutzer beim Testen sofort drin sind. Für den echten Start wieder einschalten.

**6. Moderation einrichten**
- Moderatoren ernennen: `update profiles set is_moderator = true where username = 'dein_name';`
- Wortfilter pflegen: Tabelle `banned_terms` im Supabase-Dashboard.
- KI-Prüfung (optional, empfohlen): Funktion `supabase/functions/moderate-content` deployen, Secrets
  `ANTHROPIC_API_KEY` und `MODERATION_WEBHOOK_SECRET` setzen. Dann im Supabase-Dashboard unter
  *Database → Webhooks* einen Webhook anlegen: Tabelle `links`, Ereignis *Insert*, Ziel die URL der Funktion,
  HTTP-Header `x-webhook-secret` mit demselben Geheimnis. Jedes neue Glied wird damit automatisch geprüft.

**7. Stripe (optional, später)**
- In Supabase unter *Edge Functions → Secrets* setzen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Die beiden Funktionen aus `supabase/functions/` deployen (Lovable kann das, oder `supabase functions deploy`).
- In Stripe einen Webhook auf `https://DEIN-PROJEKT.supabase.co/functions/v1/stripe-webhook` für das Ereignis `checkout.session.completed` anlegen.
- Demo-Modus ausschalten: `update app_settings set value = 'false' where key = 'demo_mode';`

## Was die Plattform kann

- Planeten, Ketten, Glieder mit Text, Bild oder **Video**, Universumskarte, Tages-Ereignis, Einladungen
- **Ganze Kette ansehen**: Vollbild-Abspielmodus, Videos laufen automatisch, wischen oder Pfeiltasten
- **Creators folgen** mit Mitteilungen bei neuer Kette, neuem Glied, Spende und neuem Follower
- **Spenden**: Sterne an den Creator einer Kette. 80 % für den Creator, 20 % für die Plattform
  (Prozentsatz in `app_settings.creator_share_percent`). Gespendete Sterne stehen auf der Startseite an der Kette.
- **Auszahlung**: verdiente Sterne ab Mindestbetrag (`payout_min_stars`) zum Kurs `star_cents` anfordern
  oder selbst als Sterne nutzen. Auszahlungsanfragen landen in `payouts`, die Überweisung macht ihr manuell.
- **Inhaltsregeln**: Regelseite, Zustimmung bei Registrierung, Wortfilter in der Datenbank, Melden pro Glied,
  automatisches Verbergen ab 3 Meldungen, Moderationsseite, optionale KI-Prüfung über Claude.

## Lokal ausprobieren

```bash
npm install
cp .env.example .env    # Supabase-URL und Anon-Key eintragen
npm run dev             # http://localhost:8080
```

## Aufbau

```
supabase/migrations/     Datenbank: Tabellen, RLS, Funktionen, Bild-Bucket
supabase/functions/      Stripe Checkout und Webhook (Deno Edge Functions)
src/integrations/        Supabase-Client (Lovable-Konvention)
src/lib/api.ts           Alle Datenzugriffe. Lesen direkt, Schreiben über Datenbank-Funktionen
src/lib/auth.tsx         Anmeldezustand und Profil
src/lib/planet.ts        Planeten-Aussehen und Position im Universum
src/lib/events.ts        Tages-Ereignis
src/components/          Karte, Planet, Formulare, Navigation
src/pages/               Alle Seiten
```

## Sicherheitsmodell

Das Frontend darf nur lesen. Jedes Schreiben (Kette starten, Glied anhängen, boosten, Skin kaufen,
Einladung einlösen) läuft über Postgres-Funktionen, die mit erhöhten Rechten laufen und selbst prüfen,
wer angemeldet ist und ob genug Sterne da sind. So kann niemand über die Browser-Konsole
Sterne manipulieren. Bilder landen in einem eigenen Ordner pro Nutzer im Storage-Bucket.
