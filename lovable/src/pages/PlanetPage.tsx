import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getCreatorStats, getPayoutSettings, getProfileByUsername, listChainsByOrigin, listChainsJoined, listDuelsForUser, listLinksByUser, listPayouts } from "@/lib/api";
import { DuelCard } from "@/components/Duel";
import { displayTitle } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { Planet } from "@/components/Planet";
import { ChainCard } from "@/components/ChainCard";
import { EarningsPanel, FollowButton, money } from "@/components/Forms";
import { Icon } from "@/components/Icons";
import NotFound from "./NotFound";

export default function PlanetPage() {
  const username = String(useParams().username);
  const { t, lang, locale } = useT();
  const { profile: me } = useAuth();
  const [query, setQuery] = useState("");
  const { data, loading, reload } = useAsync(async () => {
    const user = await getProfileByUsername(username);
    if (!user) return null;
    const mine = me?.id === user.id;
    const [started, joined, recent, creator, settings, payouts, duels] = await Promise.all([
      listChainsByOrigin(user.id), listChainsJoined(user.id), listLinksByUser(user.id, 10), getCreatorStats(user.id), getPayoutSettings(), mine ? listPayouts() : Promise.resolve([]), listDuelsForUser(user.id).catch(() => []),
    ]);
    return { user, started, joined, recent, creator, settings, payouts, duels };
  }, [username, me?.stars, me?.planet_skin, me?.earned_stars]);

  // Archive: every chain this creator ever started, grouped by year, searchable. Nothing is ever lost.
  const archive = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.started ?? []).filter((c) => !q || displayTitle(c, lang).toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
    const groups = new Map<string, typeof list>();
    for (const c of list) { const y = new Date(c.created_at).getFullYear().toString(); groups.set(y, [...(groups.get(y) ?? []), c]); }
    return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [data, query, lang]);

  if (loading) return <Loading />;
  if (!data) return <NotFound />;
  const { user, started, joined, recent, creator, settings, payouts, duels } = data;
  const mine = me?.id === user.id;
  const totalReach = started.reduce((s, c) => s + c.link_count, 0);
  const crowns = started.reduce((s, c) => s + (c.crowns ?? 0), 0);

  return (
    <div className="space-y-8">
      <section className="card card-glow flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start">
        <Planet seed={user.planet_seed} skin={user.planet_skin} size={160} title={user.display_name} />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold">{user.display_name}</h1>
          <p className="muted">@{user.username} · {t("skin")} {t(`skin_${user.planet_skin}`)}</p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center sm:grid-cols-5">
            <Stat n={creator.follower_count} label={t("stat_followers")} />
            <Stat n={started.length} label={t("stat_chains_started")} />
            <Stat n={totalReach} label={t("stat_reach")} />
            <Stat n={creator.donated_total} label={t("stat_stars_received")} gold />
            <Stat n={user.duel_wins ?? crowns} label={t("duel_wins")} gold prefix={<Icon name="crown" size={18} />} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <FollowButton creatorId={user.id} onChange={reload} />
            {mine && <Link to="/new" className="btn"><Icon name="spark" size={15} />{t("nav_start_chain")}</Link>}
            {mine && <Link to="/shop" className="btn btn-ghost">{t("design_planet", { n: me!.stars })}</Link>}
          </div>
        </div>
      </section>

      {mine && (
        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <EarningsPanel min={settings.min} cents={settings.cents} share={settings.share} />
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">{t("payouts")}</h2>
            {payouts.length === 0 ? <p className="muted text-sm">{t("none_yet")}</p> : (
              <ul className="space-y-1 text-sm">
                {payouts.map((p) => <li key={p.id} className="flex justify-between"><span>{new Date(p.created_at).toLocaleDateString(locale)} · ★ {p.stars}</span><span className="muted">{money(p.cents, locale)} · {p.status}</span></li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold">{t("chains_origin_here")} <span className="muted text-sm font-normal">({started.length})</span></h2>
          {started.length > 6 && <input className="input w-full sm:w-64" placeholder="🔍" value={query} onChange={(e) => setQuery(e.target.value)} />}
        </div>
        {started.length === 0 ? <p className="muted">{t("none_yet")} {mine && <Link to="/new" className="underline">{t("start_first_q")}</Link>}</p> : (
          archive.map(([year, list]) => (
            <div key={year} className="mb-5">
              {archive.length > 1 && <p className="kicker mb-2">{year}</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
            </div>
          ))
        )}
      </section>
      {duels.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Icon name="swords" size={20} />{t("duel_history")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">{duels.map((d) => <DuelCard key={d.id} duel={d} />)}</div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl font-bold">{t("chains_joined")}</h2>
        {joined.length === 0 ? <p className="muted">{t("none_yet")}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{joined.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">{t("recent_links")}</h2>
        <ul className="space-y-2">
          {recent.map((l) => (
            <li key={l.id} className="card p-3 text-sm" style={{ borderLeft: `4px solid ${l.color}` }}>
              <Link to={`/c/${l.chain_id}`} className="muted text-xs hover:underline">{t("in_chain", { title: l.chains ? displayTitle(l.chains, lang) : "" })} · #{l.position}{l.video_url ? " · 🎬" : ""}</Link>
              <p className="mt-1 line-clamp-3">{l.text}</p>
            </li>
          ))}
          {recent.length === 0 && <p className="muted">{t("still_quiet")}</p>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ n, label, gold, prefix }: { n: number; label: string; gold?: boolean; prefix?: React.ReactNode }) {
  return <div><div className="text-2xl font-bold" style={gold ? { color: "var(--star)" } : undefined}>{prefix ?? (gold ? "★ " : "")}{n}</div><div className="muted text-xs">{label}</div></div>;
}
