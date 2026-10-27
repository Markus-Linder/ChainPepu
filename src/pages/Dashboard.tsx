import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AppShell from "@/components/AppShell";

interface ScanRow {
  id: string;
  pack: string;
  status: string;
  score: number | null;
  grade: string | null;
  total: number;
  completed: number;
  created_at: string;
  targets: { name: string } | null;
}

export default function Dashboard() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("scans")
      .select("id, pack, status, score, grade, total, completed, created_at, targets(name)")
      .order("created_at", { ascending: false });
    setScans((data as unknown as ScanRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("scans-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "scans" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scans</h1>
          <p className="text-sm text-muted-foreground">Sicherheitstests für eure KI-Assistenten.</p>
        </div>
        <Link to="/app/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Neuer Scan
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laden…</p>
      ) : scans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">Noch keine Scans. Starte deinen ersten Test.</p>
            <Link to="/app/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Neuer Scan
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <Link key={s.id} to={`/app/scan/${s.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.targets?.name ?? "Ziel"}</span>
                      <Badge tone="muted">{s.pack === "quick" ? "Quick" : "Full"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("de-DE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {s.status === "done" ? (
                      <ScoreBadge score={s.score ?? 0} grade={s.grade ?? "?"} />
                    ) : s.status === "running" ? (
                      <span className="text-sm text-muted-foreground">
                        Läuft… {s.completed}/{s.total}
                      </span>
                    ) : (
                      <Badge tone="muted">{s.status}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ScoreBadge({ score, grade }: { score: number; grade: string }) {
  const tone = score >= 75 ? "pass" : score >= 50 ? "medium" : "fail";
  return (
    <div className="flex items-center gap-2">
      <Badge tone={tone}>Score {score}</Badge>
      <span className="font-mono text-sm font-semibold">{grade}</span>
    </div>
  );
}
