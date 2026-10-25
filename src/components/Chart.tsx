import { fmtDate } from "@/lib/utils";

export function ChartCard({ title, pts, unit }: { title: string; pts: { x: string; y: number }[]; unit: string }) {
  const W = 560, H = 200, px = 36, py = 18;
  const ys = pts.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 2) { min -= 1; max += 1; }
  min = Math.floor(min); max = Math.ceil(max);
  const sx = (i: number) => px + (i / Math.max(1, pts.length - 1)) * (W - 2 * px);
  const sy = (v: number) => H - py - ((v - min) / (max - min)) * (H - 2 * py);
  const ticks = [min, (min + max) / 2, max];
  const line = pts.map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const area = `${line} L${sx(pts.length - 1).toFixed(1)},${(H - py).toFixed(1)} L${sx(0).toFixed(1)},${(H - py).toFixed(1)} Z`;
  return (
    <div className="card">
      <div className="row spread">
        <p className="eyebrow">{title}</p>
        <span className="pill">{pts[pts.length - 1].y} {unit}</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} Verlauf`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={px} x2={W - px} y1={sy(t)} y2={sy(t)} />
            <text x={px - 6} y={sy(t) + 4} textAnchor="end">{t.toFixed(0)}</text>
          </g>
        ))}
        <path className="area" d={area} />
        <path className="line" d={line} />
        {pts.map((p, i) => <circle key={i} className={`dot ${i === pts.length - 1 ? "last" : ""}`} cx={sx(i)} cy={sy(p.y)} r="4" />)}
        {pts.map((p, i) => (i === 0 || i === pts.length - 1 || pts.length <= 5) && (
          <text key={`l${i}`} x={sx(i)} y={H - 3} textAnchor="middle">{fmtDate(p.x)}</text>
        ))}
      </svg>
    </div>
  );
}
