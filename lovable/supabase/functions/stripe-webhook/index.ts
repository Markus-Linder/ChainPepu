// Stripe-Webhook: schreibt nach bezahlter Checkout-Sitzung die Sterne gut.
// Secrets in Supabase setzen: STRIPE_WEBHOOK_SECRET (aus dem Stripe-Dashboard, Ereignis checkout.session.completed)
// In Supabase für diese Funktion "Verify JWT" ausschalten, Stripe schickt keinen JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

async function verify(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1 && Math.abs(Date.now() / 1000 - Number(t)) < 300;
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const ok = await verify(payload, req.headers.get("stripe-signature"), Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  if (!ok) return new Response("Ungültige Signatur", { status: 400 });

  const event = JSON.parse(payload);
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const userId = s.metadata?.user_id as string | undefined;
    const stars = Number(s.metadata?.stars ?? 0);
    if (userId && stars > 0 && s.payment_status === "paid") {
      // Service-Role umgeht RLS; läuft nur hier auf dem Server.
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      // Einmalig pro Sitzung (unique auf stripe_session_id).
      const { error } = await admin.from("purchases").insert({ user_id: userId, item: "stripe", stars: -stars, stripe_session_id: s.id });
      if (!error) {
        const { data: p } = await admin.from("profiles").select("stars").eq("id", userId).single();
        await admin.from("profiles").update({ stars: (p?.stars ?? 0) + stars }).eq("id", userId);
      }
    }
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
