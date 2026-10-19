import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { drawMega, getJackpot, getMega, isMegaParticipant, jackpotAlert, settleJackpot, subscribeJackpot } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useT } from "@/lib/i18n";
import { renderJackpotClip, shareBlob } from "@/lib/share";
import type { Jackpot } from "@/lib/types";
import { Icon } from "./Icons";
import { Planet } from "./Planet";

const ALERT_MIN = 15;

/** Live state of the time chain: fetched, subscribed, polled; settles the round when the clock hits zero. */
export function useJackpot(initial?: Jackpot | null) {
  const [j, setJ] = useState<Jackpot | null>(initial ?? null);
  const [now, setNow] = useState(Date.now());
  const alerted = useRef(false);
  const load = useCallback(() => getJackpot().then((x) => { setJ(x); if (x && !x.alerted) alerted.current = false; }).catch(() => {}), []);
  useEffect(() => { void load(); const off = subscribeJackpot(load); const poll = setInterval(load, 20000); return () => { off(); clearInterval(poll); }; }, [load]);
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);
  const remaining = j ? Math.max(0, Math.floor((new Date(j.ends_at).getTime() - now) / 1000)) : 0;
  useEffect(() => {
    if (!j) return;
    if (remaining === 0) { settleJackpot().then(load); return; }
    if (remaining < ALERT_MIN * 60 && !j.alerted && !alerted.current) { alerted.current = true; jackpotAlert().catch(() => {}); }
  }, [remaining === 0, remaining < ALERT_MIN * 60, j?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return { jackpot: j, remaining, reload: load };
}

export function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** The big card: countdown, pot, last link, call to action, share. */
export function ZeitketteCard({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const { profile } = useAuth();
  const { jackpot: j, remaining } = useJackpot();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (!j) return null;
  const urgent = remaining < ALERT_MIN * 60;
  const url = `${window.location.origin}/c/${j.chain_id}`;
  const share = async () => {
    setBusy(true);
    try {
      await document.fonts?.ready;
      const blob = await renderJackpotClip({ pot: j.pot_stars, remaining, round: j.round, lastName: j.last_display_name ?? "", url, labels: { title: t("zeit_title"), pot: t("zeit_pot"), last: t("zeit_last"), cta: t("share_zeit_cta"), ends: t("zeit_ends") } });
      const r = await shareBlob(blob, `zeitkette-${j.round}.png`, t("zeit_title"), url);
      setDone(r === "shared" ? t("share_done") : t("share_downloaded"));
    } finally { setBusy(false); }
  };
  return (
    <section className={`card card-glow relative overflow-hidden ${compact ? "p-5" : "p-6 sm:p-8"}`} style={{ "--glow": urgent ? "rgba(255,90,90,.45)" : "rgba(242,196,109,.3)" } as React.CSSProperties}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${urgent ? "rgba(255,90,90,.35)" : "rgba(242,196,109,.28)"}, transparent 70%)` }} />
      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="kicker flex items-center gap-2"><span className={`live-dot ${urgent ? "" : "opacity-70"}`} />{t("zeit_kicker")} · {t("zeit_round", { n: j.round })}</p>
          <h2 className={`mt-2 font-bold ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}>{t("zeit_title")}</h2>
          {!compact && <p className="muted mt-3 max-w-xl">{t("zeit_text")}</p>}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="kicker">{t("zeit_ends")}</p>
              <p className={`font-display mt-1 text-4xl font-bold tabular-nums sm:text-5xl ${urgent ? "text-[#ff7a7a]" : ""}`}>{fmt(remaining)}</p>
            </div>
            <div>
              <p className="kicker">{t("zeit_pot")}</p>
              <p className="font-display mt-1 text-4xl font-bold sm:text-5xl" style={{ color: "var(--star)" }}>★ {j.pot_stars}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="kicker">{t("zeit_last")}</p>
              {j.last_user_id ? (
                <Link to={`/p/${j.last_username}`} className="mt-1 flex items-center gap-2">
                  <Planet seed={j.last_seed ?? 1} skin={j.last_skin ?? "standard"} level={j.last_level ?? 1} size={44} />
                  <span className="text-lg font-semibold">{j.last_display_name}</span>
                </Link>
              ) : <p className="muted mt-2 text-sm">{t("zeit_nobody")}</p>}
            </div>
          </div>
          {urgent && <p className="mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-100"><Icon name="bolt" size={14} filled /> {t("zeit_hurry", { n: ALERT_MIN })}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={`/c/${j.chain_id}`} className="btn btn-gold"><Icon name="chain" size={16} />{t("zeit_cta")}</Link>
            <button className="btn btn-ghost" onClick={share} disabled={busy}><Icon name="comet" size={15} />{busy ? t("share_generating") : t("zeit_share")}</button>
          </div>
          {done && <p className="mt-2 text-xs text-emerald-200">{done}</p>}
          <p className="muted mt-4 text-xs">{t("zeit_rules_short", { n: 10, h: 24 })}{!profile && <> · {t("zeit_reset_hint", { h: 24 })}</>}</p>
        </div>
        {!compact && (
          <div className="relative mx-auto aspect-square w-full max-w-[260px]">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={urgent ? "#ff5a5a" : "#f2c46d"} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${Math.min(1, remaining / (24 * 3600)) * 276.5} 276.5`} style={{ transition: "stroke-dasharray 1s linear", filter: `drop-shadow(0 0 10px ${urgent ? "#ff5a5a" : "#f2c46d"})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="muted text-xs">{t("n_links", { n: j.link_count })}</span>
              <span className="text-2xl font-bold">{j.user_count}</span>
              <span className="muted text-xs">{t("n_planets", { n: j.user_count }).replace(/^\S+\s/, "")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Season draw: everyone who added a link to a time chain this season is in the pot. Drawn at the season's end. */
export function MegaCard() {
  const { t, locale } = useT();
  const { profile } = useAuth();
  const { data: mega, reload } = useAsync(getMega, []);
  const { data: inDraw } = useAsync(() => (profile ? isMegaParticipant(profile.id) : Promise.resolve(false)), [profile?.id, mega?.id]);
  useEffect(() => {
    if (!mega) return;
    const ms = new Date(mega.ends_at).getTime() - Date.now();
    if (ms <= 0) { drawMega().then(reload); return; }
    const timer = setTimeout(() => drawMega().then(reload), Math.min(ms + 2000, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [mega, reload]);
  if (!mega) return null;
  const days = Math.max(0, Math.ceil((new Date(mega.ends_at).getTime() - Date.now()) / 86400000));
  const date = new Date(new Date(mega.ends_at).getTime() - 1000).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <section className="card relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute -left-16 -bottom-24 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(123,97,255,.35), transparent 70%)" }} />
      <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="kicker"><Icon name="spark" size={13} /> {t("mega_title")}</p>
          <h3 className="mt-1 text-2xl font-bold">{t("mega_headline", { date })}</h3>
          <p className="muted mt-2 text-sm">{t("mega_text")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="eyebrow"><Icon name="users" size={13} />{t("mega_participants", { n: mega.participant_count })}</span>
            <span className="eyebrow"><Icon name="sun" size={13} />{t("n_days", { n: days })}</span>
            {profile && (inDraw ? <span className="eyebrow text-emerald-200"><Icon name="check" size={13} />{t("mega_in")}</span> : <span className="eyebrow">{t("mega_join")}</span>)}
          </div>
        </div>
        <div className="text-center">
          <p className="kicker">{t("mega_pot")}</p>
          <p className="font-display text-5xl font-bold" style={{ color: "var(--star)" }}>★ {mega.pot_stars}</p>
        </div>
      </div>
    </section>
  );
}

/** Thin strip under the navigation: the clock is always visible. */
export function ZeitketteStrip() {
  const { t } = useT();
  const { jackpot: j, remaining } = useJackpot();
  if (!j) return null;
  const urgent = remaining < ALERT_MIN * 60;
  return (
    <Link to={`/c/${j.chain_id}`} className={`flex items-center justify-center gap-3 px-4 py-1.5 text-xs transition ${urgent ? "bg-red-500/25 text-red-50" : "bg-white/5 text-white/80"} hover:bg-white/10`}>
      <span className={`live-dot ${urgent ? "" : "opacity-60"}`} />
      <span className="font-semibold">{t("zeit_title")}</span>
      <span className="font-mono tabular-nums">{fmt(remaining)}</span>
      <span style={{ color: "var(--star)" }}>★ {j.pot_stars}</span>
      {j.last_display_name && <span className="muted hidden sm:inline">· {t("zeit_last")}: <span className="text-white">{j.last_display_name}</span></span>}
      <span className="muted hidden sm:inline">· {t("zeit_cta")} →</span>
    </Link>
  );
}
