# Importing ChainPepu into Lovable

Lovable projects are Vite + React + Tailwind apps with Supabase as the backend – exactly how this repository is structured, so no conversion is needed.

## Option A – GitHub sync (recommended, keeps everything in sync)

1. In Lovable, create a new (empty) project.
2. Open **Settings → GitHub → Connect** and let Lovable create the repository for the project.
3. On your machine, clone that new repository, delete its contents (keep `.git`) and copy everything from this repository (or unzip `release/chainpepu-lovable.zip`) into it.
4. Commit and push. Lovable picks the code up within seconds; the preview rebuilds automatically.

## Option B – ZIP

1. Run `npm run zip` here → `release/chainpepu-lovable.zip`.
2. Lovable has no direct "upload ZIP" button, but any repository connected to Lovable can be replaced with the ZIP contents as in Option A step 3 – or ask Lovable's chat to "pull the latest from GitHub" after you pushed.

## Connect Supabase

1. Lovable → **Supabase → Connect project** (or create a new one). Lovable writes `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` into the project automatically; `src/integrations/supabase/client.ts` already reads them.
2. Apply the schema: open the Supabase **SQL editor** and run `supabase/migrations/20261101000000_init.sql` (then optionally `..._cron.sql`). You can also paste it into Lovable's chat and say *"run this migration"*.
3. Supabase **Authentication → Providers**: enable **Email** and **Anonymous sign-ins**.
4. Deploy edge functions. Lovable deploys everything under `supabase/functions/` automatically when Supabase is connected; manually it is:
   ```bash
   supabase link --project-ref <ref>
   supabase functions deploy
   supabase secrets set --env-file supabase/functions/.env
   ```
5. Secrets (Lovable → Supabase → Edge Function Secrets, or the CLI): copy `supabase/functions/.env.example`. Everything is optional – without keys the app runs in sandbox mode.

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude personalities, chat, photo/prompt genesis, creature conversations |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Real payments. Webhook URL: `https://<ref>.supabase.co/functions/v1/stripe-webhook` |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok login + content analysis. Redirect URI: `https://<ref>.supabase.co/functions/v1/tiktok-auth?action=callback` |
| `ALLOW_FREE_HATCH` | `true` for demos (hatch without subscription), `false` in production |
| `CRON_SECRET` | Protects the `tick` function when called by an external scheduler |

## Scheduling the life simulation

Decay is applied lazily whenever a creature is loaded, so the game works with no scheduler at all. For deaths/quests to progress while nobody is watching, enable `pg_cron` and run `supabase/migrations/20261101000001_cron.sql`, or call `POST /functions/v1/tick` every 10–15 minutes from any cron service.

## Talking to Lovable about this code

Useful prompts once imported:
- "Add Spanish to `src/lib/i18n` following `de.ts`."
- "Add a new food item `sushi` to `supabase/functions/_shared/catalog.ts` and the dictionaries."
- "Change the creator revenue share to 85 % in `supabase/functions/_shared/economy.ts`."
