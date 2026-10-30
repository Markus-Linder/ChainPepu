import { Link, useParams } from "react-router-dom";
import { SEO, breadcrumbJsonLd } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { ARTICLE_BY_SLUG, ARTICLES } from "@/data/articles";
import { formatDate, SITE_URL } from "@/lib/utils";
import NotFound from "@/pages/NotFound";

export default function RatgeberArtikel() {
  const { slug = "" } = useParams();
  const a = ARTICLE_BY_SLUG[slug];
  if (!a) return <NotFound />;
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.excerpt, datePublished: a.date, author: { "@type": "Person", name: "Markus Linder" }, publisher: { "@type": "Organization", name: "Profiangebot", url: SITE_URL }, mainEntityOfPage: `${SITE_URL}/ratgeber/${a.slug}` };
  return (
    <>
      <SEO title={a.title} description={a.excerpt} path={`/ratgeber/${a.slug}`} type="article" jsonLd={[ld, breadcrumbJsonLd([{ name: "Start", path: "/" }, { name: "Ratgeber", path: "/ratgeber" }, { name: a.title, path: `/ratgeber/${a.slug}` }])]} />
      <article className="container py-12 max-w-3xl">
        <div className="text-sm text-muted-foreground">{formatDate(a.date)} · Ratgeber</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">{a.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{a.excerpt}</p>
        <div className="mt-10 space-y-8">{a.sections.map((s) => <section key={s.h}><h2 className="text-xl font-bold">{s.h}</h2>{s.p.map((p, i) => <p key={i} className="mt-2 leading-relaxed">{p}</p>)}</section>)}</div>
        <div className="mt-12 rounded-2xl bg-secondary p-6"><div className="text-xl font-bold">Angebot in der Hand? Prüfen Sie es jetzt.</div><p className="mt-2 text-sm text-muted-foreground">Kostenlos, in 2 Minuten, mit Score, fehlenden Positionen und Preisurteil.</p><Button asChild className="mt-4" variant="accent"><Link to="/angebot-pruefen">Angebot prüfen</Link></Button></div>
        <div className="mt-10"><div className="font-semibold">Weitere Artikel</div><ul className="mt-2 space-y-1 text-sm">{ARTICLES.filter((x) => x.slug !== a.slug).map((x) => <li key={x.slug}><Link className="underline" to={`/ratgeber/${x.slug}`}>{x.title}</Link></li>)}</ul></div>
      </article>
    </>
  );
}
