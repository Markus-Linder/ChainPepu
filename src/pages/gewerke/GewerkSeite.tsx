import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { SEO, breadcrumbJsonLd, faqJsonLd } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { BenchmarkTable } from "@/components/BenchmarkTable";
import { TRADE_BY_SLUG } from "@/data/trades";
import { CITIES } from "@/data/cities";
import NotFound from "@/pages/NotFound";

export default function GewerkSeite() {
  const { trade = "" } = useParams();
  const t = TRADE_BY_SLUG[trade];
  if (!t) return <NotFound />;
  return (
    <>
      <SEO
        title={`${t.name}: Angebot prüfen, Kosten 2026 und Checkliste`}
        description={`${t.name} Angebot zu teuer? Richtwerte 2026, ${t.checks.length} Prüfpunkte und die häufigsten Lücken in Angeboten. Kostenlos prüfen lassen.`}
        path={`/gewerke/${t.slug}`}
        jsonLd={[faqJsonLd(t.faq), breadcrumbJsonLd([{ name: "Start", path: "/" }, { name: "Gewerke", path: "/gewerke" }, { name: t.name, path: `/gewerke/${t.slug}` }])]}
      />
      <PageHeader eyebrow={t.name} title={`${t.name}: Angebot prüfen und Kosten vergleichen`} lead={t.description}>
        <Button asChild size="lg" variant="accent"><Link to={`/angebot-pruefen?gewerk=${t.slug}`}>{t.name}-Angebot kostenlos prüfen</Link></Button>
      </PageHeader>
      <section className="container py-12 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <h2 className="text-2xl font-bold">Was kostet {t.name} 2026?</h2>
            <p className="mt-2 text-muted-foreground">{t.priceHint} Typisches Projekt: {t.typicalProject}.</p>
            <div className="mt-4"><BenchmarkTable trade={t.slug} /></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Darauf achten wir bei {t.name}-Angeboten</h2>
            <ul className="mt-4 space-y-3">{t.checks.map((c) => <li key={c} className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span>{c}</span></li>)}</ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Häufige Fragen</h2>
            <div className="mt-4 divide-y rounded-lg border">{t.faq.map((f) => <details key={f.q} className="p-5"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted-foreground">{f.a}</p></details>)}</div>
          </div>
          <div className="rounded-2xl bg-primary text-primary-foreground p-8">
            <h2 className="text-2xl font-extrabold">Angebot da? In 2 Minuten wissen, ob es passt.</h2>
            <p className="mt-2 text-primary-foreground/85">Upload als PDF oder Foto, Ergebnis mit Score, fehlenden Positionen und Preisurteil. Kostenlos.</p>
            <Button asChild size="lg" variant="accent" className="mt-5"><Link to={`/angebot-pruefen?gewerk=${t.slug}`}>Jetzt prüfen</Link></Button>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-lg border p-5">
            <div className="font-semibold">{t.name} in Ihrer Stadt</div>
            <ul className="mt-2 columns-2 text-sm">{CITIES.map((c) => <li key={c.slug}><Link className="hover:underline" to={`/gewerke/${t.slug}/${c.slug}`}>{c.name}</Link></li>)}</ul>
          </div>
          <div className="rounded-lg border p-5"><div className="font-semibold">Noch kein Angebot?</div><p className="mt-2 text-sm text-muted-foreground">Erstellen Sie ein Leistungsverzeichnis per Sprache und holen Sie vergleichbare Angebote ein.</p><Button asChild variant="outline" className="mt-3 w-full"><Link to="/leistungsverzeichnis">Anfrage erstellen</Link></Button></div>
        </aside>
      </section>
    </>
  );
}
