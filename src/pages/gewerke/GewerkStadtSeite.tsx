import { Link, useParams } from "react-router-dom";
import { SEO, breadcrumbJsonLd, faqJsonLd } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { BenchmarkTable } from "@/components/BenchmarkTable";
import { TRADE_BY_SLUG, TRADES } from "@/data/trades";
import { CITY_BY_SLUG } from "@/data/cities";
import NotFound from "@/pages/NotFound";

const BIG = new Set(["muenchen", "frankfurt", "stuttgart", "hamburg", "duesseldorf", "koeln", "berlin"]);

export default function GewerkStadtSeite() {
  const { trade = "", city = "" } = useParams();
  const t = TRADE_BY_SLUG[trade];
  const c = CITY_BY_SLUG[city];
  if (!t || !c) return <NotFound />;
  const factor = BIG.has(c.slug) ? 1.15 : 1.0;
  const faq = [
    { q: `Was kostet ${t.name} in ${c.name}?`, a: `${t.priceHint} In ${c.name} (${c.state}) liegen die Preise ${factor > 1 ? "rund 10 bis 20 % über" : "im Bereich"} des Bundesdurchschnitts. Die Tabelle zeigt angepasste Richtwerte.` },
    { q: `Wie finde ich einen guten Betrieb für ${t.name} in ${c.name}?`, a: `Holen Sie mindestens drei Angebote auf Basis eines gemeinsamen Leistungsverzeichnisses ein, prüfen Sie jedes Angebot auf Vollständigkeit und fragen Sie nach Referenzen aus ${c.name} und Umgebung.` },
    ...t.faq,
  ];
  return (
    <>
      <SEO
        title={`${t.name} ${c.name}: Angebot prüfen, Kosten 2026`}
        description={`${t.name} in ${c.name}: Richtwerte 2026 für ${c.name} und ${c.state}, Prüf-Checkliste und kostenloser Angebots-Check. Bis zu 3 Vergleichsangebote von Betrieben aus ${c.name}.`}
        path={`/gewerke/${t.slug}/${c.slug}`}
        jsonLd={[faqJsonLd(faq), breadcrumbJsonLd([{ name: "Start", path: "/" }, { name: "Gewerke", path: "/gewerke" }, { name: t.name, path: `/gewerke/${t.slug}` }, { name: c.name, path: `/gewerke/${t.slug}/${c.slug}` }])]}
      />
      <PageHeader eyebrow={`${t.name} in ${c.name}`} title={`${t.name} in ${c.name}: Angebot prüfen und Kosten vergleichen`} lead={`Richtwerte für ${c.name} und ${c.state}, die häufigsten Lücken in ${t.name}-Angeboten und auf Wunsch Vergleichsangebote von geprüften Betrieben aus ${c.name}.`}>
        <Button asChild size="lg" variant="accent"><Link to={`/angebot-pruefen?gewerk=${t.slug}`}>Angebot aus {c.name} kostenlos prüfen</Link></Button>
      </PageHeader>
      <section className="container py-12 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <div><h2 className="text-2xl font-bold">Richtwerte {t.name} in {c.name} (2026)</h2><p className="mt-2 text-muted-foreground">{factor > 1 ? `${c.name} gehört zu den teureren Regionen Deutschlands. Die Richtwerte sind um etwa 15 % angehoben.` : `Für ${c.name} und das Umland gelten in etwa die bundesweiten Richtwerte.`}</p><div className="mt-4"><BenchmarkTable trade={t.slug} factor={factor} /></div></div>
          <div><h2 className="text-2xl font-bold">Checkliste für {t.name}-Angebote</h2><ul className="mt-4 list-disc pl-5 space-y-2">{t.checks.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h2 className="text-2xl font-bold">Häufige Fragen</h2><div className="mt-4 divide-y rounded-lg border">{faq.map((f) => <details key={f.q} className="p-5"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted-foreground">{f.a}</p></details>)}</div></div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-lg border p-5"><div className="font-semibold">Weitere Gewerke in {c.name}</div><ul className="mt-2 text-sm space-y-1">{TRADES.filter((x) => x.slug !== t.slug).map((x) => <li key={x.slug}><Link className="hover:underline" to={`/gewerke/${x.slug}/${c.slug}`}>{x.name} in {c.name}</Link></li>)}</ul></div>
          <div className="rounded-lg border p-5"><div className="font-semibold">Sie sind Betrieb in {c.name}?</div><p className="mt-2 text-sm text-muted-foreground">Erhalten Sie Anfragen von Kunden, die bereits ein Angebot haben und kurz vor der Vergabe stehen.</p><Button asChild variant="outline" className="mt-3 w-full"><Link to="/fuer-betriebe">Als Betrieb registrieren</Link></Button></div>
        </aside>
      </section>
    </>
  );
}
