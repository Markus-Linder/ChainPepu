import { sha256Hex } from "./hash.ts";

/**
 * Creature DNA: a deterministic, unique genome derived from a creator's TikTok content.
 * The same content profile always yields the same genome; a nonce is appended on the
 * (astronomically unlikely) hash collision so every creature in the world is unique.
 */

export const BODY_TYPES = ["blob", "feline", "dragonling", "mech", "spirit", "slime", "owl", "axolotl"] as const;
export const EYE_STYLES = ["round", "almond", "visor", "sparkle", "sleepy", "cyclops"] as const;
export const HORN_TYPES = ["none", "nub", "antler", "unicorn", "antenna", "crystal"] as const;
export const TAIL_TYPES = ["none", "stub", "whip", "fluffy", "flame", "cable"] as const;
export const WING_TYPES = ["none", "bat", "feather", "fairy", "jet"] as const;
export const PATTERNS = ["solid", "spots", "stripes", "gradient", "galaxy", "circuit", "marble"] as const;
export const EAR_TYPES = ["none", "pointy", "round", "floppy", "fin"] as const;

export type BodyType = (typeof BODY_TYPES)[number];

export type Dna = {
  version: 1;
  seed: string;
  body: BodyType;
  eyes: (typeof EYE_STYLES)[number];
  horns: (typeof HORN_TYPES)[number];
  tail: (typeof TAIL_TYPES)[number];
  wings: (typeof WING_TYPES)[number];
  ears: (typeof EAR_TYPES)[number];
  pattern: (typeof PATTERNS)[number];
  /** HSL colors as [h 0..360, s 0..1, l 0..1] */
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  eyeColor: [number, number, number];
  /** Body proportions */
  size: number; // 0.8 .. 1.3
  roundness: number; // 0 .. 1
  headRatio: number; // 0.6 .. 1.1
  limbLength: number; // 0.4 .. 1.2
  /** Surface */
  metalness: number;
  roughness: number;
  glow: number; // emissive strength 0 .. 1
  /** Animation genes */
  bounceFreq: number;
  blinkRate: number;
  wiggle: number;
  /** Base battle stats, each 20..80, sum ≈ 200 */
  stats: { power: number; agility: number; wit: number; charm: number };
  /** Idle behaviours shown in the 3D scene (strings understood by the renderer). */
  idleBehaviours: string[];
};

export type GenesisSource = "tiktok" | "prompt" | "photo" | "sandbox";

export type ContentProfile = {
  source: GenesisSource;
  /** Free-text creature description (prompt genesis) or AI image description (photo genesis). */
  prompt?: string;
  handle: string;
  displayName: string;
  bio: string;
  followerCount: number;
  videoCount: number;
  topHashtags: string[];
  keywords: string[];
  categories: string[]; // e.g. fitness, cooking, comedy ...
  avgLikes: number;
  avgViews: number;
  sampleCaptions: string[];
  language: string;
};

class Rng {
  private state: number;
  constructor(seedHex: string) {
    this.state = parseInt(seedHex.slice(0, 8), 16) >>> 0 || 1;
  }
  next() {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number) {
    return min + (max - min) * this.next();
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const CATEGORY_BIAS: Record<string, Partial<Record<"body" | "pattern" | "horns" | "wings" | "tail", string[]>> & { hue?: number; stat?: keyof Dna["stats"] }> = {
  fitness: { body: ["dragonling", "feline"], horns: ["crystal", "nub"], hue: 10, stat: "power" },
  gaming: { body: ["mech", "slime"], pattern: ["circuit", "galaxy"], hue: 260, stat: "wit" },
  cooking: { body: ["blob", "axolotl"], pattern: ["spots", "marble"], hue: 30, stat: "charm" },
  comedy: { body: ["slime", "blob"], tail: ["whip", "fluffy"], hue: 50, stat: "charm" },
  music: { body: ["spirit", "owl"], wings: ["feather", "fairy"], hue: 300, stat: "charm" },
  dance: { body: ["feline", "spirit"], tail: ["flame", "whip"], hue: 330, stat: "agility" },
  beauty: { body: ["feline", "axolotl"], pattern: ["gradient", "marble"], hue: 340, stat: "charm" },
  fashion: { body: ["feline", "spirit"], pattern: ["stripes", "gradient"], hue: 280, stat: "charm" },
  tech: { body: ["mech", "owl"], pattern: ["circuit"], horns: ["antenna"], hue: 200, stat: "wit" },
  education: { body: ["owl", "mech"], pattern: ["solid", "stripes"], hue: 210, stat: "wit" },
  travel: { body: ["dragonling", "owl"], wings: ["feather", "jet"], hue: 180, stat: "agility" },
  pets: { body: ["feline", "axolotl"], hue: 90, stat: "charm" },
  art: { body: ["spirit", "slime"], pattern: ["galaxy", "marble"], hue: 270, stat: "wit" },
  finance: { body: ["mech", "dragonling"], pattern: ["circuit", "solid"], hue: 120, stat: "wit" },
  sports: { body: ["dragonling", "feline"], hue: 15, stat: "power" },
  lifestyle: { body: ["blob", "axolotl"], pattern: ["gradient"], hue: 160, stat: "charm" },
  horror: { body: ["spirit", "dragonling"], wings: ["bat"], pattern: ["galaxy"], hue: 250, stat: "power" },
  cars: { body: ["mech"], pattern: ["stripes", "circuit"], hue: 0, stat: "power" },
  nature: { body: ["axolotl", "owl"], pattern: ["spots", "marble"], hue: 110, stat: "agility" },
};

/** Visual traits an AI (or the prompt parser) can pin before the deterministic generator fills the rest. */
export type DnaOverrides = Partial<Pick<Dna, "body" | "eyes" | "horns" | "tail" | "wings" | "ears" | "pattern">> & {
  primaryHue?: number;
  secondaryHue?: number;
  accentHue?: number;
  metallic?: boolean;
  glow?: number;
  size?: number;
};

export function hashContentProfile(profile: ContentProfile, nonce = 0) {
  const material = JSON.stringify({
    source: profile.source,
    prompt: (profile.prompt ?? "").trim().toLowerCase().slice(0, 500),
    handle: profile.handle.toLowerCase(),
    tags: [...profile.topHashtags].map((t) => t.toLowerCase()).sort(),
    cats: [...profile.categories].sort(),
    kws: [...profile.keywords].map((k) => k.toLowerCase()).sort().slice(0, 12),
    nonce,
  });
  return sha256Hex(material);
}

export function generateDna(profile: ContentProfile, nonce = 0, overrides: DnaOverrides = {}): Dna {
  const seed = hashContentProfile(profile, nonce);
  const rng = new Rng(seed);
  const cats = profile.categories.length ? profile.categories : ["lifestyle"];
  const primaryCat = cats[0];
  const bias = CATEGORY_BIAS[primaryCat] ?? CATEGORY_BIAS.lifestyle;
  const bias2 = CATEGORY_BIAS[cats[1] ?? ""] ?? null;

  const pickBiased = <T extends string>(all: readonly T[], biased?: string[]) => {
    if (biased && biased.length && rng.next() < 0.7) return rng.pick(biased) as T;
    return rng.pick(all);
  };

  const baseHue = overrides.primaryHue ?? ((bias.hue ?? rng.range(0, 360)) + rng.range(-25, 25) + 360) % 360;
  const secondaryHue = overrides.secondaryHue ?? (baseHue + (bias2?.hue !== undefined ? (bias2.hue - baseHue) / 2 : rng.range(25, 60))) % 360;
  const accentHue = overrides.accentHue ?? (baseHue + 180 + rng.range(-30, 30)) % 360;

  const stats = { power: 50, agility: 50, wit: 50, charm: 50 };
  const keys = Object.keys(stats) as (keyof typeof stats)[];
  for (const k of keys) stats[k] = Math.round(rng.range(30, 60));
  if (bias.stat) stats[bias.stat] += 18;
  if (bias2?.stat) stats[bias2.stat] += 10;
  // engagement bonus
  const engagement = profile.avgViews > 0 ? Math.min(1, profile.avgLikes / Math.max(1, profile.avgViews) * 10) : 0.3;
  stats.charm += Math.round(engagement * 10);
  for (const k of keys) stats[k] = Math.max(20, Math.min(90, stats[k]));

  const behavioursPool = [
    "stretch", "hum", "spin", "peek", "yawn", "dance", "flex", "wave", "sneeze", "float", "nap-wobble", "giggle", "stargaze",
  ];
  const behaviours = new Set<string>();
  while (behaviours.size < 3) behaviours.add(rng.pick(behavioursPool));
  if (primaryCat === "fitness" || primaryCat === "sports") behaviours.add("flex");
  if (primaryCat === "dance" || primaryCat === "music") behaviours.add("dance");

  return {
    version: 1,
    seed,
    body: overrides.body ?? pickBiased(BODY_TYPES, bias.body),
    eyes: overrides.eyes ?? rng.pick(EYE_STYLES),
    horns: overrides.horns ?? pickBiased(HORN_TYPES, bias.horns),
    tail: overrides.tail ?? pickBiased(TAIL_TYPES, bias.tail),
    wings: overrides.wings ?? pickBiased(WING_TYPES, bias.wings),
    ears: overrides.ears ?? rng.pick(EAR_TYPES),
    pattern: overrides.pattern ?? pickBiased(PATTERNS, bias.pattern),
    primary: [Math.round(baseHue), round2(rng.range(0.55, 0.9)), round2(rng.range(0.45, 0.6))],
    secondary: [Math.round(secondaryHue), round2(rng.range(0.5, 0.85)), round2(rng.range(0.35, 0.55))],
    accent: [Math.round(accentHue), round2(rng.range(0.7, 1)), round2(rng.range(0.55, 0.7))],
    eyeColor: [Math.round((accentHue + rng.range(-40, 40) + 360) % 360), 0.9, 0.55],
    size: overrides.size ?? round2(rng.range(0.85, 1.25)),
    roundness: round2(rng.range(0, 1)),
    headRatio: round2(rng.range(0.65, 1.1)),
    limbLength: round2(rng.range(0.4, 1.2)),
    metalness: round2(
      overrides.metallic === true ? rng.range(0.6, 0.95) : overrides.metallic === false ? rng.range(0, 0.15)
        : primaryCat === "tech" || primaryCat === "cars" || primaryCat === "gaming" ? rng.range(0.5, 0.9) : rng.range(0, 0.3),
    ),
    roughness: round2(rng.range(0.2, 0.8)),
    glow: overrides.glow ?? round2(rng.range(0.1, 0.9)),
    bounceFreq: round2(rng.range(0.6, 1.8)),
    blinkRate: round2(rng.range(0.1, 0.5)),
    wiggle: round2(rng.range(0.2, 1)),
    stats,
    idleBehaviours: [...behaviours],
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function hslToHex([h, s, l]: [number, number, number]) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const SPECIES_PREFIX: Record<BodyType, string[]> = {
  blob: ["Glim", "Pud", "Bloo", "Mochi"],
  feline: ["Nyx", "Vel", "Kit", "Saph"],
  dragonling: ["Dra", "Ember", "Vyr", "Ash"],
  mech: ["Volt", "Gear", "Byte", "Neo"],
  spirit: ["Lum", "Wisp", "Aura", "Nim"],
  slime: ["Goo", "Jel", "Sloop", "Blub"],
  owl: ["Hoo", "Sage", "Noct", "Ori"],
  axolotl: ["Axo", "Lotl", "Pinq", "Gill"],
};
const SPECIES_SUFFIX = ["ling", "ix", "ara", "oth", "uwu", "mon", "ette", "zor", "ami", "kin"];

export function speciesName(dna: Dna) {
  const rng = new Rng(dna.seed.slice(8));
  return `${rng.pick(SPECIES_PREFIX[dna.body])}${rng.pick(SPECIES_SUFFIX)}`;
}


/* ---------- Prompt parsing fallback (no AI key) ---------- */

const COLOR_HUES: Record<string, number> = {
  red: 0, rot: 0, crimson: 350, orange: 30, gold: 45, golden: 45, yellow: 55, gelb: 55, lime: 90, green: 120, grün: 120, gruen: 120, teal: 170,
  cyan: 185, turquoise: 175, türkis: 175, blue: 215, blau: 215, navy: 230, indigo: 250, purple: 275, lila: 275, violet: 275, violett: 275,
  magenta: 300, pink: 330, rosa: 335, rose: 340, white: 0, black: 0, silver: 210, grey: 210, gray: 210, brown: 25, braun: 25,
};

const BODY_WORDS: Record<string, BodyType> = {
  cat: "feline", kitten: "feline", katze: "feline", tiger: "feline", lion: "feline", fox: "feline", fuchs: "feline", wolf: "feline",
  dragon: "dragonling", drache: "dragonling", dino: "dragonling", lizard: "dragonling",
  robot: "mech", roboter: "mech", mech: "mech", android: "mech", cyborg: "mech",
  ghost: "spirit", geist: "spirit", spirit: "spirit", fairy: "spirit", fee: "spirit", angel: "spirit",
  slime: "slime", schleim: "slime", jelly: "slime", blob: "blob", ball: "blob", round: "blob", kugel: "blob",
  owl: "owl", eule: "owl", bird: "owl", vogel: "owl", penguin: "owl",
  axolotl: "axolotl", frog: "axolotl", frosch: "axolotl", fish: "axolotl", fisch: "axolotl", shark: "axolotl",
};

export function parsePromptOverrides(prompt: string): DnaOverrides {
  const p = prompt.toLowerCase();
  const o: DnaOverrides = {};
  // Colours in the order the user mentioned them: first = primary, second = secondary, third = accent.
  const found: { idx: number; hue: number }[] = [];
  for (const [word, hue] of Object.entries(COLOR_HUES)) {
    const m = new RegExp(`\\b${word}`).exec(p);
    if (m) found.push({ idx: m.index, hue });
  }
  const hues = found.sort((a, b) => a.idx - b.idx).map((f) => f.hue).filter((h, i, arr) => arr.indexOf(h) === i);
  if (hues[0] !== undefined) o.primaryHue = hues[0];
  if (hues[1] !== undefined) o.secondaryHue = hues[1];
  if (hues[2] !== undefined) o.accentHue = hues[2];
  for (const [word, body] of Object.entries(BODY_WORDS)) if (new RegExp(`\\b${word}`).test(p)) { o.body = body; break; }
  if (/wing|flügel|fluegel|fly|flieg/.test(p)) o.wings = /bat|fledermaus|demon|dämon/.test(p) ? "bat" : /jet|rocket|rakete/.test(p) ? "jet" : /fairy|fee|glitter/.test(p) ? "fairy" : "feather";
  if (/horn|hörner|hoerner/.test(p)) o.horns = /unicorn|einhorn/.test(p) ? "unicorn" : /antler|geweih/.test(p) ? "antler" : /crystal|kristall/.test(p) ? "crystal" : "nub";
  if (/antenna|antenne/.test(p)) o.horns = "antenna";
  if (/stripe|streifen/.test(p)) o.pattern = "stripes";
  if (/spot|dot|punkte|flecken/.test(p)) o.pattern = "spots";
  if (/galaxy|galaxie|space|weltraum|star|stern/.test(p)) o.pattern = "galaxy";
  if (/circuit|neon|cyber|tech/.test(p)) o.pattern = "circuit";
  if (/marble|marmor/.test(p)) o.pattern = "marble";
  if (/metal|chrome|metall|steel|stahl/.test(p)) o.metallic = true;
  if (/glow|leucht|neon/.test(p)) o.glow = 0.9;
  if (/tiny|klein|small|mini/.test(p)) o.size = 0.85;
  if (/huge|riesig|giant|big|groß|gross/.test(p)) o.size = 1.25;
  if (/sleepy|müde|lazy|faul/.test(p)) o.eyes = "sleepy";
  if (/visor|visier|robot|roboter/.test(p)) o.eyes = "visor";
  if (/cyclops|one eye|ein auge/.test(p)) o.eyes = "cyclops";
  if (/fluffy|flauschig|fur|fell/.test(p)) o.tail = "fluffy";
  if (/fire|feuer|flame|flamme/.test(p)) { o.tail = "flame"; o.primaryHue ??= 15; }
  if (/floppy|schlapp/.test(p)) o.ears = "floppy";
  return o;
}

/** Turn a free-text prompt into a content profile so the rest of the pipeline stays uniform. */
export function profileFromPrompt(handle: string, displayName: string, prompt: string, language = "en"): ContentProfile {
  const words = (prompt.toLowerCase().match(/[\p{L}]{3,}/gu) ?? []).slice(0, 40);
  return {
    source: "prompt",
    prompt,
    handle,
    displayName,
    bio: prompt.slice(0, 200),
    followerCount: 0,
    videoCount: 0,
    topHashtags: [],
    keywords: [...new Set(words)].slice(0, 15),
    categories: ["lifestyle"],
    avgLikes: 0,
    avgViews: 0,
    sampleCaptions: [prompt.slice(0, 160)],
    language,
  };
}
