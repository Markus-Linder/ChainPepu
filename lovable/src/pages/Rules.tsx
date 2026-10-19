import { getPayoutSettings } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import { Icon } from "@/components/Icons";

export default function Rules() {
  const { t } = useT();
  const { data } = useAsync(getPayoutSettings, []);
  const share = data?.share ?? 80;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("rules_title")}</h1>
      <p className="muted">{t("rules_intro")}</p>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Icon name="lock" size={16} />{t("rules_not_allowed")}</h2>
        <ul className="list-disc space-y-1 pl-5">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <li key={i}>{t(`rules_${i}`)}</li>)}</ul>
      </section>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Icon name="shield" size={16} />{t("rules_how")}</h2>
        <ul className="list-disc space-y-1 pl-5">{[1, 2, 3, 4, 5].map((i) => <li key={i}>{t(`rules_how_${i}`)}</li>)}</ul>
      </section>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><span style={{ color: "var(--star)" }}>⏱</span>{t("rules_zeit_title")}</h2>
        <ul className="list-disc space-y-1 pl-5">{[1, 2, 3, 4, 5, 6].map((i) => <li key={i}>{t(`rules_zeit_${i}`)}</li>)}</ul>
      </section>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><span style={{ color: "var(--star)" }}><Icon name="star" size={16} filled /></span>{t("rules_stars_title")}</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("rules_stars_1")}</li>
          <li>{t("rules_stars_2", { share, platform: 100 - share })}</li>
          <li>{t("rules_stars_3")}</li>
        </ul>
      </section>
    </div>
  );
}
