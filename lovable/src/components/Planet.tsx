import { planetLook, skinColors } from "@/lib/planet";

/**
 * A planet as SVG, rendered like a small 3D body: textured surface (turbulence), day/night terminator,
 * atmosphere rim light, rings in front and behind, moons. Size in pixels. Level adds rings, moons and glow.
 */
export function Planet({ seed, skin = "standard", level = 1, size = 96, title }: { seed: number; skin?: string; level?: number; size?: number | "fluid"; title?: string }) {
  const look = planetLook(seed, skin, level);
  const { a, b } = skinColors(look);
  const r = 40 * look.size;
  const id = `p${seed}-${skin}-${look.level}`;
  const fluid = size === "fluid";
  const px = fluid ? 240 : size;
  const detailed = px >= 40;
  return (
    <svg width={fluid ? "100%" : px} height={fluid ? "100%" : px} viewBox="0 0 120 120" role="img" aria-label={title ?? "Planet"} style={{ filter: `drop-shadow(0 0 ${px / 7}px ${look.glow})`, display: "block" }}>
      <defs>
        <radialGradient id={`${id}-s`} cx="32%" cy="30%" r="75%">
          <stop offset="0%" stopColor={a} />
          <stop offset="55%" stopColor={b} />
          <stop offset="100%" stopColor="#05040c" />
        </radialGradient>
        <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor={a} stopOpacity="0" />
          <stop offset="100%" stopColor={a} stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="45%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
        </linearGradient>
        {detailed && (
          <filter id={`${id}-tex`} x="0" y="0" width="1" height="1">
            <feTurbulence type="fractalNoise" baseFrequency={`${0.02 + (look.hue % 7) * 0.004} ${0.06}`} numOctaves="3" seed={seed % 100} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.22 0" />
          </filter>
        )}
        <clipPath id={`${id}-clip`}><circle cx="60" cy="60" r={r} /></clipPath>
      </defs>
      {look.rings && (
        <ellipse cx="60" cy="60" rx={r * 1.75} ry={r * 0.42} fill="none" stroke={a} strokeOpacity="0.35" strokeWidth={r * 0.14} transform={`rotate(${look.ringTilt} 60 60)`} />
      )}
      <circle cx="60" cy="60" r={r} fill={`url(#${id}-s)`} />
      {detailed && <rect x={60 - r} y={60 - r} width={r * 2} height={r * 2} filter={`url(#${id}-tex)`} clipPath={`url(#${id}-clip)`} opacity="0.9" />}
      <circle cx="60" cy="60" r={r} fill={`url(#${id}-night)`} />
      <circle cx="60" cy="60" r={r} fill={`url(#${id}-rim)`} />
      {look.rings && (
        <path d={`M ${60 - r * 1.75} 60 A ${r * 1.75} ${r * 0.42} 0 0 0 ${60 + r * 1.75} 60`} fill="none" stroke={a} strokeOpacity="0.9" strokeWidth={r * 0.14} strokeLinecap="round" transform={`rotate(${look.ringTilt} 60 60)`} />
      )}
      {Array.from({ length: look.moons }).map((_, i) => (
        <circle key={i} cx={60 + Math.cos(i * 2.1 + look.hue) * (r + 14)} cy={60 + Math.sin(i * 2.1 + look.hue) * (r + 14)} r={3.5 + i} fill="#e4e1ff" opacity="0.9" />
      ))}
    </svg>
  );
}
