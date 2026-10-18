import { useState } from "react";
import { Link } from "react-router-dom";
import { listChainBoard, listCreatorBoard, listWeekLeaders, listWeeklyWinners } from "@/lib/api";
import { displayTitle } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { ChainCard } from "@/components/ChainCard";
import { Planet } from "@/components/Planet";
import { Icon, type IconName } from "@/components/Icons";

type Tab = { key: string; icon: IconName; kind: "creator" | "chain" | "week"; order: string };
const TABS: Tab[] = [
  { key: "board_week", icon: "sun", kind: "week", order: "" },
  { key: "board_stars", icon: "star", kind: "creator", order: "stars_received" },
  { key: "board_crowns", icon: "crown", kind: "creator", order: "crowns" },
  { key: "board_followers", icon: "users", kind: "creator", order: "follower_count" },
  { key: "board_level", icon: "planet", kind: "creator", order: "level" },
  { key: "board_longest", icon: "chain", kind: "chain", order: "link_count" },
  { key: "board_chain_stars", icon: "spark", kind: "chain", order: "donated_stars" },
];

export default function Leaderboards() {
  const { t, lang, locale } = useT();
  const [tab, setTab] = useState(TABS[0]);
  const { data, loading } = useAsync(async () => {
    if (tab.kind === "week") return { week: await listWeekLeaders(20), winners: await listWeeklyWinners(5) };
    if (tab.kind === "creator") return { creators: await listCreatorBoard(tab.order as "stars_received", 20) };
    return { chains: await listChainBoard(tab.order as "link_count", 20) };
  }, [tab.key]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name="crown" size={24} className="text-[#f2c46d]" />{t("board_title")}</h1>
        <p className="muted text-sm">{t("board_text")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((x) => <button key={x.key} onClick={() => setTab(x)} className={`btn btn-ghost text-xs ${tab.key === x.key ? "border-white/60" : ""}`}><Icon name={x.icon} size={13} />{t(x.key)}</button>)}
      </div>
      {loading || !data ? <Loading /> : (
        <>
          {"creators" in data && (
            <ol className="space-y-2">
              {data.creators!.map((c, i) => (
                <li key={c.id} className="card flex items-center gap-3 p-3">
                  <span className={`w-6 text-center font-bold ${i < 3 ? "text-[#f2c46d]" : "muted"}`}>{i + 1}</span>
                  <Planet seed={c.planet_seed} skin={c.planet_skin} level={c.level} size={40} />
                  <Link to={`/p/${c.username}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{c.display_name} <span className="muted text-xs font-normal">@{c.username}</span></Link>
                  <span className="muted hidden text-xs sm:inline">{t("level_short", { n: c.level })} · {t("n_chains", { n: c.chains_started })}</span>
                  <span className="font-bold" style={{ color: "var(--star)" }}>
                    {tab.order === "stars_received" ? `★ ${c.stars_received}` : tab.order === "crowns" ? `♛ ${c.crowns}` : tab.order === "follower_count" ? c.follower_count : tab.order === "level" ? t("level_short", { n: c.level }) : c.reach}
                  </span>
                </li>
              ))}
              {data.creators!.length === 0 && <p className="muted">{t("nothing_here")}</p>}
            </ol>
          )}
          {"chains" in data && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.chains!.map((c) => <ChainCard key={c.id} chain={c} />)}{data.chains!.length === 0 && <p className="muted">{t("nothing_here")}</p>}</div>
          )}
          {"week" in data && (
            <>
              <ol className="space-y-2">
                {data.week!.map((c, i) => (
                  <li key={c.id} className="card flex items-center gap-3 p-3">
                    <span className={`w-6 text-center font-bold ${i < 3 ? "text-[#f2c46d]" : "muted"}`}>{i + 1}</span>
                    <Link to={`/c/${c.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{displayTitle(c, lang)}</Link>
                    <span className="muted text-xs">{c.origin_display_name}</span>
                    <span className="font-bold">{t("duel_points", { n: c.week_points })}</span>
                  </li>
                ))}
                {data.week!.length === 0 && <p className="muted">{t("nothing_here")}</p>}
              </ol>
              {data.winners!.length > 0 && (
                <div className="card p-4 text-sm">
                  <h2 className="mb-2 font-semibold">{t("board_past_weeks")}</h2>
                  <ul className="space-y-1">{data.winners!.map((w) => <li key={w.week_start} className="flex justify-between"><span>{new Date(w.week_start).toLocaleDateString(locale)}</span><span>{w.winner_chain ? <Link to={`/c/${w.winner_chain}`} className="underline">#{w.winner_chain}</Link> : "–"} · <span style={{ color: "var(--star)" }}>★ {w.pool_stars}</span></span></li>)}</ul>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
