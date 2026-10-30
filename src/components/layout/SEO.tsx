import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  type?: "website" | "article";
}

export function SEO({ title, description, path, noindex, jsonLd, type = "website" }: Props) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes("Profiangebot") ? title : `${title} | Profiangebot`;
  const ld = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Profiangebot" />
      <meta property="og:locale" content="de_DE" />
      <meta property="og:image" content={`${SITE_URL}/og-image.svg`} />
      <meta name="twitter:card" content="summary_large_image" />
      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
}

export const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Profiangebot",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  email: "kontakt@profiangebot.de",
  telephone: "+49 1573 5989418",
  address: { "@type": "PostalAddress", streetAddress: "Schloßwiesen 5", postalCode: "74579", addressLocality: "Fichtenau", addressCountry: "DE" },
};

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}
