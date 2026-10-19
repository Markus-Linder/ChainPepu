import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ensureDailyChain, getConstellationEdges, getMapEdges, getPayoutSettings, getStats, getWeekPool, listChains, listInviteLeaders, listLiveDuels, listProfiles, listStream, listTopics, listWeekLeaders, secondsUntilWeekEnd, settleWeek } from "@/lib/api";
import { displayTitle, secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { LANGS, useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import type { LinkRow } from "@/lib/types";
import { UniverseMap } from "@/components/UniverseMap";
import { ChainCard } from "@/components/ChainCard";
import { Countdown } from "@/components/Countdown";
import { DuelCard, DuelBar } from "@/components/Duel";
import { Planet } from "@/components/Planet";
import { Reveal } from "@/components/Reveal";
import { Icon } from "@/components/Icons";
import { MegaCard, ZeitketteCard } from "@/components/Zeitkette";

export default function Home() {
  const { t, lang } = useT();
  const { profile, loading: authLoading } = useAuth();
  const { data, loading } = useAsync(async () => {
    await ensureDailyChain().catch(() => {});
    await settleWeek().catch(() => {});
    const [users, chains, topics, edges, stats, settings, duels, orbits, leaders, week, pool, stream] = await Promise.all([
      listProfiles(), listChains("hot", 200), listTopics(6), getMapEdges(), getStats(), getPayoutSettings(), listLiveDuels(2).catch(() => []),
      getConstellationEdges(), listInviteLeaders(5).catch(() => []), listWeekLeaders(3).catch(() => []), getWeekPool().catch(() => 0), listStream(null, 4).catch(() => []),
    ]);
    return { users, chains, topics, edges, stats, settings, duels, orbits, leaders, week, pool, stream };
  }, []);

  const linkCount = new Map<string, number>();
  for (const e of data?.edges ?? []) {
    linkCount.set(e.from_user, (linkCount.get(e.from_user) ?? 0) + 1);
    linkCount.set(e.to_user, (linkCount.get(e.to_user) ?? 0) + 1);
  }
  const share = data?.settings.share ?? 80;
  const hot = data?.chains.filter((c) => !c.is_topic && !c.daily_day && !c.is_jackpot) ?? [];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ---------- Hero ---------- */}
      {!profile && !authLoading ? (
        <section className="hero grid items-center gap-8 p-7 sm:p-12 lg:grid-cols-[1.1fr_.9fr] lg:p-16">
          <img src="/brand/hero.jpg" alt="" className="hero-art" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="relative rise">
            <span className="eyebrow"><span className="live-dot" />{t("hero_eyebrow")}</span>
            <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
              {t("hero_title_1")}<br /><span className="text-gradient">{t("hero_title_2")}</span>
            </h1>
            <p className="muted mt-6 max-w-xl text-lg">{t("hero_text")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn btn-lg"><Icon name="planet" size={18} />{t("hero_cta")}</Link>
              <Link to="/stream" className="btn btn-ghost btn-lg"><Icon name="play" size={16} filled />{t("stream_cta")}</Link>
            </div>
            <ul className="muted mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <li><Icon name="check" size={14} className="mr-1 text-emerald-300" />{t("hero_trust_1")}</li>
              <li><Icon name="globe" size={14} className="mr-1" />{t("hero_trust_2", { n: LANGS.length })}</li>
              <li><Icon name="star" size={14} className="mr-1 text-[#f2c46d]" filled />{t("hero_trust_3", { share })}</li>
              <li><Icon name="shield" size={14} className="mr-1" />{t("hero_trust_4")}</li>
            </ul>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
            <div className="orbit" style={{ inset: "4%" }}><i /></div>
            <div className="orbit" style={{ inset: "18%", animationDuration: "45s", animationDirection: "reverse" }}><i style={{ background: "var(--accent-2)", boxShadow: "0 0 14px var(--accent-2)" }} /></div>
            <div className="float absolute inset-[24%]"><Planet seed={482913} skin="standard" level={9} size="fluid" title="" /></div>
          </div>
        </section>
      ) : profile ? (
        <section className="card card-glow flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <Planet seed={profile.planet_seed} skin={profile.planet_skin} level={profile.level} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{t("greeting", { name: profile.display_name })}</h1>
            <p className="muted text-sm">{t("greeting_sub", { n: profile.level ?? 1 })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/new" className="btn text-sm"><Icon name="spark" size={15} />{t("nav_start_chain")}</Link>
            <Link to="/stream" className="btn btn-ghost text-sm"><Icon name="play" size={14} filled />{t("nav_stream")}</Link>
          </div>
        </section>
      ) : null}

      {/* ---------- Time chain ---------- */}
      <Reveal><div className="grid gap-5"><ZeitketteCard /><MegaCard /></div></Reveal>

      {/* ---------- Live universe ---------- */}
      <section>
        <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="kicker">{t("live_title")}</p>
            <h2 className="mt-1 text-3xl font-bold sm:text-4xl">{t("map_title")}</h2>
            {data && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="eyebrow"><Icon name="planet" size={13} />{t("n_planets", { n: data.stats.users })}</span>
                <span className="eyebrow"><Icon name="chain" size={13} />{t("n_chains", { n: data.stats.chains })}</span>
                <span className="eyebrow"><Icon name="spark" size={13} />{t("n_links", { n: data.stats.links })}</span>
                <span className="eyebrow" style={{ color: "var(--star)" }}><Icon name="star" size={13} filled />{data.stats.stars}</span>
              </div>
            )}
          </div>
          <Link to="/today" className="glass lift flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
            <span style={{ color: "var(--star)" }}><Icon name="sun" size={18} /></span>
            <span><span className="kicker block">{t("today_label")}</span>{themeForDay(todayKey(), lang)}</span>
            <span className="muted whitespace-nowrap">· <Countdown seconds={secondsUntilMidnightUtc()} /></span>
          </Link>
        </div>
        {loading || !data ? <Loading /> : (
          <UniverseMap
            planets={data.users.map((u) => ({ id: u.id, username: u.username, display_name: u.display_name, seed: u.planet_seed, skin: u.planet_skin, level: u.level, galaxy: u.home_galaxy, links: linkCount.get(u.id) ?? 0 }))}
            chains={data.chains.map((c) => ({ id: c.id, title: displayTitle(c, lang), boost: c.boost, link_count: c.link_count, donated_stars: c.donated_stars, daily: Boolean(c.daily_day), topic: c.is_topic && Boolean(c.ends_at && new Date(c.ends_at) > new Date()), origin: c.origin_user_id, crowns: c.crowns ?? 0, duel: Boolean(c.active_duel_id), galaxy: c.galaxy }))}
            edges={data.edges}
            orbits={data.orbits}
          />
        )}
      </section>

      {/* ---------- Hot chains (marquee + grid) ---------- */}
      {hot.length > 0 && (
        <section>
          <div className="marquee mb-5"><div>{[...hot, ...hot].map((c, i) => <Link key={i} to={`/c/${c.id}`} className="eyebrow whitespace-nowrap hover:border-white/30">{c.crowns > 0 ? "♛ " : ""}{displayTitle(c, lang)} <span className="muted">· {c.link_count}</span></Link>)}</div></div>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold sm:text-3xl">{t("hot_chains")}</h2>
            <Link to="/chains" className="muted text-sm hover:text-white">{t("all_chains")}</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{hot.slice(0, 6).map((c, i) => <Reveal key={c.id} delay={i * 60}><ChainCard chain={c} /></Reveal>)}</div>
        </section>
      )}

      {/* ---------- Stream showcase ---------- */}
      <Reveal>
        <section className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="order-2 lg:order-1">
            <p className="kicker">{t("nav_stream")}</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-5xl">{t("stream_showcase_t")}</h2>
            <p className="muted mt-4 max-w-lg text-lg">{t("stream_showcase")}</p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="text-[#f2c46d]"><Icon name="star" size={16} filled /></span>{t("stream_point_1")}</li>
              <li className="flex items-center gap-2"><Icon name="reply" size={16} />{t("stream_point_2")}</li>
              <li className="flex items-center gap-2"><span className="text-lg leading-none">⑂</span>{t("stream_point_3")}</li>
            </ul>
            <Link to="/stream" className="btn mt-7"><Icon name="play" size={15} filled />{t("stream_cta")}</Link>
          </div>
          <div className="order-1 flex justify-center lg:order-2">
            <PhoneMock links={data?.stream ?? []} />
          </div>
        </section>
      </Reveal>

      {/* ---------- Creator economy ---------- */}
      <Reveal>
        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="img-card lift min-h-[22rem]">
            <img src="/brand/stars.jpg" alt="" loading="lazy" />
            <div className="shade" />
            <div className="body flex h-full flex-col justify-end p-7 sm:p-9">
              <p className="kicker" style={{ color: "var(--star)" }}>Creator economy</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-5xl"><span className="text-gold">{share} %</span> {t("creator_title_rest")}</h2>
              <p className="muted mt-3 max-w-xl">{t("creator_text", { share, platform: 100 - share })}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={profile ? "/new" : "/signup"} className="btn btn-gold"><Icon name="star" size={16} filled />{t("creator_cta")}</Link>
                <Link to="/dashboard" className="btn btn-ghost">{t("dash_title")}</Link>
              </div>
            </div>
          </div>
          <div className="grid gap-5">
            <div className="card card-glow flex items-center gap-5 p-6">
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="11" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f2c46d" strokeWidth="11" strokeDasharray={`${share * 2.513} 251.3`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{ color: "var(--star)" }}>{share} %</div>
              </div>
              <div>
                <p className="font-semibold">{t("creator_example_t")}</p>
                <p className="muted mt-1 text-sm">{t("creator_example", { total: 100, creator: Math.floor(100 * share / 100), platform: 100 - Math.floor(100 * share / 100) })}</p>
              </div>
            </div>
            {data && (
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <p className="kicker" style={{ color: "var(--star)" }}>{t("weekly_title")}</p>
                  <span className="muted text-xs">{t("ends_in")} <Countdown seconds={secondsUntilWeekEnd()} /></span>
                </div>
                <p className="mt-1 text-4xl font-bold" style={{ color: "var(--star)" }}>★ {data.pool}</p>
                <p className="muted text-xs">{t("weekly_pool")}</p>
                {data.week.length > 0 && (
                  <ol className="mt-3 space-y-1 text-sm">
                    {data.week.map((c, i) => <li key={c.id} className="flex items-center gap-2"><span className="muted w-4 text-xs">{i + 1}</span><Link to={`/c/${c.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{displayTitle(c, lang)}</Link><span className="muted text-xs">{t("duel_points", { n: c.week_points })}</span></li>)}
                  </ol>
                )}
              </div>
            )}
          </div>
        </section>
      </Reveal>

      {/* ---------- Duels & tournaments ---------- */}
      <Reveal>
        <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="grid gap-5">
            {data && data.duels.length > 0 ? data.duels.map((d) => <DuelCard key={d.id} duel={d} />) : (
              <div className="card p-6"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Icon name="swords" size={14} />{t("duel_kicker")}</div><DuelBar a={1} b={1} /><p className="muted mt-3 text-sm">{t("no_duels")}</p></div>
            )}
            <div className="flex flex-wrap gap-3">
              <Link to="/tournaments" className="btn btn-ghost text-sm"><Icon name="crown" size={14} />{t("tour_title")}</Link>
              <Link to="/leaderboards" className="btn btn-ghost text-sm"><Icon name="bolt" size={14} />{t("board_title")}</Link>
            </div>
          </div>
          <div className="img-card lift min-h-[20rem]">
            <img src="/brand/duel.jpg" alt="" loading="lazy" />
            <div className="shade" />
            <div className="body flex h-full flex-col justify-end p-7 sm:p-9">
              <p className="kicker flex items-center gap-2"><span className="live-dot" />{t("duels_title")}</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-5xl">{t("duels_showcase_t")}</h2>
              <p className="muted mt-3 max-w-xl">{t("duels_showcase")}</p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ---------- Topics & constellations ---------- */}
      <Reveal>
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="kicker"><span style={{ color: "#ff3d9a" }}>✦</span> {t("topics_title")}</p>
            <h2 className="mt-2 text-3xl font-bold">{t("topics_text")}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(data?.topics ?? []).slice(0, 4).map((c) => <ChainCard key={c.id} chain={c} />)}
              {data && data.topics.length === 0 && <p className="muted text-sm">{t("no_topics_yet")}</p>}
            </div>
            {profile && <Link to="/new?topic=1" className="btn btn-ghost mt-4 text-sm"><Icon name="comet" size={14} />{t("new_topic_title")}</Link>}
          </div>
          <div className="img-card lift min-h-[22rem]">
            <img src="/brand/constellation.jpg" alt="" loading="lazy" />
            <div className="shade" />
            <div className="body flex h-full flex-col justify-end p-7 sm:p-9">
              <p className="kicker">{t("constellation_title")}</p>
              <h2 className="mt-2 text-3xl font-bold">{t("constellation_showcase_t")}</h2>
              <p className="muted mt-2 text-sm">{t("constellation_text")}</p>
              {data && data.leaders.length > 0 && (
                <ol className="mt-4 flex flex-wrap gap-2">
                  {data.leaders.map((l, i) => (
                    <li key={l.id}><Link to={`/p/${l.username}`} className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs"><Planet seed={l.planet_seed} skin={l.planet_skin} size={24} /><span className="muted">#{i + 1}</span>{l.display_name}<span style={{ color: "var(--star)" }}>{l.invited_count}</span></Link></li>
                  ))}
                </ol>
              )}
              <p className="muted mt-3 text-xs">{t("invite_bonus")}</p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ---------- How it works ---------- */}
      <Reveal>
        <section>
          <p className="kicker text-center">{t("how_title")}</p>
          <h2 className="mt-2 text-center text-3xl font-bold sm:text-4xl">{t("how_headline")}</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="img-card lift min-h-[22rem]">
              <img src="/brand/planet.jpg" alt="" loading="lazy" />
              <div className="shade" />
              <div className="body flex h-full flex-col justify-end p-7"><span className="kicker">01</span><h3 className="mt-1 text-2xl font-bold">{t("how_1_t")}</h3><p className="muted mt-2 text-sm">{t("how_1")}</p></div>
            </div>
            <div className="card lift flex flex-col justify-end p-7"><span className="text-gradient"><Icon name="chain" size={34} /></span><span className="kicker mt-6">02</span><h3 className="mt-1 text-2xl font-bold">{t("how_2_t")}</h3><p className="muted mt-2 text-sm">{t("how_2")}</p></div>
            <div className="card lift flex flex-col justify-end p-7"><span className="text-[#f2c46d]"><Icon name="star" size={34} filled /></span><span className="kicker mt-6">03</span><h3 className="mt-1 text-2xl font-bold">{t("how_3_t")}</h3><p className="muted mt-2 text-sm">{t("how_3")}</p></div>
          </div>
        </section>
      </Reveal>

      {/* ---------- Safety + investors ---------- */}
      <Reveal>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card flex items-start gap-4 p-7">
            <span className="text-gradient"><Icon name="shield" size={36} /></span>
            <div><h2 className="text-2xl font-bold">{t("safety_title")}</h2><p className="muted mt-2 text-sm">{t("safety_text")}</p><Link to="/rules" className="mt-3 inline-block text-sm underline">{t("safety_link")}</Link></div>
          </div>
          <div className="card card-glow flex items-start gap-4 p-7">
            <span className="text-[#f2c46d]"><Icon name="globe" size={36} /></span>
            <div><h2 className="text-2xl font-bold">{t("investors_band_t")}</h2><p className="muted mt-2 text-sm">{t("investors_band")}</p><Link to="/about" className="btn btn-ghost mt-4 text-sm">{t("footer_about")} →</Link></div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

/** A phone showing three stream cards. Uses live links when there are any, else brand placeholders. */
function PhoneMock({ links }: { links: LinkRow[] }) {
  const { t, lang } = useT();
  const items = links.slice(0, 3);
  return (
    <div className="phone float">
      <div className="absolute inset-0 flex flex-col">
        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm" style={{ background: "radial-gradient(60% 60% at 50% 40%, #7b61ff55, #06050d)" }}>{t("stream_empty")}</div>
        ) : items.map((l, i) => (
          <div key={l.id} className="relative flex-1 overflow-hidden border-b border-white/10" style={{ background: `radial-gradient(70% 70% at 50% 30%, ${l.color}66, #06050d)` }}>
            {l.image_url && <img src={l.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
              <div className="flex items-center gap-2 text-[11px]"><Planet seed={l.profiles.planet_seed} skin={l.profiles.planet_skin} level={l.profiles.level} size={22} /><span className="font-semibold">{l.profiles.display_name}</span><span className="muted">· {l.chains ? displayTitle({ title: l.chains.title, daily_day: l.chains.daily_day }, lang).slice(0, 24) : ""}</span></div>
              <p className="mt-1 line-clamp-2 text-[12px]">{l.text}</p>
            </div>
            <div className="absolute bottom-3 right-2 flex flex-col items-center gap-2 text-[9px]">
              <span className="rounded-full bg-white/15 p-1.5 text-[#f2c46d]"><Icon name="star" size={13} filled /></span>
              <span className="rounded-full bg-white/15 p-1.5"><Icon name="reply" size={13} /></span>
            </div>
            {i === 0 && <span className="absolute left-3 top-9 rounded-full bg-black/50 px-2 py-0.5 text-[9px]"><span className="live-dot mr-1 h-1.5 w-1.5" />{t("nav_stream")}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
