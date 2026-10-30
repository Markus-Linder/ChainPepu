import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, HelpCircle, Lock, Printer, Scale, XCircle } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScoreRing } from "@/components/ScoreRing";
import { LeadReleaseForm } from "@/components/LeadReleaseForm";
import { createCheckout, getQuoteReport, type FullAnalysis, type PreviewAnalysis } from "@/lib/api";
import { formatEUR, formatDate } from "@/lib/utils";
import { TRADE_BY_SLUG } from "@/data/trades";
import { PRICES } from "@/data/legal";
import { useMyQuotes } from "@/hooks/useMyQuotes";

const VERDICT: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive" | "outline" }> = {
  guenstig: { label: "günstig", variant: "success" },
  marktueblich: { label: "marktüblich", variant: "secondary" },
  erhoeht: { label: "erhöht", variant: "warning" },
  deutlich_erhoeht: { label: "deutlich erhöht", variant: "destructive" },
  nicht_beurteilbar: { label: "nicht beurteilbar", variant: "outline" },
};
const ASSESS: Record<string, { label: string; cls: string }> = {
  ok: { label: "ok", cls: "text-success" },
  erhoeht: { label: "erhöht", cls: "text-destructive" },
  guenstig: { label: "günstig", cls: "text-success" },
  unklar: { label: "unklar", cls: "text-warning" },
};
const RISK: Record<string, "destructive" | "warning" | "secondary"> = { hoch: "destructive", mittel: "warning", niedrig: "secondary" };

export default function Bericht() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const paid = params.get("paid") === "1";
  const { add } = useMyQuotes();
  const [buying, setBuying] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", id, token],
    queryFn: () => getQuoteReport(id, token),
    enabled: !!id && !!token,
    refetchInterval: (q) => (q.state.data && (q.state.data.status === "processing" || q.state.data.status === "pending")) || (paid && q.state.data && !q.state.data.premium) ? 4000 : false,
  });

  useEffect(() => {
    if (data?.status === "done" && data.analysis) {
      add({ id, token, name: data.project_title || data.file_name || "Angebot", trade: data.trade, createdAt: data.created_at, score: data.analysis.score });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  if (!token) return <div className="container py-20 text-center">Dieser Link ist unvollständig. Bitte den vollständigen Link aus Ihrer E-Mail verwenden.</div>;
  if (isLoading) return <div className="container py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>;
  if (error || !data) return <div className="container py-20 text-center"><h1 className="text-2xl font-bold">Bericht nicht gefunden</h1><p className="mt-2 text-muted-foreground">Der Link ist ungültig oder abgelaufen.</p><Button asChild className="mt-6"><Link to="/angebot-pruefen">Neues Angebot prüfen</Link></Button></div>;

  if (data.status === "failed") {
    return <div className="container py-20 text-center max-w-xl"><XCircle className="mx-auto h-12 w-12 text-destructive" /><h1 className="mt-4 text-2xl font-bold">Prüfung fehlgeschlagen</h1><p className="mt-2 text-muted-foreground">{data.error ?? "Unbekannter Fehler"}</p><Button asChild className="mt-6"><Link to="/angebot-pruefen">Erneut versuchen</Link></Button></div>;
  }
  if (data.status !== "done" || !data.analysis) {
    return <div className="container py-20 text-center"><Spinner className="mx-auto h-8 w-8" /><p className="mt-4">Ihr Angebot wird noch geprüft. Diese Seite aktualisiert sich automatisch.</p></div>;
  }

  const premium = data.premium;
  const full = data.analysis as FullAnalysis;
  const preview = (full.preview ?? null) as PreviewAnalysis | null;
  const a = premium ? full : null;
  const p = preview ?? {
    summary: full.summary, trade_detected: full.trade_detected, company_name: full.company_name, total_gross: full.total_gross, total_net: full.total_net, is_pauschal: full.is_pauschal, score: full.score,
    price_assessment: { ...full.price_assessment, comparable_min: null, comparable_max: null }, positions_count: full.positions.length, positions_flagged: full.positions.filter((x) => x.assessment !== "ok").length,
    missing_positions_count: full.missing_positions.length, missing_positions: full.missing_positions.slice(0, 2), risks_count: full.risks.length, risks: full.risks.slice(0, 1), formal_checks_failed: full.formal_checks.filter((f) => f.status !== "ok").length,
    questions_count: full.questions_for_contractor.length, savings_potential_eur: full.savings_potential_eur, preview: true as const,
  };
  const verdict = VERDICT[p.price_assessment.verdict] ?? VERDICT.nicht_beurteilbar;
  const tradeName = TRADE_BY_SLUG[data.trade]?.name ?? p.trade_detected;
  const missing: FullAnalysis["missing_positions"] = a
    ? a.missing_positions
    : p.missing_positions.map((m) => ({ title: m.title, risk: m.risk as "hoch" | "mittel" | "niedrig", why: "", estimated_cost_min: null, estimated_cost_max: null }));

  const buy = async () => {
    setBuying(true);
    try {
      await createCheckout({ kind: "premium_report", quote_id: id, token });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
      setBuying(false);
    }
  };

  return (
    <>
      <SEO title="Ihr Prüfbericht" description="Prüfbericht zu Ihrem Handwerker-Angebot." path={`/bericht/${id}`} noindex />
      <div className="container py-8 print-container">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Prüfbericht vom {formatDate(data.created_at)} · {tradeName}{p.company_name ? ` · ${p.company_name}` : ""}</div>
            <h1 className="text-3xl font-extrabold">{data.project_title || data.file_name || "Ihr Angebot"}</h1>
          </div>
          <div className="flex gap-2 no-print">
            {premium && <Button variant="outline" onClick={() => window.print()}><Printer /> PDF / Drucken</Button>}
            <Button asChild variant="outline"><Link to="/vergleich"><Scale /> Vergleichen</Link></Button>
          </div>
        </div>

        {paid && !premium && <div className="mt-4 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm flex items-center gap-2"><Spinner /> Zahlung wird bestätigt, der vollständige Bericht wird in wenigen Sekunden freigeschaltet. <button className="underline" onClick={() => refetch()}>Jetzt aktualisieren</button></div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <ScoreRing score={p.score} />
              <div className="mt-3 font-semibold">Gesamtbewertung</div>
              <div className="text-xs text-muted-foreground">Vollständigkeit 40 %, Transparenz 30 %, Preis 30 %</div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge variant={verdict.variant}>Preis: {verdict.label}</Badge>
                {p.is_pauschal && <Badge variant="warning">überwiegend Pauschalen</Badge>}
              </div>
              <div className="mt-4 text-sm"><span className="text-muted-foreground">Angebotssumme brutto</span><div className="text-2xl font-bold">{formatEUR(p.total_gross)}</div>{p.total_net && <div className="text-xs text-muted-foreground">netto {formatEUR(p.total_net)}</div>}</div>
              {premium && a?.price_assessment.comparable_min != null && <div className="mt-3 text-sm"><span className="text-muted-foreground">Marktspanne für diesen Umfang</span><div className="font-semibold">{formatEUR(a.price_assessment.comparable_min)} bis {formatEUR(a.price_assessment.comparable_max)}</div></div>}
              {p.savings_potential_eur != null && p.savings_potential_eur > 0 && <div className="mt-4 w-full rounded-md bg-secondary p-3 text-sm"><strong>Einsparpotenzial:</strong> ca. {formatEUR(p.savings_potential_eur)}</div>}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card><CardHeader><CardTitle>Zusammenfassung</CardTitle></CardHeader><CardContent><p className="leading-relaxed">{p.summary}</p><p className="mt-3 text-sm text-muted-foreground">{p.price_assessment.explanation}</p></CardContent></Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Positionen geprüft" value={String(p.positions_count)} sub={`${p.positions_flagged} auffällig`} />
              <Stat label="Fehlende Leistungen" value={String(p.missing_positions_count)} sub="Nachtragsrisiko" warn={p.missing_positions_count > 0} />
              <Stat label="Formale Mängel" value={String(p.formal_checks_failed)} sub={`${p.risks_count} Risiken`} warn={p.formal_checks_failed > 0} />
            </div>

            {!premium && (
              <Card className="border-accent/60 bg-accent/5 no-print">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Lock className="h-6 w-6 text-accent shrink-0" />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">Vollständigen Prüfbericht freischalten</h2>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Alle {p.positions_count} Positionen mit Bewertung und Richtwert-Spanne</li>
                        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Alle {p.missing_positions_count} fehlenden Leistungen mit Kostenschätzung</li>
                        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> {p.questions_count} konkrete Rückfragen an den Betrieb</li>
                        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Verhandlungstipps und Marktspanne für den Gesamtumfang</li>
                        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Formale Prüfung: Bindefrist, Zahlungsplan, Gewährleistung</li>
                        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> PDF zum Mitnehmen ins Gespräch</li>
                      </ul>
                      <div className="mt-5 flex flex-wrap items-center gap-4">
                        <Button size="lg" variant="accent" onClick={buy} disabled={buying}>{buying ? <Spinner className="text-white" /> : <Download />} Freischalten für {PRICES.premiumReportEUR.toFixed(2).replace(".", ",")} €</Button>
                        <span className="text-xs text-muted-foreground">Einmalig, inkl. MwSt. Zahlung über Stripe (Karte, PayPal, Apple Pay, Google Pay, SEPA). Sofort verfügbar.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Fehlende Leistungen (Nachtragsrisiko)</CardTitle></CardHeader>
              <CardContent>
                {missing.length === 0 ? <p className="text-sm text-muted-foreground">Keine offensichtlich fehlenden Leistungen erkannt.</p> : (
                  <ul className="divide-y">
                    {missing.map((m, i) => (
                      <li key={i} className="py-3">
                        <div className="flex items-center justify-between gap-3"><span className="font-medium">{m.title}</span><Badge variant={RISK[m.risk] ?? "secondary"}>{m.risk}</Badge></div>
                        {m.why && <p className="mt-1 text-sm text-muted-foreground">{m.why}</p>}
                        {(m.estimated_cost_min != null || m.estimated_cost_max != null) && <p className="mt-1 text-sm">Geschätzt: {formatEUR(m.estimated_cost_min)} bis {formatEUR(m.estimated_cost_max)}</p>}
                      </li>
                    ))}
                    {!premium && p.missing_positions_count > p.missing_positions.length && <li className="py-3 text-sm text-muted-foreground flex items-center gap-2"><Lock className="h-4 w-4" /> {p.missing_positions_count - p.missing_positions.length} weitere im vollständigen Bericht</li>}
                  </ul>
                )}
              </CardContent>
            </Card>

            {a ? (
              <>
                <Card>
                  <CardHeader><CardTitle>Alle Positionen</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left border-b text-muted-foreground"><th className="py-2 pr-2">Pos.</th><th className="py-2 pr-2">Leistung</th><th className="py-2 pr-2 text-right">Menge</th><th className="py-2 pr-2 text-right">EP</th><th className="py-2 pr-2 text-right">Gesamt</th><th className="py-2 pr-2">Richtwert</th><th className="py-2">Bewertung</th></tr></thead>
                      <tbody>
                        {a.positions.map((x, i) => (
                          <tr key={i} className="border-b align-top">
                            <td className="py-2 pr-2 text-muted-foreground">{x.pos}</td>
                            <td className="py-2 pr-2"><div>{x.description}</div><div className="text-xs text-muted-foreground">{x.comment}</div></td>
                            <td className="py-2 pr-2 text-right whitespace-nowrap">{x.quantity ?? "–"} {x.unit ?? ""}</td>
                            <td className="py-2 pr-2 text-right whitespace-nowrap">{formatEUR(x.unit_price, 2)}</td>
                            <td className="py-2 pr-2 text-right whitespace-nowrap">{formatEUR(x.total)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">{x.benchmark_min != null ? `${formatEUR(x.benchmark_min)} bis ${formatEUR(x.benchmark_max)}` : "–"}</td>
                            <td className={`py-2 font-semibold ${ASSESS[x.assessment]?.cls ?? ""}`}>{ASSESS[x.assessment]?.label ?? x.assessment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <Card><CardHeader><CardTitle>Risiken und Hinweise</CardTitle></CardHeader><CardContent><ul className="space-y-3">{a.risks.map((r, i) => <li key={i}><div className="flex items-center gap-2 font-medium"><Badge variant={RISK[r.severity]}>{r.severity}</Badge>{r.title}</div><p className="text-sm text-muted-foreground mt-1">{r.detail}</p></li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle>Formale Prüfung</CardTitle></CardHeader><CardContent><ul className="grid gap-2 sm:grid-cols-2">{a.formal_checks.map((f, i) => <li key={i} className="flex gap-2 text-sm">{f.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> : f.status === "fehlt" ? <XCircle className="h-4 w-4 text-destructive mt-0.5" /> : <HelpCircle className="h-4 w-4 text-warning mt-0.5" />}<span>{f.item}{f.note ? <span className="text-muted-foreground"> – {f.note}</span> : null}</span></li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle>Rückfragen an den Betrieb</CardTitle></CardHeader><CardContent><ol className="list-decimal pl-5 space-y-2 text-sm">{a.questions_for_contractor.map((q, i) => <li key={i}>{q}</li>)}</ol></CardContent></Card>
                <Card><CardHeader><CardTitle>Verhandlungstipps</CardTitle></CardHeader><CardContent><ul className="list-disc pl-5 space-y-2 text-sm">{a.negotiation_tips.map((q, i) => <li key={i}>{q}</li>)}</ul></CardContent></Card>
              </>
            ) : (
              <Card className="no-print"><CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Lock className="h-4 w-4" /> Positionstabelle, Risiken, formale Prüfung, Rückfragen und Verhandlungstipps sind im vollständigen Bericht enthalten.</CardContent></Card>
            )}

            <Card className="no-print" id="vergleichsangebote">
              <CardContent className="p-6">
                <LeadReleaseForm quoteId={id} token={token} defaultPlz={data.plz} defaultCity={data.city} released={data.lead_released} />
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">Dieser Bericht ist eine automatisierte, KI-gestützte Orientierungshilfe auf Basis von Richtwerten und anonymisierten Marktdaten. Er ist kein Gutachten und keine Rechtsberatung. Regionale Preise, Zugänglichkeit der Baustelle und Materialqualität können Abweichungen begründen.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-2xl font-extrabold ${warn ? "text-destructive" : ""}`}>{value}</div><div className="text-xs text-muted-foreground">{sub}</div></div>;
}
