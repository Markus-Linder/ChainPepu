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
Den Inhalt von `supabase/migrations/20261017000000_chainpepu.sql` an Lovable geben mit der Bitte,
diese Migration auszuführen. Alternativ: im Supabase-Dashboard unter *SQL Editor* einfügen und ausführen.
Die Datei enthält Tabellen, Sichten, Zeilensicherheit (RLS), alle Funktionen und den Bild-Bucket.

**4. Code übernehmen**
Die Dateien aus `src/` in das Lovable-Projekt übernehmen. Am einfachsten über GitHub:
In Lovable *GitHub verbinden*, dann die Dateien in das von Lovable angelegte Repository pushen.
Lovable zieht Änderungen aus GitHub automatisch nach.
Wenn Lovable schon ein `src/integrations/supabase/client.ts` angelegt hat, dessen Version behalten.

**5. E-Mail-Bestätigung (für Tests)**
Im Supabase-Dashboard unter *Authentication → Providers → Email* die Option *Confirm email* ausschalten,
damit Nutzer beim Testen sofort drin sind. Für den echten Start wieder einschalten.

**6. Stripe (optional, später)**
- In Supabase unter *Edge Functions → Secrets* setzen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Die beiden Funktionen aus `supabase/functions/` deployen (Lovable kann das, oder `supabase functions deploy`).
- In Stripe einen Webhook auf `https://DEIN-PROJEKT.supabase.co/functions/v1/stripe-webhook` für das Ereignis `checkout.session.completed` anlegen.
- Demo-Modus ausschalten: `update app_settings set value = 'false' where key = 'demo_mode';`

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
