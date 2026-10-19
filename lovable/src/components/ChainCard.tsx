import { Link } from "react-router-dom";
import type { ChainStats } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { displayTitle, secondsUntil } from "@/lib/events";
import { Countdown } from "./Countdown";
import { Icon } from "./Icons";

/** Deterministic hue per chain so every card has its own atmosphere. */
function hueOf(id: number) { return (id * 47) % 360; }

export function ChainCard({ chain }: { chain: ChainStats }) {
  const { t, lang } = useT();
  const heat = Math.min(1, (chain.link_count + chain.boost * 3 + chain.donated_stars / 20) / 30);
  const ended = Boolean(chain.ends_at && new Date(chain.ends_at) < new Date());
  const hue = chain.is_topic ? 325 : chain.daily_day ? 42 : hueOf(chain.id);
  return (
    <Link to={`/c/${chain.id}`} className="card lift block overflow-hidden"
      style={{ boxShadow: `0 0 ${10 + heat * 40}px hsla(${hue},80%,60%,${0.1 + heat * 0.3})` }}>
      <div className="relative h-24 overflow-hidden" style={{ background: `radial-gradient(120% 90% at 20% 0%, hsla(${hue},85%,62%,.55), transparent 60%), radial-gradient(80% 80% at 90% 100%, hsla(${(hue + 60) % 360},80%,55%,.35), transparent 60%), #0b0919` }}>
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 70% 60%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 45% 80%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 85% 20%, #fff 50%, transparent 51%)" }} />
        <div className="absolute left-4 top-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
          {chain.daily_day && <span className="rounded-full bg-black/40 px-2 py-0.5" style={{ color: "var(--star)" }}>☀ {t("daily_event")}</span>}
          {chain.is_topic && <span className="rounded-full bg-black/40 px-2 py-0.5" style={{ color: "#ff5fb0" }}>✦ {t("topic_badge")}</span>}
          {chain.is_jackpot && <span className="rounded-full bg-black/40 px-2 py-0.5" style={{ color: "var(--star)" }}>⏱ {t("zeit_title")}</span>}
          {chain.active_duel_id && <span className="rounded-full bg-black/40 px-2 py-0.5 text-[#ff7a7a]"><span className="live-dot mr-1 h-1.5 w-1.5" />{t("map_duel")}</span>}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1.5 text-xs">
          {chain.crowns > 0 && <span className="rounded-full bg-black/40 px-2 py-0.5 text-[#f2c46d]" title={t("duel_crowns")}><Icon name="crown" size={12} /> {chain.crowns}</span>}
          {chain.boost > 0 && <span className="rounded-full bg-black/40 px-2 py-0.5" title={t("boosted")}><Icon name="bolt" size={12} filled /> {chain.boost}</span>}
        </div>
        <div className="absolute -bottom-6 left-4 h-14 w-14 rounded-full border-4 border-[#0b0919]" style={{ background: `radial-gradient(circle at 35% 30%, hsl(${hue} 80% 70%), hsl(${(hue + 50) % 360} 70% 28%) 70%, #05040c)`, boxShadow: `0 0 18px hsla(${hue},80%,60%,.6)` }} />
      </div>
      <div className="px-4 pb-4 pt-8">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{displayTitle(chain, lang)}</h3>
        {chain.is_topic && chain.description && <p className="muted mt-1 line-clamp-2 text-xs">{chain.description}</p>}
        <div className="muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span><Icon name="chain" size={12} className="mr-1" />{chain.link_count}</span>
          <span><Icon name="planet" size={12} className="mr-1" />{chain.user_count}</span>
          {chain.reply_count > 0 && <span><Icon name="reply" size={12} className="mr-1" />{chain.reply_count}</span>}
          {chain.donated_stars > 0 && <span style={{ color: "var(--star)" }}><Icon name="star" size={12} className="mr-1" filled />{chain.donated_stars}</span>}
          <span className="ml-auto truncate">{chain.origin_display_name ? chain.origin_display_name : ""}</span>
        </div>
        {chain.is_topic && chain.ends_at && <p className="mt-2 text-xs" style={{ color: "#ff5fb0" }}>{ended ? t("topic_ended") : <>{t("ends_in")} <Countdown seconds={secondsUntil(chain.ends_at)} /></>}</p>}
      </div>
    </Link>
  );
}
