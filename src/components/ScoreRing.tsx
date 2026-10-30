export function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${pct} von 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={12} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 4} fontWeight={800} fill="currentColor">{pct}</text>
    </svg>
  );
}
