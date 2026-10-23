import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.25rem", screens: { xl: "1120px" } },
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        surface2: "hsl(var(--surface2))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        line: "hsl(var(--line))",
        copper: { DEFAULT: "hsl(var(--copper))", deep: "hsl(var(--copper-deep))", fg: "hsl(var(--copper-fg))" },
        mint: "hsl(var(--mint))",
        warn: "hsl(var(--warn))",
        code: { DEFAULT: "hsl(var(--code))", fg: "hsl(var(--code-fg))" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--copper) / .35), 0 20px 60px -20px hsl(var(--copper) / .35)",
        card: "0 1px 0 0 hsl(0 0% 100% / .04) inset, 0 10px 30px -15px hsl(0 0% 0% / .6)",
      },
      keyframes: {
        draw: { from: { strokeDashoffset: "1000" }, to: { strokeDashoffset: "0" } },
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        pulse2: { "0%,100%": { opacity: ".5" }, "50%": { opacity: "1" } },
      },
      animation: {
        draw: "draw 2.4s ease-out forwards",
        rise: "rise .5s ease-out both",
        blink: "blink 1s step-end infinite",
        pulse2: "pulse2 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
