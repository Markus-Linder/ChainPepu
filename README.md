# ChainPepu

**Unique, living 3D AI companions for creators – hatched from TikTok content, a prompt or a photo.**
Fans feed, play, chat, gift and battle. Creators earn **80 %** of every gift. Built for [Lovable](https://lovable.dev) (Vite + React + Supabase).

> Deutsch: siehe [`docs/LOVABLE_IMPORT.de.md`](docs/LOVABLE_IMPORT.de.md) für die Schritt-für-Schritt-Anleitung zum Import in Lovable.

---

## What it does

| Area | Feature |
|---|---|
| **Genesis** | A creature is generated from the creator's TikTok videos, captions and hashtags (TikTok Login Kit + Display API), from a **free-text prompt**, from an **uploaded photo** (Claude vision), or from a sample profile. |
| **Uniqueness** | A SHA-256 genome hash with a `UNIQUE` constraint guarantees every design + personality exists exactly once. 8 body types × eyes × horns × ears × tails × wings × 7 skin patterns × procedural colours × proportions × animation genes. |
| **3D** | Fully procedural, animated React-Three-Fiber model (no asset downloads): breathing, mood-driven bounce, blinking, lip-sync while talking, idle behaviours unique per creature (spin, flex, dance, stargaze…), cosmetics (crown, shades, halo), sickness/sleep/death states. |
| **Life simulation** | Food, energy, mood, hygiene, health decay over real time (Postgres `tick_creature`). Neglect → sickness → death. Revive with a Phoenix Feather. XP & levels. |
| **Personality & memory** | Claude generates an archetype, voice, backstory, likes/dislikes, catchphrases. Every chat can create memories (facts, relationships, lessons). Traits drift with interactions → the creature *learns*. Replies in the visitor's language. |
| **Monetization** | €9.99/month Creator subscription + credit packs (Stripe Checkout; sandbox mode without keys). Gifts split **80/20** (creator/platform) in an auditable ledger. Owners buying for their own creature → 100 % platform. Battle stakes, revives, cosmetics, creature conversations. |
| **Battles & leaderboard** | Deterministic turn-based duels from DNA stats + level + condition. Elo rating, W/L, real health damage to the loser (can be fatal), optional credit stakes (1.8× payout), 15-minute cooldown, global leaderboard with care score. |
| **Quests** | 3 community + 2 creator quests per creature per day (feed ×3, win a battle, 25 visitors…). Rewards in XP and credits. |
| **Creature-to-creature chat** | Creatures talk to each other (owner-initiated or ambient via cron), form relationships (friends/rivals/crush…) and remember each other. Public transcripts. |
| **Creator dashboard** | Balance, today/30-day/lifetime earnings chart, gifts, top supporters, payout requests (≥ €20), inventory & shop, quests, battles, conversations, memory bank, settings, subscription status. |
| **Viral surface** | Public page `/c/<slug>` with 3D viewer, live gift feed (Supabase Realtime), chat, quests, share sheet. Works for anonymous visitors (Supabase anonymous auth). |
| **International** | English + German dictionaries (`src/lib/i18n`), locale auto-detection, `Intl` money/date formatting, creature replies in the visitor's language. Add a language by adding one file. |
| **White-label / acquisition-ready** | All branding in `src/config/brand.ts`, proprietary `LICENSE`, documented architecture, zero third-party trademarks or assets. |

## Stack

- **Frontend:** Vite 8, React 19, TypeScript, Tailwind 3, React Router 7, TanStack Query, Zustand-free simple state, React Three Fiber 9 + drei, Recharts, lucide-react.
- **Backend:** Supabase – Postgres (RLS, RPC, Realtime, Storage, pg_cron), Auth (email/password + anonymous), Edge Functions (Deno) for everything that touches money, AI or game state.
- **AI:** Anthropic SDK (`claude-opus-5-5` by default) with structured outputs; rule-based fallbacks when no key is set.
- **Payments:** Stripe Checkout + webhooks; sandbox mode without keys.
- **TikTok:** Login Kit OAuth + Display API (`user.info.*`, `video.list`).

```
src/                      Vite React app (pages, components, hooks, i18n)
supabase/migrations/      Postgres schema, RLS, RPCs, realtime, storage, cron
supabase/functions/       Edge functions (hatch, gift, creature-chat, battle, converse, checkout, stripe-webhook, tiktok-auth, tick, payout, creature-action)
supabase/functions/_shared Pure game logic shared by browser and Deno (dna, lifecycle, battle, catalog, economy, persona, ai, quests)
docs/                     Architecture, Lovable import guide
```

## Run on Lovable (recommended)

1. Create a new Lovable project and **connect Supabase** (Lovable → Settings → Supabase).
2. Import this code: either connect the Lovable project to GitHub and push this repository to that repo, or upload the ZIP from `npm run zip` – details in [`docs/LOVABLE_IMPORT.md`](docs/LOVABLE_IMPORT.md).
3. Run the migration `supabase/migrations/20261101000000_init.sql` in the Supabase SQL editor (Lovable can also apply it for you).
4. Deploy the edge functions (`supabase functions deploy` or let Lovable deploy them) and set secrets from `supabase/functions/.env.example`.
5. Enable **anonymous sign-ins** in Supabase Auth settings.

Without any secrets the platform runs end-to-end in **sandbox mode**: sample creators, rule-based personalities, instant simulated purchases, `ALLOW_FREE_HATCH=true`.

## Run locally

```bash
npm install
cp .env.example .env          # add your Supabase URL + publishable key
npm run dev                   # http://localhost:8080

# backend (requires Supabase CLI + Docker)
supabase start
supabase db reset             # applies migrations
supabase functions serve --env-file supabase/functions/.env
```

## Checks

```bash
npm run typecheck             # frontend
npm run typecheck:functions   # edge functions (Deno)
npm run test                  # shared game logic (Deno tests)
npm run build
```

## Economy (defaults)

| Item | Value |
|---|---|
| Creator plan | €9.99 / month, 300 credits included |
| Credit face value | 1 credit = €0.01 |
| Packs | 300 / €3.49 · 1000 / €9.99 · 2500 / €22.99 · 6000 / €49.99 |
| Gift split | 80 % creator · 20 % platform (`PLATFORM_FEE_PERCENT`) |
| Revive | Phoenix Feather, 500 credits |
| Battle stake | 20–500 credits, win pays 1.8× |
| Minimum payout | €20.00 |

## Security model

- Browsers only read via RLS policies and call RPCs/edge functions; **all writes that touch credits, revenue or game state run in edge functions with the service role**.
- Owners may only rename their creature or toggle battle acceptance (enforced by a trigger).
- Atomic credit changes (`adjust_credits`), Stripe webhook idempotency (`processed_events`), per-user chat rate limits, battle cooldowns, self-gifting earns no revenue.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.
