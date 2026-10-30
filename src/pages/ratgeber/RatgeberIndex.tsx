import { Link } from "react-router-dom";
import { SEO, breadcrumbJsonLd } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { ARTICLES } from "@/data/articles";
import { formatDate } from "@/lib/utils";

export default function RatgeberIndex() {
  return (
    <>
      <SEO title="Ratgeber: Handwerker-Angebote verstehen" description="Checklisten, Kostenfallen, Richtwerte und Förderung: Alles, was Sie vor der Beauftragung eines Handwerkers wissen sollten." path="/ratgeber" jsonLd={breadcrumbJsonLd([{ name: "Start", path: "/" }, { name: "Ratgeber", path: "/ratgeber" }])} />
      <PageHeader eyebrow="Ratgeber" title="Handwerker-Angebote verstehen und richtig vergleichen" lead="Praxiswissen aus tausenden geprüften Angeboten, kurz und ohne Fachchinesisch." />
      <section className="container py-10 grid gap-6 md:grid-cols-2">
        {ARTICLES.map((a) => (
          <Link key={a.slug} to={`/ratgeber/${a.slug}`} className="rounded-lg border p-6 hover:border-primary transition">
            <div className="text-xs text-muted-foreground">{formatDate(a.date)}</div>
            <h2 className="mt-1 text-xl font-bold">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
