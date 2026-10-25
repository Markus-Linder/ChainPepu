import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Cpu, FileCode2, Factory, Github, ShieldCheck, Wrench, Zap } from "lucide-react";
import NewsletterForm from "@/components/NewsletterForm";
import PcbArt from "@/components/PcbArt";
import Terminal from "@/components/Terminal";
import SectionHead from "@/components/SectionHead";
import { useSeo } from "@/lib/seo";

const packs = [
  { name: "KiStack", by: "American-Embedded", desc: "Human-written skills for schematic work, PCB review, parts and BOM decisions, exports and Gerber review.", cmd: "npx skills add American-Embedded/kistack", url: "https://github.com/American-Embedded/KiStack", stars: "409", lic: "Custom" },
  { name: "Ki-Stack", by: "Milind220", desc: "Teaches agents the native surfaces: kicad-python for live IPC, kicad-cli for render, export, DRC and ERC, kiutils-rs for offline file edits.", cmd: "git clone https://github.com/Milind220/Ki-Stack\n# symlink skills/ki-stack/* into your agent's skills dir", url: "https://github.com/Milind220/Ki-Stack", stars: "23", lic: "MIT" },
  { name: "kicad-happy", by: "aklofas", desc: "Broadest scope: schematic analysis, layout review, EMC pre-compliance, SPICE, datasheets, sourcing, fab prep.", cmd: "git clone https://github.com/aklofas/kicad-happy\n# see README for the install step", url: "https://github.com/aklofas/kicad-happy", stars: "~1.5k", lic: "see repo" },
];

const compare = [
  ["KiStack", "American-Embedded", "Schematic, PCB review, BOM, exports, Gerber review. Asks the engineer before double-sided layouts and outline decisions.", "Claude Code, Codex CLI (any agent that loads SKILL.md)", "Custom", "409"],
  ["Ki-Stack", "Milind220", "Substrate skills (orient, render, live, file-surgery, verify) plus domain skills for PCB, schematic, symbols, footprints.", "Claude Code, Codex, OpenCode", "MIT", "23"],
  ["kicad-happy", "aklofas", "Widest feature list incl. EMC pre-compliance and SPICE. Community reports it as slow but promising.", "Claude Code, Codex", "see repo", "~1.5k"],
  ["KiCad MCP servers", "various", "Tool-based access: DRC, Gerber export, library search, placement, routing. Quality varies a lot between servers.", "Any MCP client", "varies", "varies"],
];

const wins = ["BOM optimization: JLCPCB basic vs. extended parts, stock checks, alternates", "DRC/ERC loops: run, read the report, fix the boring violations", "Netlist and connectivity review against the datasheet", "Footprint and symbol generation from existing library parts", "Calculations: trace impedance, thermal, current capacity", "Scripts: kicad-cli pipelines, export automation, panelization helpers"];
const weak = ["Spatial judgment: agents cannot \"see\" a clean placement", "Editing raw S-expression files without breaking ordering", "Design intent: why a part sits where it sits is not in the netlist", "Confident agreement with whatever framing you give the question", "Running with permissions skipped: removes the human and degrades results"];

export default function Index() {
  useSeo("KiStack – AI agent skills for KiCad", "The AI agent stack for KiCad: install guides for every KiCad skill pack, an honest comparison, a free starter kit, and fab-accurate design rule profiles for Claude Code, Codex and OpenCode.");
  return (
    <>
      {/* Hero */}
      <section className="relative grid items-center gap-10 py-14 md:grid-cols-[1.05fr_1fr] md:py-24">
        <div className="min-w-0 animate-rise">
          <div className="badge mb-5"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> KiCad 8 · 9 &nbsp;|&nbsp; Claude Code · Codex · OpenCode</div>
          <h1 className="mb-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            The AI agent stack<br />for <span className="bg-gradient-to-r from-copper to-[hsl(40_80%_70%)] bg-clip-text text-transparent">KiCad</span>.
          </h1>
          <p className="mb-7 max-w-xl text-lg leading-relaxed text-muted">Skills, MCP servers and workflows that let coding agents review schematics, run DRC and ERC, optimize BOMs and prep boards for fab. Honest about what works. Built by people who have paid for a respin.</p>
          <div className="flex flex-wrap gap-3">
            <a href="#install" className="btn px-6 py-3.5 text-[17px]">Get started in 60 seconds <ArrowRight className="h-4 w-4" /></a>
            <Link to="/kit" className="btn btn-secondary px-6 py-3.5 text-[17px]">Free Starter Kit</Link>
          </div>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            {[["3", "skill packs compared"], ["5", "fabs profiled"], ["37", "checklist items"]].map(([n, l]) => (
              <div key={l}><div className="font-mono text-2xl font-semibold text-fg">{n}</div><div className="text-xs text-muted">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="relative min-w-0">
          <PcbArt className="pointer-events-none absolute hidden md:block -right-10 -top-16 w-[120%] max-w-none opacity-60 md:-right-24 md:-top-24" />
          <Terminal className="relative" />
        </div>
      </section>

      <div className="glow-line" />

      {/* Install */}
      <section id="install" className="section scroll-mt-20">
        <SectionHead eyebrow="01 — Install" title="Pick a KiCad skill pack" sub="All three are open source. Install one, point your agent at a KiCad project, and ask it to review the board." />
        <div className="grid gap-5 md:grid-cols-3">
          {packs.map((p) => (
            <div key={p.name} className="card flex flex-col">
              <div className="mb-3 flex items-start justify-between">
                <div><h3 className="text-lg font-semibold">{p.name}</h3><div className="font-mono text-xs text-muted">{p.by}</div></div>
                <span className="font-mono text-xs text-muted">★ {p.stars}</span>
              </div>
              <p className="mb-4 flex-1 text-[15px] leading-relaxed text-muted">{p.desc}</p>
              <pre className="pre">{p.cmd}</pre>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-mono text-muted">{p.lic}</span>
                <a href={p.url} rel="noreferrer" className="inline-flex items-center gap-1.5 text-copper hover:underline"><Github className="h-3.5 w-3.5" /> Repository</a>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 font-mono text-xs text-muted">Prerequisites: KiCad 8 or 9 with kicad-cli on PATH · Python 3 · one agent CLI</p>
      </section>

      {/* Compare */}
      <section id="compare" className="section scroll-mt-20 pt-0">
        <SectionHead eyebrow="02 — Compare" title="Side by side" sub="Numbers as of October 23, 2026. Stars are a rough proxy for adoption, not quality." />
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80 shadow-card">
          <table className="table min-w-[720px]">
            <thead><tr><th>Pack</th><th>Focus</th><th>Agents</th><th>License</th><th>Stars</th></tr></thead>
            <tbody>
              {compare.map((r) => (
                <tr key={r[0]} className="transition hover:bg-surface2/60">
                  <td><strong>{r[0]}</strong><br /><span className="font-mono text-xs text-muted">{r[1]}</span></td>
                  <td className="text-muted">{r[2]}</td><td className="text-muted">{r[3]}</td><td className="font-mono text-xs">{r[4]}</td><td className="font-mono">{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reality */}
      <section id="reality" className="section pt-0">
        <SectionHead eyebrow="03 — Reality check" title="What actually works today" sub="Distilled from engineers' reports on EEVblog, Hackaday and GitHub issues. Use agents where they are strong and stay in the loop everywhere else." />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-mint"><Zap className="h-5 w-5" /> Reliable wins</h3>
            <ul className="space-y-3">{wins.map((w) => <li key={w} className="flex gap-3 text-[15px] text-muted"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />{w}</li>)}</ul>
          </div>
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-warn"><Wrench className="h-5 w-5" /> Still weak</h3>
            <ul className="space-y-3">{weak.map((w) => <li key={w} className="flex gap-3 text-[15px] text-muted"><X className="mt-0.5 h-4 w-4 shrink-0 text-warn" />{w}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="section pt-0">
        <SectionHead eyebrow="04 — Make any pack better" title="The packs teach the agent KiCad. These teach it your board and your fab." />
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card flex flex-col">
            <FileCode2 className="mb-4 h-7 w-7 text-mint" />
            <span className="badge mb-3 w-fit">Free</span>
            <h3 className="text-xl font-semibold">KiCad Agent Starter Kit</h3>
            <p className="my-3 flex-1 text-[15px] leading-relaxed text-muted">CLAUDE.md for hardware projects, a design-constraints template, a 37-item pre-fab checklist and the JLCPCB BOM workflow.</p>
            <Link to="/kit" className="btn btn-secondary">Get the free kit <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="card relative flex flex-col border-copper/60 shadow-glow">
            <div className="absolute -top-3 right-5 rounded-full bg-copper px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-copper-fg">Most useful</div>
            <Factory className="mb-4 h-7 w-7 text-copper" />
            <span className="badge mb-3 w-fit">Pro Kit · $29</span>
            <h3 className="text-xl font-semibold">Fab rules + board templates</h3>
            <p className="my-3 flex-1 text-[15px] leading-relaxed text-muted">Capability profiles for JLCPCB, PCBWay, OSH Park, Aisler and Eurocircuits as JSON and KiCad rule files, five board-class templates, prompt library and the kistack-review CLI.</p>
            <Link to="/pro" className="btn">See what's inside <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="card flex flex-col">
            <ShieldCheck className="mb-4 h-7 w-7 text-mint" />
            <span className="badge mb-3 w-fit">Service</span>
            <h3 className="text-xl font-semibold">Pre-Fab Review</h3>
            <p className="my-3 flex-1 text-[15px] leading-relaxed text-muted">Send your KiCad project before you order. Tool-chain report plus a human engineer's read, within 3 business days.</p>
            <Link to="/review" className="btn btn-secondary">Book a review <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="section scroll-mt-20 pt-0">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-copper/10 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="eyebrow mb-3 flex items-center gap-2"><Cpu className="h-4 w-4" /> Weekly</div>
              <h2 className="h2">KiCad agent tooling, once a week</h2>
              <p className="sub !mb-0">New skills, MCP servers, fab rule changes and what actually worked on real boards. No sponsored placements without a label.</p>
            </div>
            <NewsletterForm tag="weekly" cta="Subscribe" />
          </div>
        </div>
      </section>
    </>
  );
}
