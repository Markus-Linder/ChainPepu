import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import { CATEGORY_META } from "@/lib/categories";

interface Scan {
  id: string;
  pack: string;
  status: string;
  total: number;
  completed: number;
  passed: number;
  score: number | null;
  grade: string | null;
  targets: { name: string; description: string | null } | null;
}

interface Result {
  id: string;
  category: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  owasp: string | null;
  eu_ai_act: string | null;
  passed: boolean;
  confidence: number | null;
  reason: string | null;
  target_reply: string | null;
}

export default function ScanDetail() {
  const { id } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  async function load() {
    const { data: s } = await supabase
      .from("scans")
      .select("id, pack, status, total, completed, passed, score, grade, targets(name, description)")
      .eq("id", id)
      .single();
    setScan(s as unknown as Scan);
    const { data: r } = await supabase
      .from("results")
      .select("*")
      .eq("scan_id", id)
      .order("created_at", { ascending: true });
    setResults((r as Result[]) ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`scan-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "results", filter: `scan_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "scans", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  if (!scan) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Laden…</p>
      </AppShell>
    );
  }

  const failures = results.filter((r) => !r.passed);

  return (
    <AppShell>
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{scan.targets?.name ?? "Scan"}</h1>
          <p className="text-sm text-muted-foreground">{scan.targets?.description}</p>
        </div>
        {scan.status === "done" ? (
          <ScoreCard score={scan.score ?? 0} grade={scan.grade ?? "?"} passed={scan.passed} total={scan.total} />
        ) : (
          <div className="text-right">
            <p className="text-sm font-medium">Scan läuft…</p>
            <p className="text-xs text-muted-foreground">{scan.completed}/{scan.total || "…"} Tests</p>
          </div>
        )}
      </div>

      {scan.status === "done" && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-sm">
              <strong>{failures.length}</strong> von <strong>{scan.total}</strong> Tests fehlgeschlagen.
              {failures.length === 0
                ? " Euer Assistent hat alle Testfälle bestanden."
                : " Prüft die markierten Schwachstellen unten."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Card key={r.id} className={r.passed ? "" : "border-red-300 dark:border-red-900"}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                {r.passed ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge tone={r.severity}>{r.severity}</Badge>
                    <Badge tone="muted">{CATEGORY_META[r.category]?.label ?? r.category}</Badge>
                    {r.owasp && <Badge tone="muted">{r.owasp}</Badge>}
                    {r.eu_ai_act && <Badge tone="muted">EU AI Act {r.eu_ai_act}</Badge>}
                  </div>
                  {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                  {!r.passed && r.target_reply && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Antwort des Assistenten anzeigen
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                        {r.target_reply}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {scan.status === "done" && (
        <div className="mt-6 space-y-4">
          <Button variant="outline" onClick={() => window.print()}>
            Prüfbericht als PDF exportieren
          </Button>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Hinweis: Dieser Prüfbericht ist eine automatisierte Momentaufnahme des getesteten
            Systems zum Zeitpunkt des Scans. Er ist keine Zertifizierung, keine
            Konformitätsbewertung im Sinne des EU AI Act und keine Garantie für die Sicherheit
            des Systems. Er kann als Bestandteil eurer technischen Dokumentation (Risikomanagement,
            Robustheit, Testnachweise) dienen. Ein bestandener Test schließt andere Schwachstellen
            nicht aus.
          </p>
        </div>
      )}
    </AppShell>
  );
}

function ScoreCard({ score, grade, passed, total }: { score: number; grade: string; passed: number; total: number }) {
  const tone = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-center gap-4 rounded-xl border px-5 py-3">
      <div className="text-center">
        <div className={`text-3xl font-bold ${tone}`}>{score}</div>
        <div className="text-xs text-muted-foreground">Score</div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div className="text-center">
        <div className="text-3xl font-bold font-mono">{grade}</div>
        <div className="text-xs text-muted-foreground">{passed}/{total} bestanden</div>
      </div>
    </div>
  );
}
