/** The galaxies: content categories. Same list as the galaxies table; hue drives the nebula color on the map. */
import type { GalaxySlug } from "./types";

export const GALAXIES: { slug: GalaxySlug; hue: number }[] = [
  { slug: "alltag", hue: 262 }, { slug: "musik", hue: 320 }, { slug: "essen", hue: 30 }, { slug: "sport", hue: 150 }, { slug: "reisen", hue: 200 },
  { slug: "kunst", hue: 285 }, { slug: "humor", hue: 48 }, { slug: "gaming", hue: 180 }, { slug: "wissen", hue: 222 }, { slug: "business", hue: 100 },
];

export const galaxyHue = (slug?: string | null) => GALAXIES.find((g) => g.slug === slug)?.hue ?? 262;

/** Where a galaxy sits on the map (0..1). Ten clusters on two gentle arcs, so the universe reads as one sky, not a grid. */
export function galaxyCenter(slug?: string | null): { x: number; y: number } {
  const i = Math.max(0, GALAXIES.findIndex((g) => g.slug === (slug ?? "alltag")));
  const row = i < 5 ? 0 : 1;
  const col = i % 5;
  const x = 0.12 + col * 0.19 + (row ? 0.05 : 0);
  const y = row === 0 ? 0.3 + Math.sin(col * 1.3) * 0.06 : 0.72 + Math.cos(col * 1.1) * 0.06;
  return { x, y };
}
