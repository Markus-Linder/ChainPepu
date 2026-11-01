/**
 * Platform economy.
 * 1 credit has a fixed face value of 1 euro cent for payout purposes.
 * Credit packs are sold at or above face value; creators receive 80% of a gift's
 * face value, the platform keeps 20% (configurable via PLATFORM_FEE_PERCENT).
 */
export const CREDIT_VALUE_CENTS = 1;
export const CURRENCY = "eur";

export const PLATFORM_FEE_PERCENT = 20;

export const CREATOR_PLAN = {
  id: "creator_monthly",
  priceCents: 999,
  interval: "month" as const,
  includedCredits: 300,
  features: [
    "unique_creature",
    "public_page",
    "earnings_dashboard",
    "battles_and_leaderboard",
    "memory_and_learning",
    "creature_conversations",
  ],
};

export type CreditPack = {
  id: string;
  credits: number;
  priceCents: number;
  badge?: "popular" | "best_value";
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "spark", credits: 300, priceCents: 349 },
  { id: "flame", credits: 1000, priceCents: 999, badge: "popular" },
  { id: "blaze", credits: 2500, priceCents: 2299 },
  { id: "inferno", credits: 6000, priceCents: 4999, badge: "best_value" },
];

export const ACTION_COSTS = {
  revive: 500,
  battleStakeMin: 20,
  battleStakeMax: 500,
  conversation: 15,
};

export function splitGift(credits: number) {
  const grossCents = credits * CREDIT_VALUE_CENTS;
  const platformCents = Math.round((grossCents * PLATFORM_FEE_PERCENT) / 100);
  const creatorCents = grossCents - platformCents;
  return { grossCents, platformCents, creatorCents };
}

export function formatMoney(cents: number, locale = "en", currency = CURRENCY) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}
