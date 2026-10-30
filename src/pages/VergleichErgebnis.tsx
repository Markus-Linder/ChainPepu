import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getComparison } from "@/lib/api";
import { formatEUR } from "@/lib/utils";
import { useMyQuotes } from "@/hooks/useMyQuotes";

export default function VergleichErgebnis() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const { quotes } = useMyQuotes();
  const { data, isLoading } = useQuery({ queryKey: ["comparison", id, token], queryFn: () => getComparison(id, token), enabled: !!id && !!token });

  if (isLoading) return <div className="container py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!data?.result) return <div className="container py-20 text-center">Vergleich nicht gefunden. <Link className="underline" to="/vergleich">Zurück</Link></div>;
  const r = data.result;
  const name = (qid: string) => quotes.find((q) => q.id === qid)?.name ?? r.table.find((t) => t.quote_id === qid)?.company ?? `Angebot ${data.quote_ids.indexOf(qid) + 1}`;

  return (
    <>
      <SEO title="Angebotsvergleich" description="Vergleich Ihrer Angebote." path={`/vergleich/${id}`} noindex />
      <div className="container py-8 print-container">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <h1 className="text-3xl font-extrabold">Angebotsvergleich</h1>
          <Button variant="outline" className="no-print" onClick={() => window.print()}><Printer /> PDF / Drucken</Button>
        </div>
        <Card className="mt-6"><CardHeader><CardTitle>Überblick</CardTitle></CardHeader><CardContent><p>{r.overview}</p></CardContent></Card>
        <Card className="mt-6">
          <CardHeader><CardTitle>Auf einen Blick</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b text-muted-foreground"><th className="py-2 pr-3">Angebot</th><th className="py-2 pr-3 text-right">Summe brutto</th><th className="py-2 pr-3 text-right">Normalisiert*</th><th className="py-2 pr-3 text-right">Score</th><th className="py-2 pr-3 text-right">Fehlend</th><th className="py-2">Urteil</th></tr></thead>
              <tbody>
                {r.table.map((t) => {
                  const n = r.normalized_totals.find((x) => x.quote_id === t.quote_id);
                  return (
                    <tr key={t.quote_id} className="border-b align-top">
                      <td className="py-2 pr-3"><div className="font-medium">{name(t.quote_id)}</div>{t.company && <div className="text-xs text-muted-foreground">{t.company}</div>}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{formatEUR(t.total_gross)}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap font-semibold">{formatEUR(n?.normalized_total ?? null)}</td>
                      <td className="py-2 pr-3 text-right">{t.score}</td>
                      <td className="py-2 pr-3 text-right">{t.missing_count}</td>
                      <td className="py-2">{t.verdict}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">* Gesamtpreis nach Ergänzung fehlender Leistungen, damit alle Angebote denselben Umfang abbilden.</p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{r.normalized_totals.map((n) => <li key={n.quote_id}><strong>{name(n.quote_id)}:</strong> {n.explanation}</li>)}</ul>
          </CardContent>
        </Card>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {r.table.map((t) => (
            <Card key={t.quote_id}><CardHeader><CardTitle>{name(t.quote_id)}</CardTitle></CardHeader><CardContent className="text-sm space-y-3"><div><div className="font-semibold text-success">Stärken</div><ul className="list-disc pl-5">{t.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div><div><div className="font-semibold text-destructive">Schwächen</div><ul className="list-disc pl-5">{t.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div></CardContent></Card>
          ))}
        </div>
        <Card className="mt-6"><CardHeader><CardTitle>Unterschiede im Leistungsumfang</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b text-muted-foreground"><th className="py-2 pr-3">Thema</th>{data.quote_ids.map((q) => <th key={q} className="py-2 pr-3">{name(q)}</th>)}</tr></thead><tbody>{r.scope_differences.map((d, i) => <tr key={i} className="border-b align-top"><td className="py-2 pr-3 font-medium">{d.topic}</td>{data.quote_ids.map((q) => <td key={q} className="py-2 pr-3">{d.per_quote.find((p) => p.quote_id === q)?.value ?? "–"}</td>)}</tr>)}</tbody></table></CardContent></Card>
        <Card className="mt-6 border-primary"><CardHeader><CardTitle>Empfehlung</CardTitle></CardHeader><CardContent><p>{r.recommendation}</p></CardContent></Card>
        <Card className="mt-6"><CardHeader><CardTitle>Rückfragen je Angebot</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{r.questions.map((q, i) => <li key={i}><strong>{name(q.quote_id)}:</strong> {q.question}</li>)}</ul></CardContent></Card>
        <p className="mt-6 text-xs text-muted-foreground">Automatisierte Auswertung, keine Rechtsberatung, kein Gutachten.</p>
      </div>
    </>
  );
}
