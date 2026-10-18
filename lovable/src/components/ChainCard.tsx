import { Link } from "react-router-dom";
import type { ChainStats } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { displayTitle, secondsUntil } from "@/lib/events";
import { Countdown } from "./Countdown";

export function ChainCard({ chain }: { chain: ChainStats }) {
  const { t, lang } = useT();
  const heat = Math.min(1, (chain.link_count + chain.boost * 3 + chain.donated_stars / 20) / 30);
  const ended = Boolean(chain.ends_at && new Date(chain.ends_at) < new Date());
  const glow = chain.is_topic ? "255,92,200" : "124,92,255";
  return (
    <Link to={`/c/${chain.id}`} className="card block p-4 transition hover:border-white/25"
      style={{ boxShadow: `0 0 ${10 + heat * 40}px rgba(${glow},${0.15 + heat * 0.4})` }}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">
          {chain.crowns > 0 && <span className="mr-1 text-[#f2c46d]" title={t("duel_crowns")}>♛{chain.crowns > 1 ? chain.crowns : ""} </span>}
          {chain.active_duel_id && <span className="mr-1 text-[#ff5a5a]" title={t("map_duel")}>⚔ </span>}
          {chain.daily_day ? "☀ " : chain.is_topic ? <span style={{ color: "#ff5cc8" }}>✦ </span> : ""}{displayTitle(chain, lang)}
        </h3>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {chain.donated_stars > 0 && <span title={t("stars_from_fans")} style={{ color: "var(--star)" }}>★ {chain.donated_stars}</span>}
          {chain.boost > 0 && <span title={t("boosted")}>⚡×{chain.boost}</span>}
        </div>
      </div>
      {chain.is_topic && chain.description && <p className="muted mt-1 line-clamp-2 text-xs">{chain.description}</p>}
      <p className="muted mt-2 text-xs">
        {t("n_links", { n: chain.link_count })} · {t("n_planets", { n: chain.user_count })}
        {chain.reply_count > 0 && <> · {t("n_replies", { n: chain.reply_count })}</>}
        {chain.origin_display_name ? ` · ${t("started_by", { name: chain.origin_display_name })}` : ` · ${t("daily_event")}`}
        {chain.is_topic && chain.ends_at && <> · {ended ? t("topic_ended") : <>{t("ends_in")} <Countdown seconds={secondsUntil(chain.ends_at)} /></>}</>}
      </p>
    </Link>
  );
}
