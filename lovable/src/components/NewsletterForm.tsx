import { FormEvent, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { submitLead, type LeadKind } from "@/lib/submit";

type Props = { tag: LeadKind; cta: string; note?: string; className?: string };

/** Email capture form. All submissions go through submitLead() in src/lib/submit.ts. */
export default function NewsletterForm({ tag, cta, note, className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    const r = await submitLead(tag, email.trim());
    setMsg(r.message);
    setState(r.ok ? "done" : "error");
  };

  if (state === "done") {
    return (
      <div className={`flex items-center gap-3 rounded-lg border border-mint/40 bg-mint/10 px-4 py-3 text-[15px] ${className}`}>
        <Check className="h-5 w-5 shrink-0 text-mint" /> {msg}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`flex flex-wrap gap-2 ${className}`} noValidate={false}>
      <input type="email" name="email" required aria-label="Email address" placeholder="you@company.com" className="input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={state === "busy"} />
      <button type="submit" className="btn" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{cta} <ArrowRight className="h-4 w-4" /></>}
      </button>
      {note && <p className="basis-full text-[13px] text-muted">{note}</p>}
      {state === "error" && <p className="basis-full text-[13px] text-warn">{msg}</p>}
    </form>
  );
}
