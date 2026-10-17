/** Erzeugt aus dem Seed eines Nutzers das Aussehen seines Planeten. Rein deterministisch. */

export type PlanetLook = {
  hue: number;
  hue2: number;
  size: number;
  rings: boolean;
  ringTilt: number;
  moons: number;
  glow: string;
  skin: string;
  x: number; // Position im Universum, 0..1
  y: number;
};

export const SKINS: Record<string, { name: string; price: number; glow: string; desc: string }> = {
  standard: { name: "Standard", price: 0, glow: "rgba(124,92,255,0.5)", desc: "Der Planet, mit dem jeder startet." },
  lava: { name: "Lava", price: 40, glow: "rgba(255,90,40,0.75)", desc: "Glühender Kern, roter Schein." },
  eis: { name: "Eis", price: 40, glow: "rgba(120,220,255,0.75)", desc: "Kristallklar und kalt." },
  gold: { name: "Gold", price: 120, glow: "rgba(255,210,80,0.9)", desc: "Leuchtet auf der Karte goldfarben." },
  neon: { name: "Neon", price: 90, glow: "rgba(80,255,180,0.9)", desc: "Grellgrüne Aura, nicht zu übersehen." },
  void: { name: "Void", price: 200, glow: "rgba(255,255,255,0.95)", desc: "Schwarzer Planet, weißer Halo. Seltenheit." },
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

export function planetLook(seed: number, skin = "standard"): PlanetLook {
  const r = mulberry32(seed);
  const hue = Math.floor(r() * 360);
  const hue2 = (hue + 40 + Math.floor(r() * 80)) % 360;
  const size = 0.7 + r() * 0.6;
  const rings = r() > 0.55;
  const ringTilt = -30 + r() * 60;
  const moons = Math.floor(r() * 3);
  // Spiralgalaxie: Position auf einem Arm mit etwas Streuung.
  const arm = Math.floor(r() * 3);
  const t = r();
  const angle = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.2;
  const radius = 0.08 + t * 0.4;
  const jitter = (r() - 0.5) * 0.08;
  const x = 0.5 + Math.cos(angle) * (radius + jitter);
  const y = 0.5 + Math.sin(angle) * (radius + jitter) * 0.78;
  const s = SKINS[skin] ?? SKINS.standard;
  return { hue, hue2, size, rings, ringTilt, moons, glow: s.glow, skin, x, y };
}

export function skinColors(look: PlanetLook): { a: string; b: string } {
  switch (look.skin) {
    case "lava":
      return { a: "hsl(18 95% 55%)", b: "hsl(0 80% 25%)" };
    case "eis":
      return { a: "hsl(195 90% 85%)", b: "hsl(210 80% 45%)" };
    case "gold":
      return { a: "hsl(48 100% 70%)", b: "hsl(35 90% 35%)" };
    case "neon":
      return { a: "hsl(160 100% 65%)", b: "hsl(190 90% 25%)" };
    case "void":
      return { a: "hsl(240 10% 20%)", b: "hsl(240 10% 3%)" };
    default:
      return { a: `hsl(${look.hue} 80% 65%)`, b: `hsl(${look.hue2} 70% 30%)` };
  }
}
