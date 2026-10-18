import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { finishDuel, getDuel, getDuelSettings, getPayoutSettings, listDuelEvents, subscribeDuel } from "@/lib/api";
import { displayTitle, secondsUntil } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import type { ChainStats, DuelView } from "@/lib/types";
import { Countdown } from "@/components/Countdown";
import { DuelBar, DuelStatusBadge, RespondButtons, SIDE_COLOR } from "@/components/Duel";
import { DonateForm } from "@/components/Forms";
import { Icon } from "@/components/Icons";
import NotFound from "./NotFound";

/** The arena: both chains side by side, the live bar, the ticker. Updates in real time. */
export default function Arena() {
  const id = Number(useParams().id);
  const { t, lang, locale } = useT();
  const { profile } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const duel = await getDuel(id);
    if (!duel) return null;
    const [events, settings, payout] = await Promise.all([listDuelEvents(id), getDuelSettings(), getPayoutSettings()]);
    return { duel, events, settings, payout };
  }, [id]);

  // Realtime plus a slow poll as safety net; finish the duel once the time is up.
  useEffect(() => {
    const off = subscribeDuel(id, reload);
    const timer = setInterval(reload, 15000);
    return () => { off(); clearInterval(timer); };
  }, [id, reload]);
  useEffect(() => {
    const d = data?.duel;
    if (!d || d.status !== "laeuft" || !d.ends_at) return;
    const ms = new Date(d.ends_at).getTime() - Date.now();
    const timer = setTimeout(() => { finishDuel(id).catch(() => {}).then(reload); }, Math.max(500, ms + 1000));
    return () => clearTimeout(timer);
  }, [data, id, reload]);

  if (loading && !data) return <Loading />;
  if (!data) return <NotFound />;
  const { duel, events, settings, payout } = data;
  const live = duel.status === "laeuft" && duel.ends_at && new Date(duel.ends_at) > new Date();
  const winner = duel.status === "beendet" ? (duel.winner_chain === duel.a.id ? "a" : duel.winner_chain === duel.b.id ? "b" : null) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="hero p-6 text-center sm:p-8">
        <div className="relative">
          <p className="kicker flex items-center justify-center gap-2"><Icon name="swords" size={14} />{t("duel_kicker")} <DuelStatusBadge duel={duel} /></p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <h1 className="text-xl font-bold leading-tight sm:text-3xl" style={{ color: SIDE_COLOR.a }}>{winner === "a" && <Icon name="crown" size={22} className="mr-1 text-[#f2c46d]" />}{displayTitle(duel.a, lang)}</h1>
            <span className="font-display text-2xl font-bold text-white/60 sm:text-4xl">{t("duel_vs")}</span>
            <h1 className="text-xl font-bold leading-tight sm:text-3xl" style={{ color: SIDE_COLOR.b }}>{winner === "b" && <Icon name="crown" size={22} className="mr-1 text-[#f2c46d]" />}{displayTitle(duel.b, lang)}</h1>
          </div>
          <div className="mt-5"><DuelBar a={duel.score_a} b={duel.score_b} big /></div>
          <p className="muted mt-3 text-sm">
            {live && duel.ends_at && <>{t("ends_in")} <Countdown seconds={secondsUntil(duel.ends_at)} /> · </>}
            {duel.status === "beendet" && <><span className="text-white">{t("duel_winner")}:</span> {winner ? displayTitle(winner === "a" ? duel.a : duel.b, lang) : t("duel_draw")} · </>}
            {t("duel_how", { link: settings.link, reply: settings.reply, mult: settings.mult })}
          </p>
          {duel.status === "offen" && <div className="mx-auto mt-4 max-w-sm"><RespondButtons duel={duel} onDone={reload} /></div>}
          {duel.status === "laeuft" && duel.ends_at && new Date(duel.ends_at) <= new Date() && (
            <button className="btn btn-ghost mt-4 text-sm" onClick={() => finishDuel(id).then(reload)}>{t("duel_finish")}</button>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Side chain={duel.a} side="a" duel={duel} live={Boolean(live)} share={payout.share} onDone={reload} canDonate={Boolean(profile)} />
        <Side chain={duel.b} side="b" duel={duel} live={Boolean(live)} share={payout.share} onDone={reload} canDonate={Boolean(profile)} />
      </div>

      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />{t("duel_ticker")}</h2>
        {events.length === 0 ? <p className="muted text-sm">{t("still_quiet")}</p> : (
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: SIDE_COLOR[e.side] }} />
                <span className="flex-1">{t(`duel_event_${e.kind}`, { actor: e.actor_name ?? "?" })}</span>
                <span className="font-semibold" style={{ color: e.kind === "stern" ? "var(--star)" : SIDE_COLOR[e.side] }}>+{e.points}</span>
                <span className="muted text-xs">{new Date(e.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Side({ chain, side, duel, live, share, onDone, canDonate }: { chain: ChainStats; side: "a" | "b"; duel: DuelView; live: boolean; share: number; onDone: () => void; canDonate: boolean }) {
  const { t, lang } = useT();
  const score = side === "a" ? duel.score_a : duel.score_b;
  return (
    <section className="card p-4" style={{ borderTop: `3px solid ${SIDE_COLOR[side]}` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/c/${chain.id}`} className="font-semibold hover:underline" style={{ color: SIDE_COLOR[side] }}>{displayTitle(chain, lang)}</Link>
          <p className="muted text-xs">
            <Link to={`/p/${chain.origin_username}`} className="underline">{chain.origin_display_name}</Link> · {t("n_links", { n: chain.link_count })} · {t("n_planets", { n: chain.user_count })}
            {chain.crowns > 0 && <> · <Icon name="crown" size={12} /> {chain.crowns}</>}
          </p>
        </div>
        <div className="text-right text-lg font-bold" style={{ color: SIDE_COLOR[side] }}>{t("duel_points", { n: score })}</div>
      </div>
      {live && (
        <div className="mt-3 space-y-3">
          <Link to={`/c/${chain.id}`} className="btn btn-ghost w-full text-sm"><Icon name="chain" size={14} />{t("duel_join")}</Link>
          {canDonate && chain.origin_display_name && (
            <div>
              <p className="mb-1 text-xs font-semibold"><span style={{ color: "var(--star)" }}>★</span> {t("duel_donate")}</p>
              <DonateForm chainId={chain.id} creatorName={chain.origin_display_name} share={share} onDone={onDone} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
