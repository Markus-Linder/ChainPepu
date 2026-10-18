import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { advanceTournament, createTournament, getTournament, joinTournament, listChainsByOrigin, listTournaments } from "@/lib/api";
import { displayTitle } from "@/lib/events";
import { messageOf, useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import type { Tournament } from "@/lib/types";
import { DuelCard } from "@/components/Duel";
import { Notice } from "@/components/Forms";
import { Icon } from "@/components/Icons";
import NotFound from "./NotFound";

const ROUNDS = [60, 180, 720, 1440];

function StatusBadge({ s }: { s: Tournament["status"] }) {
  const { t } = useT();
  const cls = s === "laeuft" ? "bg-red-500/25 text-red-100" : s === "offen" ? "bg-sky-500/20 text-sky-200" : "bg-white/10";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}>{t(`tour_${s}`)}</span>;
}

/** Tournament list with a create form. */
export default function Tournaments() {
  const { t } = useT();
  const { profile } = useAuth();
  const nav = useNavigate();
  const { data, loading } = useAsync(() => listTournaments(), []);
  const [title, setTitle] = useState(""); const [size, setSize] = useState<4 | 8>(4); const [minutes, setMinutes] = useState(180);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const { lang } = useT();
  const create = async () => {
    setBusy(true); setError(null);
    try { nav(`/tournament/${await createTournament(title.trim(), size, minutes)}`); } catch (e) { setError(messageOf(lang, e)); } finally { setBusy(false); }
  };
  const label = (m: number) => (m < 60 ? t("duel_minutes", { n: m }) : t("duel_hours", { n: m / 60 }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name="swords" size={24} />{t("tour_title")}</h1>
        <p className="muted text-sm">{t("tour_text")}</p>
      </div>
      {profile && (
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("tour_create")}</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input className="input" placeholder={t("tour_title_ph")} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-1">{([4, 8] as const).map((s) => <button key={s} type="button" onClick={() => setSize(s)} className={`btn btn-ghost text-xs ${size === s ? "border-white/60" : ""}`}>{t("tour_chains", { n: s })}</button>)}</div>
            <div className="flex gap-1">{ROUNDS.map((m) => <button key={m} type="button" onClick={() => setMinutes(m)} className={`btn btn-ghost text-xs ${minutes === m ? "border-white/60" : ""}`}>{label(m)}</button>)}</div>
          </div>
          <Notice error={error} />
          <button className="btn mt-2 text-sm" disabled={busy || title.trim().length < 2} onClick={create}><Icon name="swords" size={14} />{t("tour_open")}</button>
        </div>
      )}
      {loading ? <Loading /> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data?.map((x) => (
            <li key={x.id}>
              <Link to={`/tournament/${x.id}`} className="card block p-4 hover:border-white/25">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">{x.title}</span><StatusBadge s={x.status} /></div>
                <p className="muted mt-1 text-xs">{t("tour_chains", { n: x.size })} · {t("tour_round_len")} {label(x.round_minutes)}{x.status === "laeuft" && <> · {t("tour_round", { n: x.round })}</>}</p>
              </Link>
            </li>
          ))}
          {data && data.length === 0 && <p className="muted">{t("tour_none")}</p>}
        </ul>
      )}
    </div>
  );
}

/** One tournament: bracket by rounds, join, advance. */
export function TournamentPage() {
  const id = Number(useParams().id);
  const { t, lang } = useT();
  const { profile } = useAuth();
  const { data, loading, reload } = useAsync(() => getTournament(id), [id]);
  const mine = useAsync(() => (profile ? listChainsByOrigin(profile.id) : Promise.resolve([])), [profile?.id]);
  const [chain, setChain] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { const timer = setInterval(() => { if (data?.t.status === "laeuft") advanceTournament(id).then(reload); }, 20000); return () => clearInterval(timer); }, [id, data?.t.status, reload]);
  if (loading && !data) return <Loading />;
  if (!data) return <NotFound />;
  const { t: tour, entries, duels } = data;
  const joined = profile ? entries.some((e) => e.user_id === profile.id) : false;
  const rounds = [...new Set(duels.map((d) => d.round))].sort();
  const winner = tour.winner_chain ? entries.find((e) => e.chain_id === tour.winner_chain)?.chain : null;
  const join = async () => {
    if (chain === "") return;
    setBusy(true); setError(null);
    try { await joinTournament(id, Number(chain)); reload(); } catch (e) { setError(messageOf(lang, e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <section className="hero p-6 sm:p-8">
        <div className="relative">
          <p className="kicker flex items-center gap-2"><Icon name="swords" size={14} />{t("tour_kicker")} <StatusBadge s={tour.status} /></p>
          <h1 className="mt-2 text-3xl font-bold">{tour.title}</h1>
          <p className="muted mt-1 text-sm">{t("tour_chains", { n: tour.size })} · {entries.length}/{tour.size} · {t("tour_round_len")} {tour.round_minutes < 60 ? t("duel_minutes", { n: tour.round_minutes }) : t("duel_hours", { n: tour.round_minutes / 60 })}</p>
          {winner && <p className="mt-3 text-lg"><Icon name="crown" size={20} className="text-[#f2c46d]" /> <span className="font-semibold">{t("tour_winner")}:</span> <Link to={`/c/${winner.id}`} className="underline">{displayTitle(winner, lang)}</Link> · {winner.origin_display_name}</p>}
          {tour.status === "laeuft" && <button className="btn btn-ghost mt-3 text-xs" onClick={() => advanceTournament(id).then(reload)}>{t("tour_advance")}</button>}
        </div>
      </section>

      {tour.status === "offen" && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">{t("tour_join")}</h2>
          {!profile ? <p className="muted text-sm">{t("err_login_first")}</p> : joined ? <p className="text-sm text-emerald-200">{t("tour_joined")}</p> : (
            <div className="flex flex-wrap gap-2">
              <select className="input flex-1 text-sm" value={chain} onChange={(e) => setChain(e.target.value ? Number(e.target.value) : "")}>
                <option value="">{t("duel_pick_chain")}</option>
                {(mine.data ?? []).filter((c) => !c.active_duel_id).map((c) => <option key={c.id} value={c.id} className="bg-[#0d0b22]">{displayTitle(c, lang)}</option>)}
              </select>
              <button className="btn text-sm" disabled={busy || chain === ""} onClick={join}>{t("tour_join")}</button>
              <Notice error={error} />
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">{t("tour_entries")}</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {entries.map((e) => <li key={e.chain_id} className={`rounded-full border border-white/15 px-3 py-1 ${e.eliminated ? "muted line-through" : ""}`}><Link to={`/c/${e.chain_id}`}>{e.chain ? displayTitle(e.chain, lang) : `#${e.chain_id}`}</Link> <span className="muted">· {e.chain?.origin_display_name}</span></li>)}
          {entries.length === 0 && <p className="muted">{t("none_yet")}</p>}
        </ul>
      </section>

      {rounds.map((r) => (
        <section key={r}>
          <h2 className="mb-2 font-semibold">{t("tour_round", { n: r })}{r === Math.ceil(Math.log2(tour.size)) ? ` · ${t("tour_final")}` : ""}</h2>
          <div className="grid gap-3 sm:grid-cols-2">{duels.filter((d) => d.round === r).map((d) => <DuelCard key={d.duel_id} duel={d.duel} />)}</div>
        </section>
      ))}
    </div>
  );
}
