import { BENCHMARKS } from "@/data/benchmarks";
import { formatEUR } from "@/lib/utils";

export function BenchmarkTable({ trade, factor = 1 }: { trade: string; factor?: number }) {
  const rows = BENCHMARKS.filter((b) => b.trade === trade);
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Leistung</th><th className="p-3">Einheit</th><th className="p-3 text-right">günstig</th><th className="p-3 text-right">typisch</th><th className="p-3 text-right">teuer</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.position} className="border-t"><td className="p-3">{r.position}</td><td className="p-3 text-muted-foreground">{r.unit}</td><td className="p-3 text-right">{formatEUR(Math.round(r.min * factor))}</td><td className="p-3 text-right font-semibold">{formatEUR(Math.round(r.typ * factor))}</td><td className="p-3 text-right">{formatEUR(Math.round(r.max * factor))}</td></tr>)}</tbody>
      </table>
      <div className="p-3 text-xs text-muted-foreground">Richtwerte 2026 inkl. MwSt., Arbeit und Material. Regionale Abweichungen von ±20 % sind normal. Keine Garantie, ersetzt kein Angebot.</div>
    </div>
  );
}
