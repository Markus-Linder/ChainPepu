export type ItemCategory = "food" | "toy" | "care" | "cosmetic" | "potion" | "battle" | "gift";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export type ItemEffects = {
  satiety?: number;
  energy?: number;
  happiness?: number;
  hygiene?: number;
  health?: number;
  xp?: number;
  /** Multiplier bonus applied to power in the creature's next battle (0.15 = +15%). */
  battleBoost?: number;
  /** Cosmetic key understood by the 3D renderer. */
  cosmetic?: string;
  /** Brings a dead creature back to life. */
  revive?: boolean;
};

export type CatalogItem = {
  slug: string;
  category: ItemCategory;
  rarity: Rarity;
  priceCredits: number;
  icon: string;
  effects: ItemEffects;
  sortOrder: number;
  /** Items the owner may stock in inventory (vs. pure tips). */
  stockable: boolean;
};

/** Shop catalog. Display names live in the i18n dictionaries under `items.<slug>`. */
export const CATALOG: CatalogItem[] = [
  { slug: "berry", category: "food", rarity: "common", priceCredits: 10, icon: "🫐", effects: { satiety: 12, xp: 2 }, sortOrder: 1, stockable: true },
  { slug: "ramen", category: "food", rarity: "common", priceCredits: 35, icon: "🍜", effects: { satiety: 35, happiness: 5, xp: 6 }, sortOrder: 2, stockable: true },
  { slug: "cake", category: "food", rarity: "rare", priceCredits: 90, icon: "🎂", effects: { satiety: 45, happiness: 20, xp: 15 }, sortOrder: 3, stockable: true },
  { slug: "feast", category: "food", rarity: "epic", priceCredits: 250, icon: "🍱", effects: { satiety: 100, happiness: 30, energy: 20, xp: 40 }, sortOrder: 4, stockable: true },
  { slug: "ball", category: "toy", rarity: "common", priceCredits: 15, icon: "🏐", effects: { happiness: 15, energy: -5, xp: 4 }, sortOrder: 10, stockable: true },
  { slug: "drone", category: "toy", rarity: "rare", priceCredits: 80, icon: "🛸", effects: { happiness: 35, energy: -10, xp: 12 }, sortOrder: 11, stockable: true },
  { slug: "console", category: "toy", rarity: "epic", priceCredits: 200, icon: "🎮", effects: { happiness: 60, energy: -15, xp: 30 }, sortOrder: 12, stockable: true },
  { slug: "soap", category: "care", rarity: "common", priceCredits: 12, icon: "🧼", effects: { hygiene: 40, xp: 3 }, sortOrder: 20, stockable: true },
  { slug: "spa", category: "care", rarity: "rare", priceCredits: 70, icon: "🛁", effects: { hygiene: 100, happiness: 15, energy: 15, xp: 10 }, sortOrder: 21, stockable: true },
  { slug: "pillow", category: "care", rarity: "common", priceCredits: 20, icon: "🛏️", effects: { energy: 50, xp: 4 }, sortOrder: 22, stockable: true },
  { slug: "medkit", category: "potion", rarity: "rare", priceCredits: 60, icon: "💊", effects: { health: 35, xp: 5 }, sortOrder: 30, stockable: true },
  { slug: "elixir", category: "potion", rarity: "epic", priceCredits: 180, icon: "🧪", effects: { health: 100, energy: 30, xp: 20 }, sortOrder: 31, stockable: true },
  { slug: "phoenix", category: "potion", rarity: "legendary", priceCredits: 500, icon: "🪶", effects: { revive: true, health: 60, satiety: 60, energy: 60, happiness: 50, hygiene: 60 }, sortOrder: 32, stockable: true },
  { slug: "whetstone", category: "battle", rarity: "rare", priceCredits: 50, icon: "🗡️", effects: { battleBoost: 0.15 }, sortOrder: 40, stockable: true },
  { slug: "warpaint", category: "battle", rarity: "epic", priceCredits: 120, icon: "🎨", effects: { battleBoost: 0.3 }, sortOrder: 41, stockable: true },
  { slug: "crown", category: "cosmetic", rarity: "epic", priceCredits: 300, icon: "👑", effects: { cosmetic: "crown", happiness: 10, xp: 25 }, sortOrder: 50, stockable: false },
  { slug: "shades", category: "cosmetic", rarity: "rare", priceCredits: 120, icon: "🕶️", effects: { cosmetic: "shades", happiness: 8, xp: 10 }, sortOrder: 51, stockable: false },
  { slug: "halo", category: "cosmetic", rarity: "legendary", priceCredits: 800, icon: "😇", effects: { cosmetic: "halo", happiness: 15, xp: 60 }, sortOrder: 52, stockable: false },
  { slug: "rose", category: "gift", rarity: "common", priceCredits: 5, icon: "🌹", effects: { happiness: 3, xp: 1 }, sortOrder: 60, stockable: false },
  { slug: "heart", category: "gift", rarity: "common", priceCredits: 25, icon: "💖", effects: { happiness: 8, xp: 3 }, sortOrder: 61, stockable: false },
  { slug: "rocket", category: "gift", rarity: "rare", priceCredits: 150, icon: "🚀", effects: { happiness: 25, xp: 20 }, sortOrder: 62, stockable: false },
  { slug: "diamond", category: "gift", rarity: "legendary", priceCredits: 1000, icon: "💎", effects: { happiness: 50, energy: 20, xp: 100 }, sortOrder: 63, stockable: false },
];

export const CATALOG_BY_SLUG: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((i) => [i.slug, i]));

export function findItem(slug: string): CatalogItem | undefined {
  return CATALOG_BY_SLUG[slug];
}
