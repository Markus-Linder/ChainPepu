import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { planetLook, skinColors } from "@/lib/planet";
import { useT } from "@/lib/i18n";

export type MapPlanet = { id: string; username: string; display_name: string; seed: number; skin: string; links: number };
export type MapChain = { id: number; title: string; boost: number; link_count: number; donated_stars: number; daily: boolean; topic: boolean; origin: string | null; crowns: number; duel: boolean };
export type MapEdgeView = { chain_id: number; from_user: string; to_user: string };

const W = 1200;
const H = 800;
const COLOR = { chain: "#7b61ff", daily: "#f2c46d", topic: "#ff3d9a", hover: "#ffffff" };

/**
 * The universe: planets on a spiral, chains as strands between the planets that built them.
 * Stars from fans and boosts are drawn right at the chain, so money is visible where it went.
 */
export type MapOrbit = { from_user: string; to_user: string };

export function UniverseMap({ planets, chains, edges, orbits = [] }: { planets: MapPlanet[]; chains: MapChain[]; edges: MapEdgeView[]; orbits?: MapOrbit[] }) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; look: ReturnType<typeof planetLook>; p: MapPlanet }>();
    for (const p of planets) {
      const look = planetLook(p.seed, p.skin);
      m.set(p.id, { x: look.x * W, y: look.y * H, look, p });
    }
    return m;
  }, [planets]);

  const chainById = useMemo(() => new Map(chains.map((c) => [c.id, c])), [chains]);

  // Where to put the badge (stars / boost / topic) of each chain: midpoint of its first strand, else next to the origin planet.
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
    const k = Math.min(4, Math.max(0.5, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    setView((v) => ({ ...v, k }));
  }

  const hovered = hover !== null ? chainById.get(hover) : null;

  return (
    <div className="map-frame relative w-full overflow-hidden rounded-3xl" style={{ aspectRatio: "3 / 2" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={(e) => setDrag({ x: e.clientX, y: e.clientY, vx: view.x, vy: view.y })}
        onPointerMove={(e) => {
          if (!drag) return;
          const scale = W / (e.currentTarget.clientWidth || W);
          setView((v) => ({ ...v, x: drag.vx + (e.clientX - drag.x) * scale, y: drag.vy + (e.clientY - drag.y) * scale }));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
        style={{ cursor: drag ? "grabbing" : "grab" }}
      >
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="60%" stopColor="rgba(123,97,255,0.12)" />
            <stop offset="100%" stopColor="rgba(123,97,255,0)" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: "center" }}>
          <circle cx={W / 2} cy={H / 2} r={300} fill="url(#core)" />
          {/* Constellations: who invited whom (thin dotted lines) */}
          {orbits.map((o, i) => {
            const a = pos.get(o.from_user), b = pos.get(o.to_user);
            if (!a || !b) return null;
            return <line key={`o${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8fd3ff" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 6" />;
          })}
          {/* Strands */}
          {edges.map((e, i) => {
            const a = pos.get(e.from_user);
            const b = pos.get(e.to_user);
            const c = chainById.get(e.chain_id);
            if (!a || !b || !c) return null;
            const strength = Math.min(1, 0.25 + (c.link_count + c.boost * 3 + c.donated_stars / 15) / 40);
            const highlighted = hover === e.chain_id;
            const color = c.daily ? COLOR.daily : c.topic ? COLOR.topic : c.duel ? "#ff5a5a" : COLOR.chain;
            const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.2;
            const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.2;
            const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
            const rich = c.donated_stars >= 200 || c.boost > 0 || c.crowns > 0;
            return (
              <Link key={i} to={`/c/${c.id}`}>
                {rich && <path d={d} fill="none" stroke={c.crowns > 0 ? COLOR.daily : color} strokeOpacity={0.18} strokeWidth={6 + strength * 4} filter="url(#soft)" />}
                <path d={d} fill="none" className={`chain-line ${c.boost > 0 ? "pulse" : ""}`}
                  stroke={highlighted ? COLOR.hover : color} strokeOpacity={highlighted ? 1 : 0.25 + strength * 0.55} strokeWidth={highlighted ? 4 : 1 + strength * 2.2}
                  onPointerEnter={() => setHover(c.id)} onPointerLeave={() => setHover(null)} />
              </Link>
            );
          })}
          {/* Planets */}
          {[...pos.values()].map(({ x, y, look, p }) => {
            const { a, b } = skinColors(look);
            const r = 6 + look.size * 6 + Math.min(14, p.links * 0.8);
            return (
              <Link key={p.id} to={`/p/${p.username}`}>
                <g style={{ filter: `drop-shadow(0 0 ${r}px ${look.glow})` }}>
                  <defs>
                    <radialGradient id={`mp${p.id}`} cx="35%" cy="35%" r="70%">
                      <stop offset="0%" stopColor={a} />
                      <stop offset="100%" stopColor={b} />
                    </radialGradient>
                  </defs>
                  {look.rings && <ellipse cx={x} cy={y} rx={r * 1.8} ry={r * 0.5} fill="none" stroke={a} strokeOpacity="0.6" strokeWidth="2" transform={`rotate(${look.ringTilt} ${x} ${y})`} />}
                  <circle cx={x} cy={y} r={r} fill={`url(#mp${p.id})`} />
                  <text x={x} y={y + r + 14} textAnchor="middle" fontSize="11" fill="#d9d7ff" opacity="0.85">{p.display_name}</text>
                </g>
              </Link>
            );
          })}
          {/* Badges: stars from fans, boosts, topics - right at the chain */}
          {badges.map(({ c, x, y }) => {
            const label = [c.crowns > 0 ? `♛${c.crowns > 1 ? c.crowns : ""}` : "", c.duel ? "⚔ LIVE" : "", c.donated_stars > 0 ? `★ ${c.donated_stars}` : "", c.boost > 0 ? `⚡${c.boost}` : "", c.topic ? "✦" : ""].filter(Boolean).join("  ");
            const w = label.length * 7.2 + 16;
            const color = c.duel ? "#ff5a5a" : c.crowns > 0 ? COLOR.daily : c.topic ? COLOR.topic : COLOR.daily;
            return (
              <Link key={`b${c.id}`} to={`/c/${c.id}`}>
                <g onPointerEnter={() => setHover(c.id)} onPointerLeave={() => setHover(null)} className={c.duel ? "pulse" : undefined} style={{ filter: `drop-shadow(0 0 10px ${color})` }}>
                  <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11} fill="rgba(6,5,13,0.85)" stroke={color} strokeOpacity={0.9} strokeWidth={1.2} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{label}</text>
                </g>
              </Link>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70">{t("map_hint")}</div>
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded-xl bg-black/50 px-3 py-2 text-[11px] text-white/80">
        <span><i className="mr-2 inline-block h-2 w-5 rounded" style={{ background: COLOR.chain }} />{t("chain")}</span>
        <span><i className="mr-2 inline-block h-2 w-5 rounded" style={{ background: COLOR.daily }} />{t("daily_event")} / ★</span>
        <span><i className="mr-2 inline-block h-2 w-5 rounded" style={{ background: COLOR.topic }} />{t("topic_badge")}</span>
        <span><i className="mr-2 inline-block h-2 w-5 rounded" style={{ background: "#ff5a5a" }} />⚔ {t("duel")} · ♛ {t("duel_crowns")}</span>
        <span><i className="mr-2 inline-block h-0.5 w-5 border-t border-dashed" style={{ borderColor: "#8fd3ff" }} />{t("constellation_title")}</span>
      </div>
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-xl bg-black/75 px-3 py-2 text-sm backdrop-blur">
          <div className="font-semibold">{hovered.topic ? "✦ " : hovered.daily ? "☀ " : ""}{hovered.title}</div>
          <div className="muted text-xs">
            {t("n_links", { n: hovered.link_count })}
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
