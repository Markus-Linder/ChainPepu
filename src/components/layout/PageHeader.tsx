import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <section className="bg-secondary/60 border-b">
      <div className="container py-12 md:py-16">
        {eyebrow && <div className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</div>}
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold max-w-3xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{lead}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
