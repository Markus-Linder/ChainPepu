import { ArrowRight, BookOpen, Check, Factory, FileCog, Layers, TerminalSquare, X } from "lucide-react";
import ActionLink from "@/components/ActionLink";
import SectionHead from "@/components/SectionHead";
import { config } from "@/config";
import { useSeo } from "@/lib/seo";

const inside = [
  [Factory, "Fab profiles, 5 fabs", "JLCPCB, PCBWay, OSH Park, Aisler, Eurocircuits. Standard 2-layer and 4-layer processes: track/space, via drill and annular ring, hole-to-copper, edge clearance, silkscreen minimums, board thicknesses, named stackups, assembly notes, file requirements. Every number carries its source URL and retrieval date."],
  [FileCog, "KiCad rule files", "One .kicad_dru per fab and process. Copy next to your project and DRC enforces the fab's minimums instead of KiCad's defaults. No more \"it passed DRC but the fab rejected it\"."],
  [Layers, "5 board-class templates", "Pre-filled DESIGN-CONSTRAINTS.md for 2-layer MCU, 4-layer MCU with USB 2.0 HS and RMII Ethernet, 2.4 GHz RF module, DC-DC power, and precision analog. Layer plans, signal groups with impedances and skew limits, placement rules, keep-outs, EMC rules."],
  [TerminalSquare, "kistack-review CLI", "One command runs DRC, ERC and BOM export, compares your project's rules and net classes against the fab profile, and writes a Markdown report plus an agent prompt that triages findings and asks before touching placement."],
  [BookOpen, "Prompt library", "Full review session, placement proposal (agent proposes, you place), net class setup from constraints, Gerber review, and respin diff between revisions."],
  [FileCog, "Agent files", "Extended CLAUDE.md / AGENTS.md with Claude Code, Codex CLI and OpenCode specifics, a session-start script, and a CHANGES.md template the agent appends to."],
] as const;

const faq = [
  ["How accurate are the fab numbers?", "They are copied from each fab's official capability page, with the URL and date next to every value. Fabs change capabilities, so each profile carries a retrieved date and the kit ships updates for 12 months. Verify against the fab page before you order."],
  ["Does this replace a skill pack?", "No. Install KiStack, Ki-Stack or kicad-happy for the KiCad know-how. This kit adds what those cannot know: your fab and your board."],
  ["Which KiCad versions?", "KiCad 8 and 9. The rule files use the custom DRC rule syntax introduced in KiCad 6, and the CLI uses kicad-cli JSON reports from KiCad 8 onward."],
  ["Can I use it for client work?", "Yes. Single-user licence covers any number of projects. Generated files (constraints, rules, reports) can be shared freely. Only the kit itself stays with you."],
  ["Refunds?", "14 days, no questions, via the purchase email."],
];


function PriceCard() {
  return (
    <div className="card relative border-copper/60 shadow-glow md:p-8">
      <div className="absolute -top-3 left-6 rounded-full bg-copper px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-copper-fg">Launch price</div>
      <div className="eyebrow mb-2 mt-2">KiStack Pro Kit</div>
      <div className="mb-1 flex items-end gap-3"><span className="text-5xl font-extrabold tracking-tight">$29</span><span className="mb-2 text-lg text-muted line-through">$39</span></div>
      <div className="mb-6 text-sm text-muted">one-time · 12 months of updates · single user</div>
      <ul className="mb-6 space-y-2.5 text-[15px]">
        {["5 fab profiles as JSON + .kicad_dru", "5 board-class constraint templates", "kistack-review CLI", "Prompt library + agent files", "Starter Kit included"].map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />{f}</li>)}
      </ul>
      <ActionLink href={config.lemonProKitUrl} className="btn w-full py-3.5 text-[17px] lemonsqueezy-button" fallbackTo="/#newsletter" fallbackLabel="Notify me at launch">Buy the Pro Kit <ArrowRight className="h-4 w-4" /></ActionLink>
      <ActionLink href={config.lemonProKitTeamUrl} className="btn btn-ghost mt-2 w-full text-sm" fallbackTo="/#newsletter" fallbackLabel="Team licence, 5 seats · $99 (soon)">Team licence, 5 seats · $99</ActionLink>
      <p className="mt-4 text-center text-xs text-muted">Instant download · VAT and sales tax handled at checkout · 14-day refund, no questions</p>
    </div>
  );
}

export default function Pro() {
  useSeo("KiStack Pro Kit – fab rule profiles and constraint templates for KiCad agents", "Fab capability profiles for JLCPCB, PCBWay, OSH Park, Aisler and Eurocircuits as JSON and KiCad .kicad_dru rule files, five board-class constraint templates, a prompt library and the kistack-review CLI. One-time purchase.");
  return (
    <>
      <section className="grid items-start gap-10 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
        <div className="min-w-0 animate-rise">
          <span className="badge mb-5">Pro Kit</span>
          <h1 className="mb-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">Your fab's limits, in a format your agent reads.</h1>
          <p className="mb-6 max-w-xl text-lg leading-relaxed text-muted">Every skill pack teaches the agent KiCad. None of them know that JLCPCB's cheapest process wants a different annular ring than OSH Park's, or that your 4-layer USB board needs a different template than a buck converter. This kit does.</p>
          <pre className="pre max-w-xl whitespace-pre">{`$ kistack-review --board my-board.kicad_pcb --fab jlcpcb --process standard-4l
  DRC   2 error · 9 warning        ERC   0
  Fab   2 looser than JLCPCB min   BOM   3 missing LCSC
  → review/REPORT.md  review/AGENT_PROMPT.md`}</pre>
        </div>
        <PriceCard />
      </section>

      <div className="glow-line" />

      <section className="section">
        <SectionHead eyebrow="Contents" title="What's inside" />
        <div className="grid gap-5 md:grid-cols-3">
          {inside.map(([Icon, t, d]) => (
            <div key={t} className="card"><Icon className="mb-4 h-6 w-6 text-copper" /><h3 className="mb-2 text-lg font-semibold">{t}</h3><p className="text-[15px] leading-relaxed text-muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <SectionHead eyebrow="Fit" title="Who it's for" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card"><h3 className="mb-4 text-lg font-semibold text-mint">Yes</h3><ul className="space-y-3 text-[15px] text-muted">
            {["You already use Claude Code, Codex or OpenCode on KiCad projects", "You order from JLCPCB, PCBWay, OSH Park, Aisler or Eurocircuits", "You want the agent to check boring things reliably and leave judgment to you", "You have paid for a respin at least once"].map((t) => <li key={t} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />{t}</li>)}
          </ul></div>
          <div className="card"><h3 className="mb-4 text-lg font-semibold text-warn">No</h3><ul className="space-y-3 text-[15px] text-muted">
            {["You expect an agent to lay out a board unattended. Nothing sold here does that, and we say so on the front page.", "You need HDI, flex, or RF above 6 GHz rules. Not covered yet.", "You use Altium or Eagle. KiCad only."].map((t) => <li key={t} className="flex gap-3"><X className="mt-0.5 h-4 w-4 shrink-0 text-warn" />{t}</li>)}
          </ul></div>
        </div>
      </section>

      <section className="section pt-0">
        <SectionHead eyebrow="FAQ" title="Questions" />
        <div className="card !p-0">
          {faq.map(([q, a]) => (
            <details key={q} className="group border-b border-line px-6 py-4 last:border-b-0"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<span className="font-mono text-muted transition group-open:rotate-45">+</span></summary><p className="mt-2 max-w-3xl leading-relaxed text-muted">{a}</p></details>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <div className="mx-auto max-w-lg"><PriceCard /></div>
      </section>
    </>
  );
}
