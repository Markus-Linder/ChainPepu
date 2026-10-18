import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getCreatorStats, getPayoutSettings, listChainsByOrigin, listMyDonations, listPayouts, listReachLinks } from "@/lib/api";
import { displayTitle } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { Bars, Kpi, perDay } from "@/components/Chart";
import { EarningsPanel, money } from "@/components/Forms";
import { Icon } from "@/components/Icons";

/** Creator dashboard: earnings, reach, best hours, payouts. Only your own numbers. */
export default function Dashboard() {
  const { t, lang, locale } = useT();
  const { profile, loading: authLoading } = useAuth();
  const { data, loading } = useAsync(async () => {
    if (!profile) return null;
    const [chains, donations, creator, settings, payouts] = await Promise.all([listChainsByOrigin(profile.id), listMyDonations(profile.id, 30), getCreatorStats(profile.id), getPayoutSettings(), listPayouts()]);
    const reach = await listReachLinks(chains.map((c) => c.id), 30);
    return { chains, donations, creator, settings, payouts, reach };
  }, [profile?.id]);
  if (authLoading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/dashboard" replace />;
  if (loading || !data) return <Loading />;
  const { chains, donations, creator, settings, payouts, reach } = data;

  const stars30 = donations.reduce((s, d) => s + d.stars, 0);
  const earned30 = Math.floor((stars30 * settings.share) / 100);
  const byHour = Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: 0 }));
  for (const d of donations) byHour[new Date(d.created_at).getHours()].value += d.stars;
  const byChain = new Map<number, number>();
  for (const d of donations) byChain.set(d.chain_id, (byChain.get(d.chain_id) ?? 0) + d.stars);
  const topChains = [...byChain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fans = new Map<string, { name: string; username: string; stars: number }>();
  for (const d of donations) { const f = fans.get(d.from_user) ?? { name: d.profiles.display_name, username: d.profiles.username, stars: 0 }; f.stars += d.stars; fans.set(d.from_user, f); }
  const topFans = [...fans.values()].sort((a, b) => b.stars - a.stars).slice(0, 5);
  const newPlanets = new Set(reach.map((r) => r.user_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">{t("dash_kicker")}</p>
        <h1 className="text-2xl font-bold">{t("dash_title")}</h1>
        <p className="muted text-sm">{t("dash_text")}</p>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("dash_stars_30")} value={`★ ${stars30}`} sub={`${t("dash_yours")} ★ ${earned30} ≈ ${money(earned30 * settings.cents, locale)}`} gold />
        <Kpi label={t("stat_stars_received")} value={`★ ${creator.donated_total}`} sub={t("dash_all_time")} />
        <Kpi label={t("stat_followers")} value={creator.follower_count} />
        <Kpi label={t("dash_reach_30")} value={reach.length} sub={t("dash_planets_reached", { n: newPlanets })} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("dash_earnings_chart")}</h2>
          <Bars data={perDay(donations, (d) => d.created_at, (d) => d.stars, 30, locale)} color="#f2c46d" />
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("dash_reach_chart")}</h2>
          <Bars data={perDay(reach, (r) => r.created_at, () => 1, 30, locale)} color="#7b61ff" />
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("dash_best_hours")}</h2>
          <p className="muted mb-2 text-xs">{t("dash_best_hours_text")}</p>
          <Bars data={byHour} color="#ff3d9a" height={60} labelEvery={3} />
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("dash_top_chains")}</h2>
          {topChains.length === 0 ? <p className="muted text-sm">{t("none_yet")}</p> : (
            <ol className="space-y-1 text-sm">
              {topChains.map(([id, stars], i) => { const c = chains.find((x) => x.id === id); return (
                <li key={id} className="flex items-center gap-2"><span className="muted w-4 text-xs">{i + 1}</span><Link to={`/c/${id}`} className="min-w-0 flex-1 truncate hover:underline">{c ? displayTitle(c, lang) : `#${id}`}</Link><span style={{ color: "var(--star)" }}>★ {stars}</span></li>
              ); })}
            </ol>
          )}
          <h2 className="mb-2 mt-4 font-semibold">{t("dash_top_fans")}</h2>
          {topFans.length === 0 ? <p className="muted text-sm">{t("none_yet")}</p> : (
            <ol className="space-y-1 text-sm">
              {topFans.map((f, i) => <li key={f.username} className="flex items-center gap-2"><span className="muted w-4 text-xs">{i + 1}</span><Link to={`/p/${f.username}`} className="min-w-0 flex-1 truncate hover:underline">{f.name}</Link><span style={{ color: "var(--star)" }}>★ {f.stars}</span></li>)}
            </ol>
          )}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <EarningsPanel min={settings.min} cents={settings.cents} share={settings.share} />
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{t("payouts")}</h2>
          {payouts.length === 0 ? <p className="muted text-sm">{t("none_yet")}</p> : (
            <ul className="space-y-1 text-sm">
              {payouts.map((p) => <li key={p.id} className="flex justify-between"><span>{new Date(p.created_at).toLocaleDateString(locale)} · ★ {p.stars}</span><span className="muted">{money(p.cents, locale)} · {t(`payout_${p.status}`)}</span></li>)}
            </ul>
          )}
        </div>
      </section>
      <p className="muted text-xs"><Icon name="lock" size={12} /> {t("dash_private")}</p>
    </div>
  );
}
