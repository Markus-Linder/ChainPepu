
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { planetLook, skinColors } from "@/lib/planet";
import { glieder } from "@/lib/format";

export type MapPlanet = { id: string; username: string; display_name: string; seed: number; skin: string; links: number };
export type MapChain = { id: number; title: string; boost: number; link_count: number; daily: boolean };
export type MapEdgeView = { chain_id: number; from_user: string; to_user: string };

const W = 1200;
const H = 800;

export function UniverseMap({ planets, chains, edges }: { planets: MapPlanet[]; chains: MapChain[]; edges: MapEdgeView[] }) {
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

  function onWheel(e: React.WheelEvent) {
    const k = Math.min(4, Math.max(0.5, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    setView((v) => ({ ...v, k }));
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40" style={{ aspectRatio: "3 / 2" }}>
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
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(124,92,255,0)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: "center" }}>
          <circle cx={W / 2} cy={H / 2} r={260} fill="url(#core)" />
          {/* Ketten als Stränge zwischen Planeten */}
          {edges.map((e, i) => {
            const a = pos.get(e.from_user);
            const b = pos.get(e.to_user);
            const c = chainById.get(e.chain_id);
            if (!a || !b || !c) return null;
            const strength = Math.min(1, 0.25 + (c.link_count + c.boost * 3) / 40);
            const highlighted = hover === e.chain_id;
            const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.2;
            const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.2;
            return (
              <Link key={i} to={`/c/${c.id}`}>
                <path
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  fill="none"
                  className={`chain-line ${c.boost > 0 ? "pulse" : ""}`}
                  stroke={c.daily ? "#ffd26b" : highlighted ? "#ff5cc8" : "#7c5cff"}
                  strokeOpacity={highlighted ? 1 : strength}
                  strokeWidth={highlighted ? 5 : 1.5 + strength * 3}
                  onPointerEnter={() => setHover(c.id)}
                  onPointerLeave={() => setHover(null)}
                />
              </Link>
            );
          })}
          {/* Planeten */}
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
                  <text x={x} y={y + r + 14} textAnchor="middle" fontSize="11" fill="#d9d7ff" opacity="0.85">
                    {p.display_name}
                  </text>
                </g>
              </Link>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70">
        Ziehen zum Bewegen · Scrollen zum Zoomen · Klick auf Planet oder Kette
      </div>
      {hover !== null && chainById.get(hover) && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-xl bg-black/70 px-3 py-2 text-sm">
          <div className="font-semibold">{chainById.get(hover)!.title}</div>
          <div className="muted text-xs">{glieder(chainById.get(hover)!.link_count)}</div>
        </div>
      )}
    </div>
  );
}
