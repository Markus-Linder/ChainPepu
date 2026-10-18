/** Brand icon set: thin, geometric, one stroke weight. Used instead of emojis everywhere. */
import type { SVGProps } from "react";

export type IconName = "planet" | "chain" | "star" | "bolt" | "shield" | "bell" | "comet" | "play" | "reply" | "globe" | "flag" | "sun" | "check" | "lock" | "spark" | "users" | "video" | "image";

const PATHS: Record<IconName, React.ReactNode> = {
  planet: <><circle cx="12" cy="12" r="5.5" /><path d="M3.5 9.5c-1.4 2.7 8.8 9.6 16.2 6.1M20.5 9c1.2-1.8-2.2-3-5.3-2.4" /></>,
  chain: <><path d="M10 14a4 4 0 0 1 0-5.7l2.3-2.3a4 4 0 0 1 5.7 5.7l-1 1" /><path d="M14 10a4 4 0 0 1 0 5.7l-2.3 2.3a4 4 0 0 1-5.7-5.7l1-1" /></>,
  star: <path d="M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.2 2.9 1.2-5.9-4.4-4 5.9-.7z" />,
  bolt: <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" />,
  shield: <><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" /><path d="M9 12l2 2 4-4.5" /></>,
  bell: <><path d="M6.5 16V11a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  comet: <><circle cx="16.5" cy="7.5" r="3" /><path d="M13.5 10.5L4 20M14.8 13.2L8.5 19.5M10.8 9.2L4.5 15.5" /></>,
  play: <path d="M8 5.5v13l10-6.5z" />,
  reply: <path d="M20 18c-1-5-4-7-10-7V7l-7 5.5 7 5.5v-4c5 0 8 1 10 4z" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" /></>,
  flag: <path d="M6 21V4h10l-1.5 3.5L16 11H6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  spark: <path d="M12 3c.6 5 3.9 8.4 9 9-5.1.6-8.4 4-9 9-.6-5-3.9-8.4-9-9 5.1-.6 8.4-4 9-9z" />,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.5-4 3.3-6 6.5-6s6 2 6.5 6" /><circle cx="17" cy="9.5" r="2.5" /><path d="M16 14.5c2.8 0 5 1.7 5.5 5" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-2.5v9L16 14" /></>,
  image: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20 16l-5-5-6.5 7" /></>,
};

export function Icon({ name, size = 18, className = "", filled = false, ...rest }: { name: IconName; size?: number; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 align-[-0.2em] ${className}`} aria-hidden {...rest}>
      {PATHS[name]}
    </svg>
  );
}

/** The brand mark: two interlocked rings (a chain) orbiting a planet core. */
export function Logo({ size = 28, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <defs>
          <linearGradient id="cp-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a6bff" />
            <stop offset="100%" stopColor="#ff3d9a" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="24" r="11" fill="none" stroke="url(#cp-brand)" strokeWidth="3.2" />
        <circle cx="30" cy="24" r="11" fill="none" stroke="url(#cp-brand)" strokeWidth="3.2" />
        <circle cx="24" cy="24" r="4.2" fill="#f2c46d" />
      </svg>
      {wordmark && <span className="font-display text-lg font-bold tracking-tight">Chain<span className="text-gradient">Pepu</span></span>}
    </span>
  );
}
