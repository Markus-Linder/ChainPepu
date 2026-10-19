import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getChain, getLinks, getPayoutSettings, listDonations, listDuelsForChain, listReplies } from "@/lib/api";
import { ChallengeForm, DuelBanner, DuelCard } from "@/components/Duel";
import { ShareClip } from "@/components/ShareClip";
import { ZeitketteCard } from "@/components/Zeitkette";
import { ChainCard } from "@/components/ChainCard";
import { listBranches } from "@/lib/api";
import { displayTitle, secondsUntil } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { BOOST_COST } from "@/lib/shop";
import { useAsync, Loading } from "@/lib/useAsync";
import { AppendLinkForm, BoostButton, DonateForm, FollowButton, InviteButton, Notice } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";
import { ChainPlayer } from "@/components/ChainPlayer";
import { Countdown } from "@/components/Countdown";
import { Icon } from "@/components/Icons";
import NotFound from "./NotFound";

export default function Chain() {
  const id = Number(useParams().id);
  const { t, lang } = useT();
  const { profile } = useAuth();
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (notice) window.history.replaceState({}, ""); }, [notice]);
  const { data, loading, reload } = useAsync(async () => {
    const chain = await getChain(id);
    if (!chain) return null;
    const [links, replies, donations, settings, duels, branches] = await Promise.all([getLinks(id), listReplies(id), listDonations(id), getPayoutSettings(), listDuelsForChain(id).catch(() => []), listBranches(id).catch(() => [])]);
    return { chain, links, replies, donations, settings, duels, branches };
  }, [id]);
  if (loading) return <Loading />;
  if (!data) return <NotFound />;
  const { chain, links, replies, donations, settings, duels, branches } = data;
  const activeDuel = duels.find((d) => d.status === "offen" || d.status === "laeuft");
  const pastDuels = duels.filter((d) => d.status === "beendet");
  const visible = links.filter((l) => l.status === "sichtbar");
  const title = displayTitle(chain, lang);
  const ended = Boolean(chain.ends_at && new Date(chain.ends_at) < new Date());
  const blockedMine = notice && /^(Not published|Nicht veröffentlicht|No publicado|Non publié|Não publicado)/.test(notice);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {playing && <ChainPlayer title={title} links={visible} onClose={() => setPlaying(false)} />}
      <div>
        <div className="mb-6">
          <p className="kicker">
            {chain.daily_day ? t("daily_event_on", { date: chain.daily_day }) : chain.is_jackpot ? <span style={{ color: "var(--star)" }}>⏱ {t("zeit_title")}</span> : chain.is_topic ? <span style={{ color: "#ff3d9a" }}>✦ {t("topic_badge")}</span> : t("chain")}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{chain.crowns > 0 && <span className="mr-2 text-[#f2c46d]" title={t("duel_crowns")}><Icon name="crown" size={24} />{chain.crowns > 1 ? ` ${chain.crowns}` : ""}</span>}{title}</h1>
          {chain.is_topic && chain.description && <p className="mt-2 text-base">{chain.description}</p>}
          <p className="muted mt-2 text-sm">
            {t("n_links", { n: chain.link_count })} · {t("n_planets", { n: chain.user_count })}
            {chain.origin_username && <> · {t("origin")}: <Link to={`/p/${chain.origin_username}`} className="underline">{chain.origin_display_name}</Link></>}
            {chain.boost > 0 && <> · {t("boost_x", { n: chain.boost })}</>}
            {chain.donated_stars > 0 && <> · <span style={{ color: "var(--star)" }}>{t("stars_donated", { n: chain.donated_stars })}</span></>}
            {chain.is_topic && chain.ends_at && <> · {ended ? t("topic_ended") : <>{t("ends_in")} <Countdown seconds={secondsUntil(chain.ends_at)} /></>}</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn text-sm" onClick={() => setPlaying(true)} disabled={visible.length === 0}><Icon name="play" size={14} filled />{t("play_chain")}</button>
            {chain.origin_user_id && <FollowButton creatorId={chain.origin_user_id} />}
          </div>
          {notice && <div className="mt-3"><Notice error={blockedMine ? notice : null} ok={blockedMine ? null : notice} /></div>}
        </div>
        {activeDuel && <DuelBanner duel={activeDuel} chainId={chain.id} />}
        {chain.is_jackpot && <div className="mb-6"><ZeitketteCard compact /></div>}
        <ol className="space-y-4">
          {links.map((l) => <LinkItem key={l.id} link={l} isOrigin={l.user_id === chain.origin_user_id && l.position === 1} replies={replies.filter((r) => r.link_id === l.id)} onChanged={reload} />)}
        </ol>
        {branches.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">⑂ {t("branches_title")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">{branches.map((b) => <ChainCard key={b.id} chain={b} />)}</div>
          </section>
        )}
        {!ended && (
          <div className="card mt-6 p-4">
            <h2 className="mb-3 font-semibold">{t("add_your_link")}</h2>
            {profile ? <AppendLinkForm chainId={chain.id} onDone={() => { setNotice(null); reload(); }} /> : (
              <p className="muted text-sm">
                <Link to={`/signup?next=/c/${chain.id}`} className="btn mr-2">{t("join_create")}</Link>
                {t("join_or")} <Link to={`/login?next=/c/${chain.id}`} className="underline">{t("join_login")}</Link> {t("join_to_join")}
              </p>
            )}
          </div>
        )}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <ShareClip chain={chain} title={title} firstLink={visible[0]} />
        {chain.origin_user_id && chain.origin_display_name && (
          <div className="card card-glow p-4">
            <h2 className="mb-2 flex items-center gap-2 font-semibold"><span style={{ color: "var(--star)" }}><Icon name="star" size={16} filled /></span>{t("support_name", { name: chain.origin_display_name })}</h2>
            <DonateForm chainId={chain.id} creatorName={chain.origin_display_name} share={settings.share} onDone={reload} />
            {donations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs">
                {donations.slice(0, 5).map((d) => (
                  <li key={d.id}><span style={{ color: "var(--star)" }}>★ {d.stars}</span> {t("from")} <Link to={`/p/${d.profiles.username}`} className="underline">{d.profiles.display_name}</Link>{d.message && <span className="muted"> · “{d.message}”</span>}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {!activeDuel && !chain.daily_day && !chain.is_jackpot && <ChallengeForm target={chain} />}
        {pastDuels.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon name="swords" size={14} />{t("duel_history")}</h2>
            {pastDuels.slice(0, 3).map((d) => <DuelCard key={d.id} duel={d} />)}
          </div>
        )}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("carry_on")}</h2>
          {profile ? <InviteButton chainId={chain.id} /> : <p className="muted text-sm">{t("login_for_invites")}</p>}
        </div>
        {profile && (
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">{t("shine_brighter")}</h2>
            <p className="muted mb-3 text-xs">{t("boost_desc")}</p>
            <BoostButton chainId={chain.id} cost={BOOST_COST} onDone={reload} />
          </div>
        )}
        <div className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">{t("chain_link")}</h2>
          <code className="block break-all text-xs">{window.location.origin}/c/{chain.id}</code>
        </div>
      </aside>
    </div>
  );
}
