import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { config } from "@/config";

type Props = { tag: "starter-kit" | "weekly" | "review-waitlist"; cta: string; note?: string; className?: string };

/** Posts to Buttondown's embed endpoint when configured; otherwise explains what is missing. */
export default function NewsletterForm({ tag, cta, note, className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const user = config.buttondownUsername;

  const onSubmit = (e: FormEvent) => {
    if (!user) { e.preventDefault(); setMsg("Newsletter not connected yet. Set buttondownUsername in src/config.ts."); return; }
    window.open(`https://buttondown.com/${user}`, "popupwindow");
  };

  return (
    <form action={user ? `https://buttondown.com/api/emails/embed-subscribe/${user}` : undefined} method="post" target="popupwindow" onSubmit={onSubmit} className={`flex flex-wrap gap-2 ${className}`}>
      <input type="email" name="email" required aria-label="Email address" placeholder="you@company.com" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="hidden" name="tag" value={tag} />
      <button type="submit" className="btn">{cta} <ArrowRight className="h-4 w-4" /></button>
      {note && <p className="basis-full text-[13px] text-muted">{note}</p>}
      {msg && <p className="basis-full text-[13px] text-warn">{msg}</p>}
    </form>
  );
}
