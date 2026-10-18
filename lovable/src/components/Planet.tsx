import { planetLook, skinColors } from "@/lib/planet";

/** A planet as SVG. Size in pixels. Level makes it bigger and adds rings, moons and glow. */
export function Planet({ seed, skin = "standard", level = 1, size = 96, title }: { seed: number; skin?: string; level?: number; size?: number; title?: string }) {
  const look = planetLook(seed, skin, level);
  const { a, b } = skinColors(look);
  const r = 40 * look.size;
  const id = `g${seed}-${skin}-${look.level}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title ?? "Planet"} style={{ filter: `drop-shadow(0 0 ${size / 6}px ${look.glow})` }}>
      <defs>
        <radialGradient id={id} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </radialGradient>
      </defs>
      {look.rings && (
        <ellipse cx="60" cy="60" rx={r * 1.7} ry={r * 0.45} fill="none" stroke={a} strokeOpacity="0.55" strokeWidth="4" transform={`rotate(${look.ringTilt} 60 60)`} />
      )}
      <circle cx="60" cy="60" r={r} fill={`url(#${id})`} />
      {look.rings && (
        <path d={`M ${60 - r * 1.7} 60 A ${r * 1.7} ${r * 0.45} 0 0 0 ${60 + r * 1.7} 60`} fill="none" stroke={a} strokeOpacity="0.9" strokeWidth="4" transform={`rotate(${look.ringTilt} 60 60)`} />
      )}
      {Array.from({ length: look.moons }).map((_, i) => (
        <circle key={i} cx={60 + Math.cos(i * 2.1 + look.hue) * (r + 14)} cy={60 + Math.sin(i * 2.1 + look.hue) * (r + 14)} r={4 + i} fill="#d9d7ff" opacity="0.85" />
      ))}
    </svg>
  );
}
