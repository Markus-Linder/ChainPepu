import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, FileSearch, UserCheck } from "lucide-react";
import ActionLink from "@/components/ActionLink";
import NewsletterForm from "@/components/NewsletterForm";
import SectionHead from "@/components/SectionHead";
import { config } from "@/config";
import { useSeo } from "@/lib/seo";

const steps = [
  [FileSearch, "Tool-chain pass", "DRC and ERC with every severity enabled, project rules and net classes compared against your fab's capability profile, BOM checked for missing part numbers, stock and basic/extended status, Gerber layers rendered and inspected."],
  [UserCheck, "Engineer pass", "A human reads the schematic and layout against the 37-item checklist: decoupling, resets and straps, protection, return paths, signal groups, thermal, DFM, silkscreen, outputs. Not a rubber stamp."],
  [ClipboardCheck, "Report", "Findings ranked: blockers, should-fix, nice-to-have. Each with location, evidence and a proposed fix. Plus an agent prompt so your Claude Code or Codex session can apply the mechanical fixes under your supervision."],
] as const;

const prices = [
  ["2-layer, up to 100 components", "3 business days", "$300"],
  ["4-layer, up to 300 components, USB/Ethernet/SD", "3 business days", "$600"],
  ["6+ layers, RF, high-current power, or over 300 components", "5 business days", "from $1,200, quoted"],
  ["Rush (next business day)", "1 business day", "+50 %"],
];

export default function Review() {
  useSeo("Pre-Fab Review for KiCad boards – KiStack", "Send your KiCad project before you order. Tool-chain report plus a human engineer read within 3 business days. Hosted review service waitlist.");
  return (
    <>
      <section className="py-14 md:py-20">
        <div className="max-w-3xl animate-rise">
          <span className="badge mb-5">Service</span>
          <h1 className="mb-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">Pre-Fab Review</h1>
          <p className="mb-7 text-lg leading-relaxed text-muted">A respin costs a week and four figures. A review costs a fraction of that. Send the KiCad project, get a prioritized findings report within 3 business days: what blocks the order, what to fix before the next rev, what is fine.</p>
          <ActionLink href={config.reviewIntakeUrl} className="btn px-6 py-3.5 text-[17px]" missingHint="Intake form not connected yet. Set reviewIntakeUrl in src/config.ts.">Request a review <ArrowRight className="h-4 w-4" /></ActionLink>
          <p className="mt-3 text-[13px] text-muted">Short intake form (board type, fab, quantity, what worries you), quote within one business day. Files are deleted 30 days after delivery unless you ask otherwise.</p>
        </div>
      </section>

      <div className="glow-line" />

      <section className="section">
        <SectionHead eyebrow="Process" title="What you get" />
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map(([Icon, t, d], i) => (
            <div key={t} className="card relative">
              <div className="mb-4 flex items-center gap-3"><span className="font-mono text-xs text-muted">0{i + 1}</span><Icon className="h-6 w-6 text-copper" /></div>
              <h3 className="mb-2 text-lg font-semibold">{t}</h3><p className="text-[15px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <SectionHead eyebrow="Pricing" title="Flat rates by board class" />
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80 shadow-card">
          <table className="table">
            <thead><tr><th>Board</th><th>Turnaround</th><th>Price</th></tr></thead>
            <tbody>{prices.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="text-muted">{r[1]}</td><td className="font-mono">{r[2]}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-[13px] text-muted">A review is advice from the tool chain and an engineer. It is not a design sign-off and does not transfer liability for the board. You remain the engineer of record.</p>
      </section>

      <section className="section pt-0">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 md:p-12">
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-mint/10 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="eyebrow mb-3">Coming next</div>
              <h2 className="h2">Hosted review tool, self-serve</h2>
              <p className="sub !mb-0">Same tool-chain pass in the browser. Upload the project, get the report and agent prompt in minutes, keep a history per board. Planned at $19 per month for individuals and $79 for teams. Join the waitlist and tell us what you'd pay.</p>
            </div>
            <NewsletterForm tag="review-waitlist" cta="Join the waitlist" />
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <p className="text-muted">Questions first? Write to {config.contactEmail ? <a href={`mailto:${config.contactEmail}`} className="text-copper hover:underline">{config.contactEmail}</a> : <Link to="/imprint" className="text-copper hover:underline">the address in the imprint</Link>}.</p>
      </section>
    </>
  );
}
