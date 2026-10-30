import { ReactNode } from "react";
import { SEO } from "./SEO";

export function LegalPage({ title, path, children, updated = "Oktober 2026" }: { title: string; path: string; children: ReactNode; updated?: string }) {
  return (
    <>
      <SEO title={title} description={`${title} von Profiangebot.`} path={path} />
      <article className="container py-12 max-w-3xl prose-sm">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <div className="mt-1 text-sm text-muted-foreground">Stand: {updated}</div>
        <div className="mt-8 space-y-6 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h3]:font-semibold [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:mt-2">{children}</div>
      </article>
    </>
  );
}
