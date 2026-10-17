// Erzeugt eine Stripe-Checkout-Sitzung für ein Sterne-Paket.
// Secrets in Supabase setzen: STRIPE_SECRET_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const PACKS: Record<string, { stars: number; priceCents: number; label: string }> = {
  pack_s: { stars: 100, priceCents: 199, label: "100 Sterne" },
  pack_m: { stars: 550, priceCents: 899, label: "550 Sterne" },
  pack_l: { stars: 1500, priceCents: 1999, label: "1500 Sterne" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Nicht angemeldet" }, 401);

    const { pack, origin } = await req.json();
    const p = PACKS[pack];
    if (!p) return json({ error: "Paket nicht gefunden" }, 400);

    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${origin}/shop/erfolg`,
      cancel_url: `${origin}/shop`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(p.priceCents),
      "line_items[0][price_data][product_data][name]": `ChainPepu ${p.label}`,
      "metadata[user_id]": user.id,
      "metadata[stars]": String(p.stars),
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const session = await res.json();
    if (!session.url) return json({ error: session.error?.message ?? "Stripe-Fehler" }, 500);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
