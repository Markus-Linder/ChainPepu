import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { adminSetPayout, adminSetRole, adminSetSetting, getAdminStats, listPayoutQueue, listSettings, listStaff } from "@/lib/api";
import { messageOf, useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { Bars, Kpi } from "@/components/Chart";
import { money, Notice } from "@/components/Forms";
import { Icon } from "@/components/Icons";

/** Admin: the numbers investors ask for first, payouts to confirm, settings, roles. */
export default function Admin() {
  const { t, lang, locale } = useT();
  const { profile, loading: authLoading } = useAuth();
  const { data, loading, reload } = useAsync(async () => profile?.is_admin ? { stats: await getAdminStats(), payouts: await listPayoutQueue(), settings: await listSettings(), staff: await listStaff() } : null, [profile?.id]);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  if (authLoading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/admin" replace />;
  if (!profile.is_admin) return <p className="muted py-10 text-center">{t("admin_only")}</p>;
  if (loading || !data) return <Loading />;
  const { stats: s, payouts, settings, staff } = data;
  const act = async (fn: () => Promise<void>) => { setError(null); try { await fn(); reload(); } catch (e) { setError(messageOf(lang, e)); } };
  const day = (d: string) => new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">{t("admin_kicker")}</p>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name="shield" size={24} />{t("admin_title")}</h1>
      </div>
      <Notice error={error} />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("admin_users")} value={s.users} sub={`+${s.users_7d} · 7d`} />
        <Kpi label={t("admin_active")} value={s.active_7d} sub="7d" />
        <Kpi label={t("n_chains", { n: s.chains }).replace(/^\S+\s/, "")} value={s.chains} sub={`${s.links} ${t("n_links", { n: s.links }).replace(/^\S+\s/, "")} · ${s.replies} ${t("n_replies", { n: s.replies }).replace(/^\S+\s/, "")}`} />
        <Kpi label={t("admin_moderation")} value={s.pending} sub={`${s.blocked} ${t("status_gesperrt")}`} />
        <Kpi label={t("admin_platform_30")} value={`★ ${s.platform_30d}`} sub={`${money(s.platform_30d * s.star_cents, locale)} · ${100 - s.share} %`} gold />
        <Kpi label={t("admin_platform_total")} value={`★ ${s.platform_total}`} sub={money(s.platform_total * s.star_cents, locale)} gold />
        <Kpi label={t("admin_donated")} value={`★ ${s.donated_total}`} sub={`★ ${s.donated_30d} · 30d`} />
        <Kpi label={t("admin_sold")} value={`★ ${s.stars_sold}`} sub={`${t("admin_demo")} ★ ${s.stars_demo} · ${t("admin_spent")} ★ ${s.stars_spent}`} />
        <Kpi label={t("admin_payouts_open")} value={s.payouts_open} sub={money(s.payouts_open_cents, locale)} />
        <Kpi label={t("admin_payouts_paid")} value={money(s.payouts_paid_cents, locale)} />
        <Kpi label={t("duels_title")} value={s.duels} sub={`${s.duels_live} live · ${s.tournaments} ${t("tour_title")}`} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4"><h2 className="mb-2 font-semibold">{t("admin_new_users")}</h2><Bars data={s.new_users_14d.map((d) => ({ label: day(d.day), value: d.n }))} labelEvery={2} /></div>
        <div className="card p-4"><h2 className="mb-2 font-semibold">{t("admin_stars_sent")}</h2><Bars data={s.stars_14d.map((d) => ({ label: day(d.day), value: d.n }))} color="#f2c46d" labelEvery={2} /></div>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">{t("admin_payouts")}</h2>
        {payouts.length === 0 ? <p className="muted text-sm">{t("none_yet")}</p> : (
          <table className="w-full text-sm">
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="py-2"><Link to={`/p/${p.username}`} className="underline">{p.display_name}</Link> <span className="muted text-xs">@{p.username}</span></td>
                  <td className="py-2 text-right">★ {p.stars}</td>
                  <td className="py-2 text-right font-semibold">{money(p.cents, locale)}</td>
                  <td className="py-2 text-right muted text-xs">{new Date(p.created_at).toLocaleDateString(locale)}</td>
                  <td className="py-2 text-right">
                    {p.status === "angefordert" ? (
                      <span className="flex justify-end gap-1">
                        <button className="btn text-xs" onClick={() => act(() => adminSetPayout(p.id, "bezahlt"))}>{t("admin_mark_paid")}</button>
                        <button className="btn btn-ghost text-xs" onClick={() => act(() => adminSetPayout(p.id, "abgelehnt"))}>{t("admin_reject")}</button>
                      </span>
                    ) : <span className="muted text-xs">{t(`payout_${p.status}`)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("admin_settings")}</h2>
          <p className="muted mb-2 text-xs">{t("admin_settings_text")}</p>
          <ul className="space-y-1 text-sm">
            {settings.map((x) => (
              <li key={x.key} className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-xs">{x.key}</code>
                <input className="input w-28 py-1 text-xs" value={edit[x.key] ?? x.value} onChange={(e) => setEdit({ ...edit, [x.key]: e.target.value })} />
                {edit[x.key] !== undefined && edit[x.key] !== x.value && <button className="btn text-xs" onClick={() => act(async () => { await adminSetSetting(x.key, edit[x.key]); setEdit((v) => { const n = { ...v }; delete n[x.key]; return n; }); })}>{t("admin_save")}</button>}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("admin_team")}</h2>
          <p className="muted mb-2 text-xs">{t("admin_team_text")}</p>
          <ul className="space-y-1 text-sm">
            {staff.map((u) => (
              <li key={u.id} className="flex items-center gap-2">
                <Link to={`/p/${u.username}`} className="min-w-0 flex-1 truncate underline">{u.display_name} <span className="muted text-xs">@{u.username}</span></Link>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={u.is_moderator} onChange={(e) => act(() => adminSetRole(u.id, e.target.checked, u.is_admin))} />{t("nav_moderation")}</label>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={u.is_admin} disabled={u.id === profile.id} onChange={(e) => act(() => adminSetRole(u.id, u.is_moderator, e.target.checked))} />Admin</label>
              </li>
            ))}
          </ul>
          <RoleAdder onDone={reload} onError={setError} />
        </div>
      </section>
    </div>
  );
}

function RoleAdder({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const { t, lang } = useT();
  const [username, setUsername] = useState("");
  const add = async () => {
    try {
      const { getProfileByUsername } = await import("@/lib/api");
      const p = await getProfileByUsername(username.trim());
      if (!p) throw new Error("err_user_missing");
      await adminSetRole(p.id, true, false); setUsername(""); onDone();
    } catch (e) { onError(messageOf(lang, e)); }
  };
  return (
    <div className="mt-3 flex gap-2">
      <input className="input text-sm" placeholder={t("username_ph")} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
      <button className="btn btn-ghost text-xs" disabled={!username} onClick={add}>{t("admin_add_mod")}</button>
    </div>
  );
}
