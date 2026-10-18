import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ensureDailyChain, getMapEdges, getPayoutSettings, getStats, listChains, listLiveDuels, listProfiles, listTopics } from "@/lib/api";
import { DuelCard } from "@/components/Duel";
import { displayTitle, secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { UniverseMap } from "@/components/UniverseMap";
import { ChainCard } from "@/components/ChainCard";
import { Countdown } from "@/components/Countdown";
import { Icon, type IconName } from "@/components/Icons";

export default function Home() {
  const { t, lang } = useT();
  const { profile, loading: authLoading } = useAuth();
  const { data, loading } = useAsync(async () => {
    await ensureDailyChain().catch(() => {});
    const [users, chains, topics, edges, stats, settings, duels] = await Promise.all([listProfiles(), listChains("hot", 200), listTopics(6), getMapEdges(), getStats(), getPayoutSettings(), listLiveDuels(4).catch(() => [])]);
    return { users, chains, topics, edges, stats, settings, duels };
  }, []);

  const linkCount = new Map<string, number>();
  for (const e of data?.edges ?? []) {
    linkCount.set(e.from_user, (linkCount.get(e.from_user) ?? 0) + 1);
    linkCount.set(e.to_user, (linkCount.get(e.to_user) ?? 0) + 1);
  }
  const share = data?.settings.share ?? 80;
  const steps: { icon: IconName; t: string; d: string }[] = [
    { icon: "planet", t: "how_1_t", d: "how_1" },
    { icon: "chain", t: "how_2_t", d: "how_2" },
    { icon: "star", t: "how_3_t", d: "how_3" },
  ];

  return (
    <div className="space-y-10">
      {!profile && !authLoading && (
        <section className="hero rise p-8 text-center sm:p-14">
          <img src="/brand/hero.jpg" alt="" className="hero-art" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="relative">
            <p className="kicker mb-4">{t("tagline")}</p>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-6xl">
              {t("hero_title_1")}<br />
              <span className="text-gradient">{t("hero_title_2")}</span>
            </h1>
            <p className="muted mx-auto mt-5 max-w-xl text-base sm:text-lg">{t("hero_text")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="btn"><Icon name="planet" size={16} />{t("hero_cta")}</Link>
              <Link to="/today" className="btn btn-ghost"><Icon name="sun" size={16} />{t("hero_cta2")}</Link>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="text-2xl font-bold">{t("live_title")}</h2>
          {data && <p className="muted text-sm">{t("n_planets", { n: data.stats.users })} · {t("n_chains", { n: data.stats.chains })} · {t("n_links", { n: data.stats.links })} · <span style={{ color: "var(--star)" }}>★ {data.stats.stars}</span></p>}
        </div>
        <Link to="/today" className="card flex items-center gap-3 px-4 py-2 text-sm hover:border-white/25">
          <span style={{ color: "var(--star)" }}><Icon name="sun" size={16} /></span>
          <span><span className="font-semibold">{t("today_label")}</span> {themeForDay(todayKey(), lang)}</span>
          <span className="muted whitespace-nowrap">· {t("ends_in")} <Countdown seconds={secondsUntilMidnightUtc()} /></span>
        </Link>
      </section>

      {loading || !data ? <Loading /> : (
        <UniverseMap
          planets={data.users.map((u) => ({ id: u.id, username: u.username, display_name: u.display_name, seed: u.planet_seed, skin: u.planet_skin, links: linkCount.get(u.id) ?? 0 }))}
          chains={data.chains.map((c) => ({ id: c.id, title: displayTitle(c, lang), boost: c.boost, link_count: c.link_count, donated_stars: c.donated_stars, daily: Boolean(c.daily_day), topic: c.is_topic && Boolean(c.ends_at && new Date(c.ends_at) > new Date()), origin: c.origin_user_id, crowns: c.crowns ?? 0, duel: Boolean(c.active_duel_id) }))}
          edges={data.edges}
        />
      )}

      {data && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold"><span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" /><Icon name="swords" size={20} />{t("duels_title")}</h2>
              <p className="muted text-sm">{t("duels_text")}</p>
            </div>
          </div>
          {data.duels.length === 0 ? <p className="muted text-sm">{t("no_duels")}</p> : (
            <div className="grid gap-3 sm:grid-cols-2">{data.duels.map((d) => <DuelCard key={d.id} duel={d} />)}</div>
          )}
        </section>
      )}

      {data && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold"><span style={{ color: "#ff3d9a" }}>✦</span> {t("topics_title")}</h2>
              <p className="muted text-sm">{t("topics_text")}</p>
            </div>
            {profile && <Link to="/new?topic=1" className="btn btn-ghost whitespace-nowrap text-sm"><Icon name="comet" size={15} />{t("new_topic_title")}</Link>}
          </div>
          {data.topics.length === 0 ? <p className="muted text-sm">{t("no_topics_yet")}</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.topics.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-bold">{t("hot_chains")}</h2>
          <Link to="/chains" className="muted text-sm hover:text-white">{t("all_chains")}</Link>
        </div>
        {data && data.chains.length === 0 ? <p className="muted">{t("no_chains_yet")}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.chains.filter((c) => !c.is_topic).slice(0, 9).map((c) => <ChainCard key={c.id} chain={c} />)}</div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.t} className="card p-5">
            <div className="mb-3 flex items-center gap-2"><span className="text-gradient"><Icon name={s.icon} size={22} /></span><span className="kicker">0{i + 1}</span></div>
            <h3 className="font-semibold">{t(s.t)}</h3>
            <p className="muted mt-1 text-sm">{t(s.d)}</p>
          </div>
        ))}
      </section>

      <section className="card card-glow grid gap-6 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
        <div>
          <p className="kicker mb-2" style={{ color: "var(--star)" }}>Creator economy</p>
          <h2 className="text-2xl font-bold sm:text-3xl">{t("creator_title", { share })}</h2>
          <p className="muted mt-3">{t("creator_text", { share, platform: 100 - share })}</p>
          <p className="mt-3 text-sm"><span style={{ color: "var(--star)" }}>★</span> {t("creator_example", { total: 100, creator: Math.floor(100 * share / 100), platform: 100 - Math.floor(100 * share / 100) })}</p>
          <Link to={profile ? "/new" : "/signup"} className="btn btn-gold mt-5"><Icon name="star" size={16} filled />{t("creator_cta")}</Link>
        </div>
        <div className="flex items-center justify-center">
          <div className="relative h-44 w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f2c46d" strokeWidth="12" strokeDasharray={`${share * 2.513} 251.3`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: "var(--star)" }}>{share} %</span>
              <span className="muted text-xs">Creator</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="text-gradient"><Icon name="shield" size={40} /></span>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{t("safety_title")}</h2>
          <p className="muted mt-1 text-sm">{t("safety_text")}</p>
        </div>
        <Link to="/rules" className="btn btn-ghost whitespace-nowrap text-sm">{t("safety_link")}</Link>
      </section>
    </div>
  );
}
