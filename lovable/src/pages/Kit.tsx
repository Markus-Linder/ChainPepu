import { Link } from "react-router-dom";
import { ArrowRight, Download, FileText } from "lucide-react";
import NewsletterForm from "@/components/NewsletterForm";
import SectionHead from "@/components/SectionHead";
import { useSeo } from "@/lib/seo";

const files = [
  ["CLAUDE.md", "Project instructions with hard rules: what the agent must ask before changing (placement, outline, stackup, parts, net classes) and what it may fix alone (silkscreen, values, overlaps). Works as AGENTS.md for Codex and OpenCode."],
  ["DESIGN-CONSTRAINTS.md", "YAML design intent agents actually parse: rails and currents, signal groups with impedance, length and skew limits, fixed placements, keep-outs, thermal, EMC rules, BOM policy, open questions."],
  ["REVIEW-CHECKLIST.md", "37 pre-fab items across schematic, electrical layout, mechanical/DFM and outputs. The agent reports each as pass, fail, cannot check or needs engineer, with evidence."],
  ["JLCPCB-BOM-WORKFLOW.md", "Six-step prompt sequence: export, classify, fill LCSC numbers, basic-vs-extended swaps, stock and lifecycle check, apply approved changes only."],
];

export default function Kit() {
  useSeo("KiCad Agent Starter Kit (free) – KiStack", "Free: CLAUDE.md for hardware projects, a machine-readable design-constraints template, a 37-item pre-fab review checklist and the JLCPCB BOM workflow for Claude Code, Codex and OpenCode.");
  return (
    <>
      <section className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="min-w-0 animate-rise">
          <span className="badge mb-5">Free · MIT licensed</span>
          <h1 className="mb-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">KiCad Agent<br />Starter Kit</h1>
          <p className="mb-6 max-w-xl text-lg leading-relaxed text-muted">Four files that fix the three ways agents fail on real boards: they don't know your design intent, they edit without asking, and they agree with whatever you suggest.</p>
          <NewsletterForm tag="starter-kit" cta="Email me the kit" />
          <p className="mt-3 text-[13px] text-muted">One email with the download, then the weekly letter. Unsubscribe any time. Prefer no email? <a href="/downloads/kicad-agent-starter-kit.zip" className="inline-flex items-center gap-1 text-copper hover:underline"><Download className="h-3.5 w-3.5" /> Direct download</a></p>
        </div>
        <div className="card min-w-0 font-mono text-[13px] leading-relaxed">
          <div className="mb-3 text-muted">my-board/</div>
          <div className="space-y-1.5">
            {["CLAUDE.md", "AGENTS.md  → copy of CLAUDE.md", "DESIGN-CONSTRAINTS.md", "docs/REVIEW-CHECKLIST.md", "docs/CHANGES.md", "my-board.kicad_pro", "my-board.kicad_sch", "my-board.kicad_pcb"].map((f, i) => (
              <div key={f} className={`flex items-center gap-2 ${i < 5 ? "text-copper" : "text-muted"}`}><FileText className="h-3.5 w-3.5" /> {f}</div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      <section className="section">
        <SectionHead eyebrow="Contents" title="What's in the zip" />
        <div className="grid gap-5 md:grid-cols-2">
          {files.map(([n, d]) => (
            <div key={n} className="card"><h3 className="mb-2 font-mono text-[15px] font-semibold text-copper">{n}</h3><p className="text-[15px] leading-relaxed text-muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <SectionHead eyebrow="Install" title="Sixty seconds, once per project" />
        <pre className="pre !text-[13.5px]">{`cd my-board/
unzip ~/Downloads/kicad-agent-starter-kit.zip
cp CLAUDE.md AGENTS.md          # Codex CLI and OpenCode read this name
mkdir -p docs && mv REVIEW-CHECKLIST.md docs/
# fill the TODO lines in CLAUDE.md and DESIGN-CONSTRAINTS.md, then:
claude   # or codex / opencode
> Read CLAUDE.md and DESIGN-CONSTRAINTS.md, then run docs/REVIEW-CHECKLIST.md against this board. Do not edit anything yet.`}</pre>
      </section>

      <section className="section pt-0">
        <div className="card flex flex-wrap items-center justify-between gap-6 border-copper/40 md:p-8">
          <div className="max-w-xl">
            <h2 className="mb-2 text-2xl font-bold tracking-tight">Need the fab numbers too?</h2>
            <p className="text-muted">The constraints template has a slot for a fab rules file. The Pro Kit ships those for JLCPCB, PCBWay, OSH Park, Aisler and Eurocircuits, cited and dated, plus five pre-filled board-class templates and the review CLI.</p>
          </div>
          <Link to="/pro" className="btn">See the Pro Kit <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}
