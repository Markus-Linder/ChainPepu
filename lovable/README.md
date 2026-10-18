# ChainPepu für Lovable

Dieselbe Plattform wie im Hauptordner, aber auf dem Stack, den Lovable benutzt:
**Vite + React + TypeScript + Tailwind**, Backend über **Supabase** (Postgres, Auth, Storage, Edge Functions).

Damit sind die Skalierungsfragen vom Start weg gelöst: Postgres mit automatischen Backups,
Bilder und Videos im Objektspeicher statt auf dem App-Server, zustandsloses Frontend.

## Was die Plattform kann

- **Planeten, Ketten, Glieder** mit Text, Foto oder **Video** (bis 3 Minuten, 100 MB), Universumskarte, Tages-Ereignis, Einladungen
- **Antworten**: Unter jedem Glied können alle miteinander schreiben (Gespräch in der Kette)
- **Themen von Creators**: Ein Creator gibt ein Motto mit Beschreibung und Laufzeit (1–14 Tage) vor. Themen leuchten pink auf der Karte und stehen auf der Startseite
- **Sterne sichtbar im Universum**: Gespendete Sterne und Boosts werden als Plakette direkt an der Kette auf der Karte angezeigt
- **Spenden 80/20**: Von jeder Spende gehen 80 % an den Creator, 20 % an die Plattform (`app_settings.creator_share_percent`). Hinweis dazu auf der Startseite, im Shop und in den Regeln
- **Auszahlung** verdienter Sterne ab Mindestbetrag; alle Ketten eines Creators bleiben dauerhaft im Profil abrufbar (Archiv nach Jahren, durchsuchbar)
- **Prüfung VOR der Veröffentlichung**: Jeder Text, jedes Foto und jedes Video (als Standbilder) wird von Claude geprüft, bevor es sichtbar wird. Dazu Wortfilter, Melden, Prüfschwelle und Moderationsseite
- **Ketten-Duell (unser Live-Match)**: Ein Creator fordert mit einer eigenen Kette eine fremde Kette heraus (1 h bis 24 h). Nimmt der andere an, läuft das Duell live: jedes sichtbare Glied bringt 5 Punkte, jede Antwort 2, jeder gespendete Stern zählt doppelt. Arena-Seite `/duel/:id` mit Tauziehen-Balken, Countdown und Live-Ticker (Supabase Realtime). Die Gewinner-Kette bekommt eine Krone ♛ (auf Karte, Karten und Kettenseite sichtbar), der Creator einen Duell-Sieg im Profil. Gegen Spam zählt pro Planet nur ein Glied pro Minute. Alle Werte in `app_settings` (`duel_*`) einstellbar
- **Paket A „Magnet“ (Leute von TikTok holen)**: Teilen-Clip (9:16-Story-Bild mit Planet, Zahlen und QR-Code, direkt ins Teilen-Menü des Handys), TikTok-/YouTube-/Instagram-Videos in Glieder einbetten (Link einfügen, lädt erst nach Tipp), Google-/Apple-Login mit anschließender Nutzernamen-Wahl, Konstellationen (wer über wen kam, als gepunktete Linien auf der Karte) mit Einladungs-Rangliste und Meilenstein-Boni (★100/500/1000), Abzweigen: von jedem Glied eine neue Kette starten, Ursprung bleibt verlinkt
- **Paket B „Sog“ (Bleiben)**: Der Strom `/stream` (vertikaler Wisch-Feed, Videos laufen im Blick automatisch, ★10 / Antworten / Abzweigen / Teilen direkt im Bild), Planeten-Entwicklung (XP für Glieder, Antworten und erhaltene Sterne → Level, Ringe, Monde, stärkeres Leuchten; Tages-Streak), Wochen-Challenge mit Preis-Topf (25 % des Plattform-Anteils der Woche gehen an die beste Kette, Abschluss automatisch), Push-Mitteilungen aufs Handy (Web Push, Edge Function `send-push`)
- **Paket C „Profi“**: Creator-Dashboard `/dashboard` (Sterne pro Tag, Reichweite, beste Uhrzeiten, Top-Ketten, Top-Fans, Auszahlungen), Ranglisten `/leaderboards` (Woche, Sterne, Kronen, Follower, Level, längste und reichste Ketten), Duell-Turniere `/tournaments` (4 oder 8 Ketten, K.-o.-Runden automatisch, Sieger bekommt 3 Kronen), Admin-Bereich `/admin` (Kennzahlen für Investoren, Auszahlungen bestätigen, Einstellungen live ändern, Moderatoren/Admins verwalten)
- **10 Sprachen**: Englisch, Deutsch, Spanisch, Französisch, Portugiesisch, Türkisch, Arabisch (rechts-nach-links), Hindi, Indonesisch, Japanisch. Automatische Erkennung, Umschalter in Navigation und Fußzeile. Tagesthemen und Mitteilungen werden übersetzt
- **Partner-Seite** `/about` für Investoren: Mechanik, Geschäftsmodell, Sicherheit, Technik, Live-Zahlen (nichts erfunden)
- **PWA**, eigenes Markendesign (Obsidian, Violett → Magenta, Champagner-Gold, Space Grotesk + Inter, eigenes Icon-Set)

## So bringst du das in Lovable

**1. Projekt in Lovable anlegen** — Text aus `LOVABLE_PROMPT.md` als ersten Prompt einfügen.

**2. Supabase verbinden** — Lovable legt `src/integrations/supabase/client.ts` und die Umgebungsvariablen selbst an.

**3. Datenbank einrichten** — die drei Dateien aus `supabase/migrations/` **nacheinander** ausführen (Lovable darum bitten oder im Supabase-Dashboard unter *SQL Editor*):
- `20261017000000_chainpepu.sql`: Tabellen, Sichten, RLS, Grundfunktionen, Bild-Bucket
- `20261018000000_creator_features.sql`: Videos, Folgen, Mitteilungen, Spenden (80/20), Auszahlungen, Meldungen, Moderation, Wortfilter, Video-Bucket
- `20261019000000_replies_topics_premoderation.sql`: Antworten, Creator-Themen, Prüf-Status `pruefung`, übersetzbare Mitteilungen
- `20261020000000_duels.sql`: Ketten-Duell (Tabellen `duels`, `duel_events`, Punkte-Trigger, Kronen, Realtime-Freigabe)
- `20261021000000_magnet.sql`: eingebettete Videos, Abzweigen, Nutzername nach OAuth, Konstellationen, Einladungs-Boni
- `20261022000000_sog.sql`: XP/Level/Streaks, Wochen-Challenge (`settle_week`, `week_pool`), Push-Abos
- `20261023000000_profi.sql`: Admin-Rolle und -Funktionen, Ranglisten-Sicht, Turniere

**Nach den Migrationen:** ersten Admin ernennen mit `update profiles set is_admin = true, is_moderator = true where username = 'dein_name';`

**Google/Apple-Login:** im Supabase-Dashboard unter *Authentication → Providers* Google (Client-ID/Secret aus der Google Cloud Console) und optional Apple aktivieren. Die Buttons sind schon in der App.

**Push-Mitteilungen:** `npx web-push generate-vapid-keys` ausführen. Öffentlichen Schlüssel als `VITE_VAPID_PUBLIC_KEY` in die App-Umgebung, privaten + öffentlichen Schlüssel und `VAPID_SUBJECT` (mailto:…) als Secrets der Funktion `send-push`. Dann im Supabase-Dashboard einen Datenbank-Webhook auf `notifications` (Insert) → `send-push` anlegen.

**4. Code übernehmen** — die Dateien aus `src/`, `public/` und `index.html` in das Lovable-Projekt übernehmen, am einfachsten über GitHub (Lovable zieht Änderungen automatisch nach). Wenn Lovable schon ein `src/integrations/supabase/client.ts` angelegt hat, dessen Version behalten.

**5. KI-Prüfung deployen (wichtig, sonst bleibt jeder Beitrag in der Warteschlange)**
- Funktion `supabase/functions/moderate-content` deployen, Secret `ANTHROPIC_API_KEY` setzen.
- Der Client ruft die Funktion direkt nach dem Absenden auf (mit dem Login des Autors) und wartet bis zu 25 Sekunden auf das Urteil. Zusätzlich empfohlen: im Supabase-Dashboard unter *Database → Webhooks* je einen Webhook für `links` und `replies` (Ereignis *Insert*) auf die Funktion legen, Header `x-webhook-secret` = Secret `MODERATION_WEBHOOK_SECRET`. Dann wird auch geprüft, wenn der Nutzer die Seite sofort schließt.
- Ohne KI-Prüfung: `update app_settings set value = 'aus' where key = 'premoderation';` — dann ist alles sofort sichtbar (nur Wortfilter), Meldungen und Moderation bleiben.

**6. E-Mail-Bestätigung (für Tests)** — unter *Authentication → Providers → Email* *Confirm email* ausschalten, für den echten Start wieder einschalten.

**7. Moderation einrichten**
- Moderatoren ernennen: `update profiles set is_moderator = true where username = 'dein_name';`
- Wortfilter pflegen: Tabelle `banned_terms`.
- Seite `/moderation` zeigt wartende, gemeldete und gesperrte Glieder und Antworten (mit Begründung der KI und den Video-Standbildern).

**8. Stripe (optional, später)**
- Secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` setzen, Funktionen `create-checkout` und `stripe-webhook` deployen.
- Stripe-Webhook auf `https://DEIN-PROJEKT.supabase.co/functions/v1/stripe-webhook` für `checkout.session.completed`.
- Demo-Modus ausschalten: `update app_settings set value = 'false' where key = 'demo_mode';`

**9. Kontakt für Partner** — `src/lib/site.ts`: `CONTACT_EMAIL` eintragen, dann erscheint sie auf `/about`.

## Lokal ausprobieren

```bash
npm install
cp .env.example .env    # Supabase-URL und Anon-Key eintragen
npm run dev             # http://localhost:8080
```

Ohne echtes Supabase-Projekt startet die App mit Platzhaltern und zeigt das Design; Daten laden dann nicht.

## Aufbau

```
supabase/migrations/     Datenbank: Tabellen, RLS, Funktionen, Trigger, Buckets
supabase/functions/      moderate-content (KI-Prüfung), create-checkout + stripe-webhook (Stripe)
src/locales/             Sprachen (en, de, es, fr, pt), ein Schlüssel pro Text
src/lib/i18n.tsx         Spracherkennung, t()-Funktion, Umschalter
src/lib/api.ts           Alle Datenzugriffe. Lesen direkt, Schreiben über Datenbank-Funktionen
src/lib/moderation.ts    Video-Standbilder im Browser, Warten auf das Prüf-Urteil
src/lib/events.ts        Tages-Ereignis (Themen in 5 Sprachen), Anzeigetitel
src/lib/planet.ts        Planeten-Aussehen und Position im Universum
src/components/Icons.tsx Icon-Set und Logo
src/components/          Karte, Planet, Formulare, Glied mit Antworten, Navigation
src/pages/               Alle Seiten (Home, Today, Chains, Chain, PlanetPage, NewChain, Shop, Notifications, Moderation, Rules, About, Small)
public/brand/            Hero-Bild und Social-Preview (Higgsfield), icon.svg
```

Alte deutsche Pfade (`/heute`, `/ketten`, `/neu`, `/registrieren`, `/einladung/…`, `/mitteilungen`, `/regeln`) leiten auf die neuen englischen Pfade um.
