# ChainPepu in Lovable importieren

Lovable-Projekte sind Vite + React + Tailwind mit Supabase als Backend – genau so ist dieses Repository aufgebaut.

## Variante A – GitHub-Sync (empfohlen)

1. In Lovable ein neues, leeres Projekt anlegen.
2. **Settings → GitHub → Connect**: Lovable erstellt ein Repository für das Projekt.
3. Dieses Repository lokal klonen, Inhalt löschen (`.git` behalten) und alle Dateien aus diesem Repo bzw. aus `release/chainpepu-lovable.zip` hineinkopieren.
4. Committen und pushen. Lovable übernimmt den Code automatisch und baut die Vorschau neu.

## Variante B – ZIP

1. `npm run zip` erzeugt `release/chainpepu-lovable.zip`.
2. Lovable hat keinen direkten ZIP-Upload; die ZIP wird wie in Variante A Schritt 3 in das mit Lovable verbundene Repository entpackt und gepusht.

## Supabase verbinden

1. Lovable → **Supabase → Connect project**. Lovable setzt `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` automatisch.
2. Schema anlegen: `supabase/migrations/20261101000000_init.sql` im Supabase **SQL-Editor** ausführen (optional danach `..._cron.sql`). Alternativ die Datei in den Lovable-Chat geben: „Führe diese Migration aus“.
3. Supabase **Authentication → Providers**: **Email** und **Anonymous sign-ins** aktivieren.
4. Edge Functions deployen (Lovable macht das automatisch; manuell: `supabase functions deploy`).
5. Secrets aus `supabase/functions/.env.example` setzen (Lovable → Supabase → Edge Function Secrets). Alles optional – ohne Keys läuft die Plattform im Sandbox-Modus:
   - `ANTHROPIC_API_KEY` – KI-Persönlichkeiten, Chat, Foto-/Prompt-Genesis, Kreaturen-Gespräche
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` – echte Zahlungen (Webhook: `https://<ref>.supabase.co/functions/v1/stripe-webhook`)
   - `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` – TikTok-Login + Content-Analyse (Redirect: `https://<ref>.supabase.co/functions/v1/tiktok-auth?action=callback`)
   - `ALLOW_FREE_HATCH` – `true` für Demos, `false` in Produktion

## Lebenssimulation planen

Der Verfall wird bei jedem Laden einer Kreatur nachgerechnet. Damit Kreaturen auch unbeobachtet sterben und Quests rotieren, `pg_cron` aktivieren und `supabase/migrations/20261101000001_cron.sql` ausführen – oder `POST /functions/v1/tick` alle 10–15 Minuten von einem externen Cron aufrufen.
