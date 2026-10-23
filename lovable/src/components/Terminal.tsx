type Line = { kind: "cmd" | "user" | "ok" | "warn" | "ask" | "dim"; text: string };

const lines: Line[] = [
  { kind: "cmd", text: "claude" },
  { kind: "user", text: "Read CLAUDE.md and DESIGN-CONSTRAINTS.md, then run docs/REVIEW-CHECKLIST.md. Do not edit anything." },
  { kind: "dim", text: "Reading DESIGN-CONSTRAINTS.md … 3 signal groups, 2 fixed placements, 1 open question" },
  { kind: "dim", text: "kicad-cli pcb drc --severity-all … 14 violations (2 error, 9 warning, 3 info)" },
  { kind: "ok", text: "Checklist 37 items: 29 pass · 5 fail · 2 cannot check · 1 needs engineer" },
  { kind: "warn", text: "#17 C12 is 4.8 mm from U3 pin 7 (rule: within 2 mm)" },
  { kind: "warn", text: "#4 net class USB: via drill 0.20 mm is below OSH Park minimum 0.254 mm" },
  { kind: "ask", text: "Needs you: ENIG or HASL? QFN-32 at 0.5 mm pitch suggests ENIG." },
];

const color: Record<Line["kind"], string> = {
  cmd: "text-copper", user: "text-fg", ok: "text-mint", warn: "text-warn", ask: "text-copper", dim: "text-muted",
};
const prefix: Record<Line["kind"], string> = { cmd: "$ ", user: "> ", ok: "✓ ", warn: "! ", ask: "? ", dim: "· " };

/** A static "recording" of an agent review session, revealed line by line. */
export default function Terminal({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-code shadow-glow ${className}`}>
      <div className="flex items-center gap-2 border-b border-line bg-surface2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[11px] uppercase tracking-[.12em] text-muted">my-board — claude code</span>
      </div>
      <div className="space-y-1.5 px-4 py-4 font-mono text-[12.5px] leading-relaxed md:text-[13px]">
        {lines.map((l, i) => (
          <div key={i} className={`animate-rise ${color[l.kind]}`} style={{ animationDelay: `${0.3 + i * 0.35}s` }}>
            <span className="select-none opacity-70">{prefix[l.kind]}</span>{l.text}
          </div>
        ))}
        <div className="animate-rise text-copper" style={{ animationDelay: `${0.3 + lines.length * 0.35}s` }}>
          <span className="select-none opacity-70">{">"} </span><span className="animate-blink">▍</span>
        </div>
      </div>
    </div>
  );
}
