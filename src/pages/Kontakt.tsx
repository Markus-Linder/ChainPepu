import { useState } from "react";
import { toast } from "sonner";
import { SEO, ORG_JSONLD } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { OWNER } from "@/data/legal";
import { sendContact } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function Kontakt() {
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await sendContact(f);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SEO title="Kontakt" description="Fragen zu Profiangebot? Schreiben Sie uns." path="/kontakt" jsonLd={ORG_JSONLD} />
      <PageHeader eyebrow="Kontakt" title="Wir helfen gern" lead="Fragen zu Ihrem Bericht, zur Zusammenarbeit als Betrieb oder zum Datenschutz." />
      <section className="container py-10 grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2"><CardContent className="p-6">
          {sent ? <div className="py-8 text-center"><div className="text-xl font-semibold">Vielen Dank</div><p className="text-muted-foreground mt-2">Wir melden uns in der Regel innerhalb eines Werktags.</p></div> : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="n">Name</Label><Input id="n" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><Label htmlFor="e">E-Mail</Label><Input id="e" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <div><Label htmlFor="p">Telefon (optional)</Label><Input id="p" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div><Label htmlFor="s">Betreff</Label><Input id="s" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
              <input type="text" className="hidden" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
              <div className="sm:col-span-2"><Label htmlFor="m">Nachricht</Label><Textarea id="m" required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? <Spinner className="text-white" /> : "Absenden"}</Button></div>
            </form>
          )}
        </CardContent></Card>
        <div className="rounded-lg border p-5 text-sm space-y-2">
          <div className="font-semibold">{OWNER.siteName}</div>
          <div>{OWNER.name}<br />{OWNER.street}<br />{OWNER.zip} {OWNER.city}</div>
          <div><a className="underline" href={`mailto:${OWNER.email}`}>{OWNER.email}</a></div>
          <div><a className="underline" href={`tel:${OWNER.phone.replace(/\s/g, "")}`}>{OWNER.phoneDisplay}</a></div>
          <div className="text-muted-foreground">Telefonisch für Supportanfragen, Mo bis Fr 9 bis 17 Uhr.</div>
        </div>
      </section>
    </>
  );
}
