import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)", "2xl": "1.25rem", "3xl": "1.75rem" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"], display: ["Sora", "Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { glow: "0 0 40px -10px hsl(var(--primary) / 0.6)", card: "0 10px 40px -20px rgb(0 0 0 / 0.5)" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pop: { "0%": { transform: "scale(0.6)", opacity: "0" }, "70%": { transform: "scale(1.1)", opacity: "1" }, "100%": { transform: "scale(1)" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        pop: "pop 0.4s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
