import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Scale, Trash2 } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useMyQuotes } from "@/hooks/useMyQuotes";
import { compareQuotes } from "@/lib/api";
import { TRADE_BY_SLUG } from "@/data/trades";
import { formatDate } from "@/lib/utils";

export default function Vergleich() {
  const { quotes, remove } = useMyQuotes();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]));

  const run = async () => {
    const refs = quotes.filter((q) => selected.includes(q.id)).map((q) => ({ id: q.id, token: q.token }));
    if (refs.length < 2) return toast.error("Bitte mindestens zwei Angebote auswählen.");
    setBusy(true);
    try {
      const res = await compareQuotes(refs);
      navigate(`/vergleich/${res.id}?t=${res.token}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Handwerker-Angebote vergleichen" description="Mehrere geprüfte Angebote nebeneinander: gleicher Leistungsumfang, normalisierte Preise, klare Empfehlung." path="/vergleich" />
      <PageHeader eyebrow="Vergleich" title="Angebote nebeneinander vergleichen" lead="Wählen Sie zwei bis fünf geprüfte Angebote. Wir gleichen den Leistungsumfang an, zeigen Unterschiede bei Material und Bedingungen und geben eine Empfehlung." />
      <section className="container py-10">
        {quotes.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><p>Sie haben in diesem Browser noch keine Angebote geprüft.</p><Button asChild className="mt-4"><Link to="/angebot-pruefen">Erstes Angebot prüfen</Link></Button></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {quotes.map((q) => (
              <label key={q.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${selected.includes(q.id) ? "border-primary bg-secondary/50" : ""}`}>
                <input type="checkbox" className="mt-1" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} />
                <div className="flex-1">
                  <div className="font-semibold">{q.name}</div>
                  <div className="text-sm text-muted-foreground">{TRADE_BY_SLUG[q.trade]?.name ?? q.trade} · {formatDate(q.createdAt)}{q.score != null ? ` · Score ${q.score}` : ""}</div>
                  <div className="mt-2 flex gap-3 text-sm"><Link className="underline" to={`/bericht/${q.id}?t=${q.token}`}>Bericht öffnen</Link><button type="button" className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1" onClick={(e) => { e.preventDefault(); remove(q.id); }}><Trash2 className="h-3 w-3" /> aus Liste entfernen</button></div>
                </div>
              </label>
            ))}
          </div>
        )}
        {quotes.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={run} disabled={busy || selected.length < 2}>{busy ? <Spinner className="text-white" /> : <Scale />} {selected.length} Angebote vergleichen</Button>
            <Button asChild variant="outline"><Link to="/angebot-pruefen">Weiteres Angebot hinzufügen</Link></Button>
            <span className="text-sm text-muted-foreground">Der Vergleich ist kostenlos. Angebote werden lokal in Ihrem Browser gemerkt.</span>
          </div>
        )}
      </section>
    </>
  );
}
