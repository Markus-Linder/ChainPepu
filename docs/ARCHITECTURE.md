# Architecture

## Principles
1. **Server authority.** Nothing that moves money or changes a creature's state is trusted from the browser. The browser reads (RLS) and calls edge functions.
2. **One source of pure logic.** `supabase/functions/_shared` contains dependency-free TypeScript used by both the Vite app (via the `@shared` alias) and Deno edge functions: DNA generation, lifecycle math, battle engine, catalog, economy, quests, persona fallback.
3. **Works without secrets.** Every external service (Anthropic, Stripe, TikTok) has a deterministic fallback so the whole product can be demoed from a fresh Supabase project.
4. **Rebrandable.** `src/config/brand.ts` is the only place the brand lives.

## Data flow

```
TikTok / prompt / photo ──▶ hatch (edge) ──▶ analyze ─▶ generateDna ─▶ generatePersona ─▶ creatures (UNIQUE dna_hash)
visitor ─▶ gift (edge) ─▶ adjust_credits ─▶ transactions (80/20) ─▶ gifts (realtime) ─▶ creature effects + quests + memory
visitor ─▶ creature-chat (edge) ─▶ memories + persona + history ─▶ Claude structured output ─▶ reply + new memories + trait nudges
owner   ─▶ battle (edge) ─▶ simulateBattle(seeded) ─▶ elo / wins / health damage / stake payout ─▶ battles (realtime)
owner   ─▶ converse (edge) ─▶ Claude dialogue ─▶ creature_conversations + relationship memories
cron    ─▶ tick (edge) or tick_all_creatures() (SQL) ─▶ decay, death, daily quests, ambient conversations
Stripe  ─▶ stripe-webhook (edge) ─▶ credits / subscription state (idempotent via processed_events)
```

## Lifecycle
Decay per hour: food −3.2, energy −2.4 (+9 while sleeping), mood −2.0, hygiene −1.6. Health drops 4/h per critical stat (food < 15, hygiene < 10, mood < 10, energy < 5) and regenerates 1.5/h when cared for. An unattended creature dies after roughly three days. The authoritative implementation is the SQL function `tick_creature`; `lifecycle.ts` mirrors it for client previews and tests.

## Uniqueness
`hashContentProfile` → SHA-256 over normalised handle, hashtags, categories, keywords, prompt and a nonce. The hash seeds a PRNG that decides every gene. `creatures.dna_hash` is `UNIQUE`; on collision the hatch function increments the nonce.

## Battles
`simulateBattle(a, b, seed)` is pure and deterministic: effective stats from DNA × condition (health, energy) × level × item boost; dodge from agility, crits from wit, charm reduces damage. Elo K=32. Loser takes 18–30 vitals health damage, winner 3–8 – battles can be fatal, which is the point of "damaging" another creature.

## Money
Credits are integers with a face value of €0.01. `transactions` is append-only and stores `gross_cents`, `creator_cents`, `platform_cents` for every event, so payouts and platform revenue are always reconstructable. `my_earnings(days)` powers the dashboard chart; `payout` creates a pending payout row for manual or Stripe Connect settlement.

## Internationalisation
Dictionaries in `src/lib/i18n/{en,de}.ts` share the `Dictionary` type, so a missing key fails type-checking. Locale is detected from `localStorage` → `navigator.languages`. Money and relative time use `Intl`. The chat edge function passes the visitor's locale so creatures answer in that language.

## Extending
- New item: add to `_shared/catalog.ts` and the `items` section of each dictionary.
- New language: copy `en.ts`, add to `LOCALES`.
- New genesis source: extend `GenesisSource`, add a branch in `hatch/index.ts`.
- Real payouts: wire `payout` to Stripe Connect transfers.
