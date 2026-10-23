/** Decorative PCB trace drawing used in the hero. Pure SVG, animates once on mount. */
export default function PcbArt({ className = "" }: { className?: string }) {
  const traces = [
    "M20 300 H120 L160 260 H300 L340 220 H480",
    "M20 340 H140 L200 280 H330 L380 230 H520",
    "M60 380 H180 L240 320 H360 L420 260 H560",
    "M20 60 H90 L150 120 H260 L300 160 H420",
    "M20 100 H110 L170 160 H290 L340 210 H470",
    "M480 60 V120 L440 160 V200",
    "M560 120 V220 L520 260 V330",
    "M330 380 H420 L470 330 H560",
  ];
  const vias: [number, number][] = [[20, 300], [480, 220], [20, 340], [520, 230], [60, 380], [560, 260], [20, 60], [420, 160], [20, 100], [470, 210], [480, 60], [440, 200], [560, 120], [520, 330], [330, 380], [560, 330]];
  return (
    <svg viewBox="0 0 580 420" className={className} aria-hidden="true">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="cu" x1="0" x2="1"><stop offset="0" stopColor="hsl(30 72% 60%)" /><stop offset="1" stopColor="hsl(24 60% 42%)" /></linearGradient>
      </defs>
      <rect x="250" y="140" width="110" height="110" rx="8" fill="hsl(156 14% 11%)" stroke="hsl(150 12% 22%)" />
      <text x="305" y="200" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="hsl(145 8% 62%)">U1</text>
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i}>
          <rect x={258 + i * 13} y="130" width="6" height="12" rx="1" fill="url(#cu)" />
          <rect x={258 + i * 13} y="248" width="6" height="12" rx="1" fill="url(#cu)" />
          <rect x="240" y={148 + i * 13} width="12" height="6" rx="1" fill="url(#cu)" />
          <rect x="358" y={148 + i * 13} width="12" height="6" rx="1" fill="url(#cu)" />
        </g>
      ))}
      {traces.map((d, i) => (
        <path key={d} d={d} fill="none" stroke="url(#cu)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" strokeDasharray="1000" strokeDashoffset="1000" className="animate-draw" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
      {vias.map(([x, y], i) => (
        <g key={i} className="animate-rise" style={{ animationDelay: `${0.6 + i * 0.05}s` }}>
          <circle cx={x} cy={y} r="7" fill="hsl(30 72% 60%)" />
          <circle cx={x} cy={y} r="3" fill="hsl(160 22% 5%)" />
        </g>
      ))}
      <g className="animate-pulse2"><circle cx="305" cy="195" r="40" fill="none" stroke="hsl(154 60% 52% / .35)" strokeDasharray="4 6" /></g>
    </svg>
  );
}
