import { config } from "@/config";

export type LeadKind = "starter-kit" | "weekly" | "review-waitlist";

export type SubmitResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Single integration point for every email form on the site.
 *
 * LOVABLE: to make signups work without any external service, implement this function with
 * Lovable Cloud: insert { kind, email, created_at } into a `leads` table and notify the owner.
 * Keep the function signature. The forms already handle success and error states.
 *
 * Default behaviour: when a Buttondown username is configured in src/config.ts, the form posts
 * to Buttondown (double opt-in handled there). Otherwise it reports "not connected".
 */
export async function submitLead(kind: LeadKind, email: string): Promise<SubmitResult> {
  const user = config.buttondownUsername;
  if (user) {
    const body = new URLSearchParams({ email, tag: kind });
    try {
      await fetch(`https://buttondown.com/api/emails/embed-subscribe/${user}`, { method: "POST", body, mode: "no-cors" });
      return { ok: true, message: "Check your inbox to confirm your email. The kit follows right after." };
    } catch {
      return { ok: false, message: "Could not reach the newsletter service. Please try again in a minute." };
    }
  }
  return { ok: false, message: "Signup is not connected yet." };
}
