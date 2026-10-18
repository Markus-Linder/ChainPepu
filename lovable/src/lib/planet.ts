/** The look of a user's planet from their seed, skin and level. Fully deterministic. */

export type PlanetLook = {
  hue: number;
  hue2: number;
  size: number;
  rings: boolean;
  ringTilt: number;
  moons: number;
  glow: string;
  skin: string;
  level: number;
  x: number; // position in the universe, 0..1
  y: number;
};

export const SKINS: Record<string, { price: number; glow: string }> = {
  standard: { price: 0, glow: "rgba(123,97,255,0.5)" },
  lava: { price: 40, glow: "rgba(255,90,40,0.75)" },
  eis: { price: 40, glow: "rgba(120,220,255,0.75)" },
  gold: { price: 120, glow: "rgba(242,196,109,0.9)" },
  neon: { price: 90, glow: "rgba(80,255,180,0.9)" },
  void: { price: 200, glow: "rgba(255,255,255,0.95)" },
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Level grows with activity: planets get bigger, earn rings and moons and glow stronger. */
export function planetLook(seed: number, skin = "standard", level = 1): PlanetLook {
  const r = mulberry32(seed);
  const hue = Math.floor(r() * 360);
  const hue2 = (hue + 40 + Math.floor(r() * 80)) % 360;
  const baseSize = 0.7 + r() * 0.6;
  const baseRings = r() > 0.55;
  const ringTilt = -30 + r() * 60;
  const baseMoons = Math.floor(r() * 3);
  const arm = Math.floor(r() * 3);
  const t = r();
  const angle = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.2;
  const radius = 0.08 + t * 0.4;
  const jitter = (r() - 0.5) * 0.08;
  const x = 0.5 + Math.cos(angle) * (radius + jitter);
  const y = 0.5 + Math.sin(angle) * (radius + jitter) * 0.78;
  const s = SKINS[skin] ?? SKINS.standard;
  const lv = Math.max(1, level);
  const size = Math.min(1.6, baseSize * (1 + (lv - 1) * 0.05));
  const rings = baseRings || lv >= 4;
  const moons = Math.min(3, Math.max(baseMoons, Math.floor(lv / 3)));
  const glow = lv >= 8 ? s.glow.replace(/[\d.]+\)$/, "1)") : s.glow;
  return { hue, hue2, size, rings, ringTilt, moons, glow, skin, level: lv, x, y };
}

export function skinColors(look: PlanetLook): { a: string; b: string } {
  switch (look.skin) {
    case "lava": return { a: "hsl(18 95% 55%)", b: "hsl(0 80% 25%)" };
    case "eis": return { a: "hsl(195 90% 85%)", b: "hsl(210 80% 45%)" };
    case "gold": return { a: "hsl(48 100% 70%)", b: "hsl(35 90% 35%)" };
    case "neon": return { a: "hsl(160 100% 65%)", b: "hsl(190 90% 25%)" };
    case "void": return { a: "hsl(240 10% 20%)", b: "hsl(240 10% 3%)" };
    default: return { a: `hsl(${look.hue} 80% 65%)`, b: `hsl(${look.hue2} 70% 30%)` };
  }
}

/** XP needed for a level: level = floor(sqrt(xp / 50)) + 1 (same formula as the database). */
export function xpForLevel(level: number): number {
  return Math.max(0, (level - 1) ** 2 * 50);
}
