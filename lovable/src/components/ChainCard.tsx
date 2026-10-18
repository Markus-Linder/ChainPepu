import { Link } from "react-router-dom";
import type { ChainStats } from "@/lib/types";
import { glieder, planeten } from "@/lib/format";

export function ChainCard({ chain }: { chain: ChainStats }) {
  const heat = Math.min(1, (chain.link_count + chain.boost * 3 + chain.donated_stars / 20) / 30);
  return (
    <Link to={`/c/${chain.id}`} className="card block p-4 transition hover:border-white/25"
      style={{ boxShadow: `0 0 ${10 + heat * 40}px rgba(124,92,255,${0.15 + heat * 0.4})` }}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{chain.daily_day ? "☀ " : ""}{chain.title}</h3>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {chain.donated_stars > 0 && <span title="Gespendete Sterne" style={{ color: "var(--star)" }}>★ {chain.donated_stars}</span>}
          {chain.boost > 0 && <span title="Geboostet">⚡×{chain.boost}</span>}
        </div>
      </div>
      <p className="muted mt-2 text-xs">
        {glieder(chain.link_count)} · {planeten(chain.user_count)}
        {chain.origin_display_name ? ` · gestartet von ${chain.origin_display_name}` : " · Tages-Ereignis"}
      </p>
    </Link>
  );
}
