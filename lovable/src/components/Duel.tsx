import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { createDuel, listChainsByOrigin, respondDuel } from "@/lib/api";
import { displayTitle, secondsUntil } from "@/lib/events";
import { messageOf, useT } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import type { ChainStats, DuelView } from "@/lib/types";
import { Countdown } from "./Countdown";
import { Icon } from "./Icons";
import { Notice } from "./Forms";

export const SIDE_COLOR = { a: "#7b61ff", b: "#ff3d9a" };

/** The tug-of-war bar: who is ahead, live. */
export function DuelBar({ a, b, big = false }: { a: number; b: number; big?: boolean }) {
  const total = a + b;
  const pct = total === 0 ? 50 : Math.round((a / total) * 100);
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-white/10 ${big ? "h-7" : "h-3"}`}>
      <div className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${SIDE_COLOR.a}, #a08cff)`, boxShadow: `0 0 18px ${SIDE_COLOR.a}` }} />
      <div className="absolute inset-y-0 right-0 transition-all duration-700" style={{ width: `${100 - pct}%`, background: `linear-gradient(90deg, #ff7cc0, ${SIDE_COLOR.b})`, boxShadow: `0 0 18px ${SIDE_COLOR.b}` }} />
      <div className="absolute inset-y-0 w-0.5 bg-white transition-all duration-700" style={{ left: `calc(${pct}% - 1px)` }} />
      {big && (
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white drop-shadow">
          <span>{a}</span><span>{pct} %</span><span>{b}</span>
        </div>
      )}
    </div>
  );
}

export function DuelStatusBadge({ duel }: { duel: DuelView }) {
  const { t } = useT();
  const map: Record<string, { cls: string; key: string }> = {
    offen: { cls: "bg-sky-500/20 text-sky-200", key: "duel_open" },
    laeuft: { cls: "bg-red-500/25 text-red-100", key: "duel_running" },
    beendet: { cls: "bg-white/10", key: "duel_ended" },
    abgelehnt: { cls: "bg-white/10 muted", key: "duel_declined" },
  };
  const m = map[duel.status];
  const label = duel.status === "offen" ? t("duel_open", { name: duel.b.origin_display_name ?? "" }) : t(m.key);
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${m.cls}`}>{duel.status === "laeuft" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />}{label}</span>;
}

/** Compact duel card for the home page and lists. */
export function DuelCard({ duel }: { duel: DuelView }) {
  const { t, lang } = useT();
  const live = duel.status === "laeuft" && duel.ends_at && new Date(duel.ends_at) > new Date();
  return (
    <Link to={`/duel/${duel.id}`} className="card card-glow block p-4 transition hover:border-white/25">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 font-semibold"><Icon name="swords" size={14} />{t("duel_kicker")}</span>
        <DuelStatusBadge duel={duel} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <span className="truncate font-semibold" style={{ color: SIDE_COLOR.a }}>{displayTitle(duel.a, lang)}</span>
        <span className="muted text-xs">{t("duel_vs")}</span>
        <span className="truncate text-right font-semibold" style={{ color: SIDE_COLOR.b }}>{displayTitle(duel.b, lang)}</span>
      </div>
      <div className="my-2"><DuelBar a={duel.score_a} b={duel.score_b} /></div>
      <div className="muted flex justify-between text-xs">
        <span>{duel.a.origin_display_name}</span>
        {live && duel.ends_at && <span>{t("ends_in")} <Countdown seconds={secondsUntil(duel.ends_at)} /></span>}
        {duel.status === "beendet" && <span><Icon name="crown" size={12} /> {duel.winner_chain ? displayTitle(duel.winner_chain === duel.a.id ? duel.a : duel.b, lang) : t("duel_draw")}</span>}
        <span>{duel.b.origin_display_name}</span>
      </div>
    </Link>
  );
}

const DURATIONS = [60, 180, 720, 1440];

/** Challenge another creator's chain with one of mine. */
export function ChallengeForm({ target }: { target: ChainStats }) {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const nav = useNavigate();
  const mine = useAsync(() => (profile ? listChainsByOrigin(profile.id) : Promise.resolve([])), [profile?.id]);
  const [chain, setChain] = useState<number | "">("");
  const [minutes, setMinutes] = useState(180);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!profile || profile.id === target.origin_user_id || !target.origin_user_id) return null;
  const options = (mine.data ?? []).filter((c) => c.id !== target.id && !c.active_duel_id);
  const label = (m: number) => (m < 60 ? t("duel_minutes", { n: m }) : t("duel_hours", { n: m / 60 }));
  const submit = async () => {
    if (chain === "") return;
    setError(null); setPending(true);
    try { const id = await createDuel(Number(chain), target.id, minutes); nav(`/duel/${id}`); }
    catch (e) { setError(messageOf(lang, e)); } finally { setPending(false); }
  };
  return (
    <div className="card p-4">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Icon name="swords" size={16} />{t("duel_cta")}</h2>
      <p className="muted mb-3 text-xs">{t("duels_text")}</p>
      {mine.data && options.length === 0 ? <p className="muted text-sm">{t("duel_my_chains_none")}</p> : (
        <div className="space-y-2">
          <select className="input text-sm" value={chain} onChange={(e) => setChain(e.target.value ? Number(e.target.value) : "")}>
            <option value="">{t("duel_pick_chain")}</option>
            {options.map((c) => <option key={c.id} value={c.id} className="bg-[#0d0b22]">{displayTitle(c, lang)}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="muted text-xs">{t("duel_duration")}</span>
            {DURATIONS.map((m) => <button key={m} type="button" onClick={() => setMinutes(m)} className={`btn btn-ghost text-xs ${minutes === m ? "border-white/60" : ""}`}>{label(m)}</button>)}
          </div>
          <Notice error={error} />
          <button className="btn w-full text-sm" disabled={pending || chain === ""} onClick={submit}><Icon name="swords" size={14} />{pending ? t("moment") : t("duel_send")}</button>
        </div>
      )}
    </div>
  );
}

/** Accept / decline buttons for the challenged creator. */
export function RespondButtons({ duel, onDone }: { duel: DuelView; onDone: () => void }) {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!profile || profile.id !== duel.opponent_id || duel.status !== "offen") return null;
  const act = async (accept: boolean) => {
    setError(null); setPending(true);
    try { await respondDuel(duel.id, accept); onDone(); } catch (e) { setError(messageOf(lang, e)); } finally { setPending(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button className="btn flex-1 text-sm" disabled={pending} onClick={() => act(true)}><Icon name="swords" size={14} />{t("duel_accept")}</button>
        <button className="btn btn-ghost flex-1 text-sm" disabled={pending} onClick={() => act(false)}>{t("duel_decline")}</button>
      </div>
      <Notice error={error} />
    </div>
  );
}

/** Banner on a chain page while that chain is in a duel. */
export function DuelBanner({ duel, chainId }: { duel: DuelView; chainId: number }) {
  const { t, lang } = useT();
  const side = duel.chain_a === chainId ? "a" : "b";
  const other = side === "a" ? duel.b : duel.a;
  return (
    <Link to={`/duel/${duel.id}`} className="card card-glow mb-4 block p-3 text-sm hover:border-white/25">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="swords" size={16} />
        <span className="font-semibold">{t("duel_kicker")}</span>
        <DuelStatusBadge duel={duel} />
        <span className="muted">{t("duel_vs")} <span className="text-white">{displayTitle(other, lang)}</span></span>
        <span className="ml-auto underline">{t("duel_arena")} →</span>
      </div>
      {duel.status === "laeuft" && <div className="mt-2"><DuelBar a={duel.score_a} b={duel.score_b} /></div>}
    </Link>
  );
}
