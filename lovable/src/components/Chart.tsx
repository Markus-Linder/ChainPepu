/** Tiny bar chart (SVG), enough for dashboards. */
export function Bars({ data, color = "#7b61ff", height = 90, labelEvery = 7 }: { data: { label: string; value: number }[]; color?: string; height?: number; labelEvery?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 100 ${height + 14}`} className="h-auto w-full" preserveAspectRatio="none" role="img">
      {data.map((d, i) => {
        const h = (d.value / max) * height;
        return (
          <g key={i}>
            <rect x={i * w + w * 0.15} y={height - h} width={w * 0.7} height={h} rx={1} fill={color} opacity={0.85}>
              <title>{d.label}: {d.value}</title>
            </rect>
            {i % labelEvery === 0 && <text x={i * w + w / 2} y={height + 10} fontSize="4" textAnchor="middle" fill="#9b97c4">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function Kpi({ label, value, sub, gold }: { label: string; value: string | number; sub?: string; gold?: boolean }) {
  return (
    <div className="card p-4">
      <div className="muted text-xs">{label}</div>
      <div className="text-2xl font-bold" style={gold ? { color: "var(--star)" } : undefined}>{value}</div>
      {sub && <div className="muted text-xs">{sub}</div>}
    </div>
  );
}

/** Group timestamps into a per-day series for the last `days` days. */
export function perDay<T>(rows: T[], at: (r: T) => string, weight: (r: T) => number, days: number, locale: string): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const buckets = new Map<string, number>();
  for (const r of rows) { const k = at(r).slice(0, 10); buckets.set(k, (buckets.get(k) ?? 0) + weight(r)); }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const k = d.toISOString().slice(0, 10);
    out.push({ label: d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }), value: buckets.get(k) ?? 0 });
  }
  return out;
}
