import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { planetLook, skinColors } from "@/lib/planet";
import { GALAXIES, galaxyCenter, galaxyHue } from "@/lib/galaxies";
import { useT } from "@/lib/i18n";

export type MapPlanet = { id: string; username: string; display_name: string; seed: number; skin: string; level?: number; galaxy?: string | null; links: number };
export type MapChain = { id: number; title: string; boost: number; link_count: number; donated_stars: number; daily: boolean; topic: boolean; origin: string | null; crowns: number; duel: boolean; galaxy?: string };
export type MapEdgeView = { chain_id: number; from_user: string; to_user: string };
export type MapOrbit = { from_user: string; to_user: string };

const W = 1600;
const H = 1000;
const COLOR = { chain: "#7b61ff", daily: "#f2c46d", topic: "#ff3d9a", hover: "#ffffff" };
const GALAXY_R = 0.085; // radius of one galaxy cluster, in map units

/**
 * The universe: ten galaxies (content categories) as glowing nebulae, planets inside the galaxy they call home,
 * chains as strands between the planets that built them. Stars, boosts, crowns and duels are drawn at the chain.
 */
export function UniverseMap({ planets, chains, edges, orbits = [] }: { planets: MapPlanet[]; chains: MapChain[]; edges: MapEdgeView[]; orbits?: MapOrbit[] }) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; look: ReturnType<typeof planetLook>; p: MapPlanet; galaxy: string }>();
    for (const p of planets) {
      const look = planetLook(p.seed, p.skin, p.level ?? 1);
      const galaxy = p.galaxy ?? "alltag";
      const c = galaxyCenter(galaxy);
      // The planet's own spiral position, scaled into its galaxy.
      const x = (c.x + (look.x - 0.5) * GALAXY_R * 2.4) * W;
      const y = (c.y + (look.y - 0.5) * GALAXY_R * 2.4) * H;
      m.set(p.id, { x, y, look, p, galaxy });
    }
    return m;
  }, [planets]);

  const chainById = useMemo(() => new Map(chains.map((c) => [c.id, c])), [chains]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of pos.values()) m.set(v.galaxy, (m.get(v.galaxy) ?? 0) + 1);
    return m;
  }, [pos]);

  const badges = useMemo(() => {
    const out: { c: MapChain; x: number; y: number }[] = [];
    const seen = new Set<number>();
    for (const e of edges) {
      const c = chainById.get(e.chain_id);
      const a = pos.get(e.from_user), b = pos.get(e.to_user);
      if (!c || !a || !b || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ c, x: (a.x + b.x) / 2 + (a.y - b.y) * 0.2, y: (a.y + b.y) / 2 + (b.x - a.x) * 0.2 });
    }
    for (const c of chains) {
      if (seen.has(c.id) || !c.origin) continue;
      const o = pos.get(c.origin);
      if (!o) continue;
      seen.add(c.id);
      out.push({ c, x: o.x + 26, y: o.y - 22 });
    }
    return out.filter(({ c }) => c.donated_stars > 0 || c.boost > 0 || c.topic || c.crowns > 0 || c.duel);
  }, [chains, edges, pos, chainById]);

  function onWheel(e: React.WheelEvent) {
    const k = Math.min(5, Math.max(0.6, view.k * (e.deltaY < 0 ? 1.12 : 0.9)));
    setView((v) => ({ ...v, k }));
  }
  const dim = (galaxy: string) => (focus && focus !== galaxy ? 0.18 : 1);
  const hovered = hover !== null ? chainById.get(hover) : null;

  return (
    <div className="map-frame relative w-full overflow-hidden rounded-3xl" style={{ aspectRatio: "16 / 10" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={(e) => setDrag({ x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false })}
        onPointerMove={(e) => {
          if (!drag) return;
          const scale = W / (e.currentTarget.clientWidth || W);
          setDrag({ ...drag, moved: true });
          setView((v) => ({ ...v, x: drag.vx + (e.clientX - drag.x) * scale, y: drag.vy + (e.clientY - drag.y) * scale }));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
        style={{ cursor: drag ? "grabbing" : "grab" }}
      >
        <defs>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="nebula" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40" /></filter>
          {GALAXIES.map((g) => (
            <radialGradient key={g.slug} id={`gx-${g.slug}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`hsl(${g.hue} 90% 70%)`} stopOpacity="0.45" />
              <stop offset="45%" stopColor={`hsl(${g.hue} 80% 55%)`} stopOpacity="0.16" />
              <stop offset="100%" stopColor={`hsl(${g.hue} 80% 50%)`} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id="night" cx="50%" cy="50%" r="50%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.55" /></radialGradient>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: "center" }}>
          {/* Galaxies: nebula, swirl, name */}
          {GALAXIES.map((g) => {
            const c = galaxyCenter(g.slug);
            const cx = c.x * W, cy = c.y * H, r = GALAXY_R * W;
            return (
              <g key={g.slug} opacity={dim(g.slug)} style={{ transition: "opacity .3s" }} onClick={() => { if (!drag?.moved) setFocus((f) => (f === g.slug ? null : g.slug)); }} className="cursor-pointer">
                <ellipse cx={cx} cy={cy} rx={r * 1.6} ry={r * 1.1} fill={`url(#gx-${g.slug})`} filter="url(#nebula)" />
                <ellipse cx={cx} cy={cy} rx={r * 1.25} ry={r * 0.55} fill="none" stroke={`hsl(${g.hue} 80% 70%)`} strokeOpacity="0.14" strokeWidth="1" transform={`rotate(${(g.hue % 60) - 30} ${cx} ${cy})`} />
                <text x={cx} y={cy - r * 1.05} textAnchor="middle" fontSize="18" fontWeight="700" fill={`hsl(${g.hue} 90% 80%)`} style={{ letterSpacing: ".18em", textTransform: "uppercase" }}>{t(`galaxy_${g.slug}`)}</text>
                <text x={cx} y={cy - r * 1.05 + 20} textAnchor="middle" fontSize="12" fill="#9b97c4">{t("n_planets", { n: counts.get(g.slug) ?? 0 })}</text>
              </g>
            );
          })}
          {/* Constellations */}
          {orbits.map((o, i) => {
            const a = pos.get(o.from_user), b = pos.get(o.to_user);
            if (!a || !b) return null;
            return <line key={`o${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8fd3ff" strokeOpacity={0.3 * dim(a.galaxy)} strokeWidth={1} strokeDasharray="3 6" />;
          })}
          {/* Strands */}
          {edges.map((e, i) => {
            const a = pos.get(e.from_user);
            const b = pos.get(e.to_user);
            const c = chainById.get(e.chain_id);
            if (!a || !b || !c) return null;
            const strength = Math.min(1, 0.25 + (c.link_count + c.boost * 3 + c.donated_stars / 15) / 40);
            const highlighted = hover === e.chain_id;
            const color = c.daily ? COLOR.daily : c.topic ? COLOR.topic : c.duel ? "#ff5a5a" : `hsl(${galaxyHue(c.galaxy)} 85% 68%)`;
            const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.2;
            const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.2;
            const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
            const rich = c.donated_stars >= 200 || c.boost > 0 || c.crowns > 0;
            const op = Math.min(dim(a.galaxy), dim(b.galaxy));
            return (
              <Link key={i} to={`/c/${c.id}`}>
                {rich && <path d={d} fill="none" stroke={c.crowns > 0 ? COLOR.daily : color} strokeOpacity={0.18 * op} strokeWidth={6 + strength * 4} filter="url(#soft)" />}
                <path d={d} fill="none" className={`chain-line ${c.boost > 0 ? "pulse" : ""}`}
                  stroke={highlighted ? COLOR.hover : color} strokeOpacity={(highlighted ? 1 : 0.25 + strength * 0.55) * op} strokeWidth={highlighted ? 4 : 1 + strength * 2.2}
                  onPointerEnter={() => setHover(c.id)} onPointerLeave={() => setHover(null)} />
              </Link>
            );
          })}
          {/* Planets: gradient body, night side, rim light, rings, level glow */}
          {[...pos.values()].map(({ x, y, look, p, galaxy }) => {
            const { a, b } = skinColors(look);
            const r = 6 + look.size * 6 + Math.min(14, p.links * 0.8) + Math.min(6, (p.level ?? 1) * 0.5);
            return (
              <Link key={p.id} to={`/p/${p.username}`}>
                <g opacity={dim(galaxy)} style={{ filter: `drop-shadow(0 0 ${r * 0.9}px ${look.glow})`, transition: "opacity .3s" }}>
                  <defs>
                    <radialGradient id={`mp${p.id}`} cx="32%" cy="30%" r="75%"><stop offset="0%" stopColor={a} /><stop offset="60%" stopColor={b} /><stop offset="100%" stopColor="#05040c" /></radialGradient>
                  </defs>
                  {look.rings && <ellipse cx={x} cy={y} rx={r * 1.8} ry={r * 0.5} fill="none" stroke={a} strokeOpacity="0.35" strokeWidth="2" transform={`rotate(${look.ringTilt} ${x} ${y})`} />}
                  <circle cx={x} cy={y} r={r} fill={`url(#mp${p.id})`} />
                  <circle cx={x} cy={y} r={r} fill="url(#night)" />
                  <circle cx={x} cy={y} r={r} fill="none" stroke={a} strokeOpacity="0.5" strokeWidth="0.8" />
                  {look.rings && <path d={`M ${x - r * 1.8} ${y} A ${r * 1.8} ${r * 0.5} 0 0 0 ${x + r * 1.8} ${y}`} fill="none" stroke={a} strokeOpacity="0.85" strokeWidth="2" transform={`rotate(${look.ringTilt} ${x} ${y})`} />}
                  {Array.from({ length: look.moons }).map((_, i) => <circle key={i} cx={x + Math.cos(i * 2.1 + look.hue) * (r + 5)} cy={y + Math.sin(i * 2.1 + look.hue) * (r + 5)} r={1.6 + i * 0.5} fill="#e4e1ff" opacity="0.9" />)}
                  <text x={x} y={y + r + 13} textAnchor="middle" fontSize="11" fill="#d9d7ff" opacity="0.85">{p.display_name}</text>
                </g>
              </Link>
            );
          })}
          {/* Badges */}
          {badges.map(({ c, x, y }) => {
            const label = [c.crowns > 0 ? `♛${c.crowns > 1 ? c.crowns : ""}` : "", c.duel ? "⚔ LIVE" : "", c.donated_stars > 0 ? `★ ${c.donated_stars}` : "", c.boost > 0 ? `⚡${c.boost}` : "", c.topic ? "✦" : ""].filter(Boolean).join("  ");
            const w = label.length * 7.2 + 16;
            const color = c.duel ? "#ff5a5a" : c.crowns > 0 ? COLOR.daily : c.topic ? COLOR.topic : COLOR.daily;
            return (
              <Link key={`b${c.id}`} to={`/c/${c.id}`}>
                <g onPointerEnter={() => setHover(c.id)} onPointerLeave={() => setHover(null)} className={c.duel ? "pulse" : undefined} opacity={dim(c.galaxy ?? "alltag")} style={{ filter: `drop-shadow(0 0 10px ${color})` }}>
                  <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11} fill="rgba(6,5,13,0.85)" stroke={color} strokeOpacity={0.9} strokeWidth={1.2} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{label}</text>
                </g>
              </Link>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70">{t("map_hint")}</div>
      <div className="absolute right-3 top-3 flex max-w-[60%] flex-wrap justify-end gap-1">
        {GALAXIES.map((g) => (
          <button key={g.slug} onClick={() => setFocus((f) => (f === g.slug ? null : g.slug))} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${focus === g.slug ? "border-white/60 bg-white/15 text-white" : "border-white/10 bg-black/40 text-white/70 hover:text-white"}`} style={{ borderColor: focus === g.slug ? undefined : `hsla(${g.hue},80%,65%,.5)` }}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${g.hue} 85% 65%)` }} />{t(`galaxy_${g.slug}`)}
          </button>
        ))}
      </div>
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-xl bg-black/75 px-3 py-2 text-sm backdrop-blur">
          <div className="font-semibold">{hovered.topic ? "✦ " : hovered.daily ? "☀ " : ""}{hovered.title}</div>
          <div className="muted text-xs">
            {t(`galaxy_${hovered.galaxy ?? "alltag"}`)} · {t("n_links", { n: hovered.link_count })}
            {hovered.donated_stars > 0 && <> · <span style={{ color: COLOR.daily }}>{t("map_stars", { n: hovered.donated_stars })}</span></>}
            {hovered.boost > 0 && <> · {t("map_boost", { n: hovered.boost })}</>}
            {hovered.crowns > 0 && <> · ♛ {t("map_crowns", { n: hovered.crowns })}</>}
            {hovered.duel && <> · <span style={{ color: "#ff5a5a" }}>⚔ {t("map_duel")}</span></>}
          </div>
        </div>
      )}
    </div>
  );
}
