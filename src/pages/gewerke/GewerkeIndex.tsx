import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SEO, breadcrumbJsonLd } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { TRADES } from "@/data/trades";

export default function GewerkeIndex() {
  return (
    <>
      <SEO title="Angebote prüfen nach Gewerk: Bad, Dach, Heizung, PV und mehr" description="Was kostet was? Richtwerte 2026, typische Lücken in Angeboten und Prüf-Checklisten für 10 Gewerke." path="/gewerke" jsonLd={breadcrumbJsonLd([{ name: "Start", path: "/" }, { name: "Gewerke", path: "/gewerke" }])} />
      <PageHeader eyebrow="Gewerke" title="Richtwerte und Prüf-Checklisten nach Gewerk" lead="Für jedes Gewerk: was 2026 üblich kostet, welche Positionen in Angeboten am häufigsten fehlen und worauf Sie achten sollten." />
      <section className="container py-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRADES.map((t) => (
          <Link key={t.slug} to={`/gewerke/${t.slug}`} className="rounded-lg border p-5 hover:border-primary hover:shadow-sm transition">
            <div className="font-semibold text-lg">{t.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            <p className="mt-3 text-sm"><strong>Richtwert:</strong> {t.priceHint}</p>
            <div className="mt-3 text-sm font-semibold text-primary">Angebot prüfen <ArrowRight className="inline h-4 w-4" /></div>
          </Link>
        ))}
      </section>
    </>
  );
}
