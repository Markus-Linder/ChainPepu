import { Link } from "react-router-dom";
import { getPayoutSettings, getStats } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";
import { useAsync } from "@/lib/useAsync";
import { Icon, Logo, type IconName } from "@/components/Icons";

/** For partners and investors: what ChainPepu is, how it earns, how it stays safe. Only live numbers, nothing made up. */
export default function About() {
  const { t } = useT();
  const { data } = useAsync(async () => ({ stats: await getStats(), settings: await getPayoutSettings() }), []);
  const share = data?.settings.share ?? 80;
  const sections: { icon: IconName; title: string; text: string }[] = [
    { icon: "chain", title: "about_vision_t", text: "about_vision" },
    { icon: "star", title: "about_model_t", text: "about_model" },
    { icon: "shield", title: "about_safety_t", text: "about_safety" },
    { icon: "globe", title: "about_tech_t", text: "about_tech" },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="hero p-8 sm:p-12">
        <div className="relative">
          <Logo size={40} />
          <p className="kicker mt-6">{t("about_kicker")}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{t("about_title")}</h1>
          <p className="muted mt-4 max-w-2xl text-lg">{t("about_text")}</p>
        </div>
      </section>

      {data && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n={data.stats.users} label={t("n_planets", { n: data.stats.users }).replace(/^\S+\s/, "")} />
          <Stat n={data.stats.chains} label={t("n_chains", { n: data.stats.chains }).replace(/^\S+\s/, "")} />
          <Stat n={data.stats.links} label={t("n_links", { n: data.stats.links }).replace(/^\S+\s/, "")} />
          <Stat n={data.stats.stars} label="★" gold />
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="card p-6">
            <span className="text-gradient"><Icon name={s.icon} size={26} /></span>
            <h2 className="mt-3 text-lg font-bold">{t(s.title)}</h2>
            <p className="muted mt-2 text-sm">{t(s.text, { share, platform: 100 - share })}</p>
          </section>
        ))}
      </div>

      <section className="card card-glow p-6">
        <h2 className="text-lg font-bold">{t("about_contact_t")}</h2>
        {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 inline-block underline">{CONTACT_EMAIL}</a> : <p className="muted mt-2 text-sm">{t("about_contact_missing")}</p>}
        <div className="mt-4"><Link to="/" className="btn">{t("about_cta")}</Link></div>
      </section>
    </div>
  );
}

function Stat({ n, label, gold }: { n: number; label: string; gold?: boolean }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold" style={gold ? { color: "var(--star)" } : undefined}>{n.toLocaleString()}</div>
      <div className="muted text-xs">{label}</div>
    </div>
  );
}
