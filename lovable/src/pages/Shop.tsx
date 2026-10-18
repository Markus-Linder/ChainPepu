import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getPayoutSettings, isDemoMode } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { SKINS } from "@/lib/planet";
import { STAR_PACKS } from "@/lib/shop";
import { useAsync, Loading } from "@/lib/useAsync";
import { Planet } from "@/components/Planet";
import { BuySkinButton, BuyStarsButton, money } from "@/components/Forms";
import { Icon } from "@/components/Icons";

export default function Shop() {
  const { t, locale } = useT();
  const { profile, loading } = useAuth();
  const info = useAsync(async () => ({ demo: await isDemoMode(), settings: await getPayoutSettings() }), []);
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/shop" replace />;
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">{t("shop_title")}</h1>
        <p className="muted text-sm">{t("shop_text")} <span style={{ color: "var(--star)" }}>★ {profile.stars}</span>.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SKINS).map(([key, s]) => (
            <div key={key} className="card flex flex-col items-center gap-3 p-5 text-center">
              <Planet seed={profile.planet_seed} skin={key} size={110} title={t(`skin_${key}`)} />
              <div><div className="font-semibold">{t(`skin_${key}`)}</div><div className="muted text-xs">{t(`skin_desc_${key}`)}</div></div>
              <div className="w-full"><BuySkinButton skin={key} name={t(`skin_${key}`)} price={s.price} owned={profile.planet_skin === key} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="card card-glow p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold"><span style={{ color: "var(--star)" }}><Icon name="star" size={20} filled /></span>{t("buy_stars")}</h2>
        <p className="muted mt-1 text-sm">{t("buy_stars_text", { share: info.data?.settings.share ?? 80 })}</p>
        <p className="muted mt-1 text-xs">{info.data?.demo ? t("demo_mode_text") : t("stripe_text")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {STAR_PACKS.map((p) => (
            <div key={p.id} className="card p-5 text-center">
              <div className="text-3xl font-bold" style={{ color: "var(--star)" }}>★ {p.stars}</div>
              <div className="mt-3"><BuyStarsButton packId={p.id} label={t("stars_pack", { n: p.stars })} demo={Boolean(info.data?.demo)} price={money(p.priceCents, locale)} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
