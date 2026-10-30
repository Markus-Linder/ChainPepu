import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { LeadReleaseForm } from "@/components/LeadReleaseForm";
import { getProject } from "@/lib/api";
import { formatEUR, formatDate } from "@/lib/utils";
import { TRADE_BY_SLUG } from "@/data/trades";

export default function LvAnsicht() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const { data, isLoading } = useQuery({ queryKey: ["project", id, token], queryFn: () => getProject(id, token), enabled: !!id && !!token });

  if (isLoading) return <div className="container py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!data?.result) return <div className="container py-20 text-center">Leistungsverzeichnis nicht gefunden. <Link className="underline" to="/leistungsverzeichnis">Neu erstellen</Link></div>;
  const r = data.result;

  return (
    <>
      <SEO title="Ihr Leistungsverzeichnis" description="Leistungsverzeichnis für Ihr Vorhaben." path={`/leistungsverzeichnis/${id}`} noindex />
      <div className="container py-8 print-container">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <div><div className="text-sm text-muted-foreground">Leistungsverzeichnis vom {formatDate(data.created_at)} · {TRADE_BY_SLUG[data.trade]?.name ?? data.trade}{data.plz ? ` · PLZ ${data.plz}` : ""}</div><h1 className="text-3xl font-extrabold">{r.title}</h1></div>
          <Button variant="outline" className="no-print" onClick={() => window.print()}><Printer /> PDF / Drucken</Button>
        </div>
        <Card className="mt-6"><CardContent className="p-6"><p>{r.summary}</p>{(r.estimated_range.min != null || r.estimated_range.max != null) && <p className="mt-3 text-sm"><strong>Grobe Kostenspanne:</strong> {formatEUR(r.estimated_range.min)} bis {formatEUR(r.estimated_range.max)} brutto{r.timeline_weeks ? ` · Dauer ca. ${r.timeline_weeks} Wochen` : ""}</p>}</CardContent></Card>
        <Card className="mt-6">
          <CardHeader><CardTitle>Positionen</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b text-muted-foreground"><th className="py-2 pr-3">Pos.</th><th className="py-2 pr-3">Leistung</th><th className="py-2 pr-3 text-right">Menge</th><th className="py-2">Einheit</th></tr></thead>
              <tbody>{r.positions.map((p) => <tr key={p.pos} className="border-b align-top"><td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{p.pos}</td><td className="py-2 pr-3"><div className="font-medium">{p.title}</div><div className="text-muted-foreground">{p.description}</div>{p.note && <div className="text-xs text-warning mt-1">{p.note}</div>}</td><td className="py-2 pr-3 text-right">{p.quantity ?? "–"}</td><td className="py-2">{p.unit}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Annahmen (bitte prüfen)</CardTitle></CardHeader><CardContent><ul className="list-disc pl-5 text-sm space-y-1">{r.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></CardContent></Card>
          <Card><CardHeader><CardTitle>Vorab klären</CardTitle></CardHeader><CardContent><ul className="list-disc pl-5 text-sm space-y-1">{r.questions_to_clarify.map((a, i) => <li key={i}>{a}</li>)}</ul></CardContent></Card>
        </div>
        {r.optional_positions.length > 0 && <Card className="mt-6"><CardHeader><CardTitle>Optionale Positionen</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{r.optional_positions.map((o, i) => <li key={i}><strong>{o.title}:</strong> {o.description}</li>)}</ul></CardContent></Card>}
        <Card className="mt-6 no-print"><CardContent className="p-6"><LeadReleaseForm projectId={id} token={token} defaultPlz={data.plz} /></CardContent></Card>
        <p className="mt-6 text-xs text-muted-foreground">Automatisch erstelltes Leistungsverzeichnis auf Basis Ihrer Beschreibung. Mengen sind geschätzt, Betriebe sollten vor Angebotsabgabe aufmessen.</p>
      </div>
    </>
  );
}
