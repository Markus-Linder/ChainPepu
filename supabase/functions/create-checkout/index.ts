import Stripe from "npm:stripe@23.1.0";
import { error, handleOptions, json } from "../_shared/cors.ts";
import { adminClient, getUserFromRequest, siteUrl } from "../_shared/supabase.ts";

interface Body {
  kind: "premium_report" | "lead" | "subscription";
  quote_id?: string;
  token?: string;
  lead_id?: string;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Nur POST erlaubt", 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) return error("STRIPE_SECRET_KEY fehlt.", 500);
  const stripe = new Stripe(secret);
  const db = adminClient();
  const site = siteUrl();

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return error("Ungültiger JSON-Body.");
  }

  try {
    if (b.kind === "premium_report") {
      if (!b.quote_id || !b.token) return error("quote_id und token erforderlich.");
      const { data: q } = await db.from("quotes").select("id, access_token, premium, email").eq("id", b.quote_id).single();
      if (!q || q.access_token !== b.token) return error("Zugriff ungültig.", 403);
      if (q.premium) return json({ url: `${site}/bericht/${q.id}?t=${q.access_token}` });
      const price = Deno.env.get("STRIPE_PRICE_PREMIUM_REPORT");
      if (!price) return error("STRIPE_PRICE_PREMIUM_REPORT fehlt. Bitte npm run stripe:setup ausführen.", 500);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price, quantity: 1 }],
        customer_email: q.email ?? undefined,
        success_url: `${site}/bericht/${q.id}?t=${q.access_token}&paid=1`,
        cancel_url: `${site}/bericht/${q.id}?t=${q.access_token}`,
        metadata: { kind: "premium_report", quote_id: q.id },
        locale: "de",
        automatic_tax: { enabled: false },
        invoice_creation: { enabled: true },
      });
      await db.from("payments").insert({ kind: "premium_report", stripe_session_id: session.id, quote_id: q.id, status: "pending", amount_cents: session.amount_total ?? null });
      return json({ url: session.url });
    }

    const user = await getUserFromRequest(req);
    if (!user) return error("Bitte zuerst als Betrieb anmelden.", 401);
    const { data: biz } = await db.from("businesses").select("*").eq("user_id", user.id).single();
    if (!biz) return error("Bitte zuerst Ihr Betriebsprofil anlegen.", 400);

    let customerId = biz.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: biz.email,
        name: biz.company_name,
        metadata: { business_id: biz.id, user_id: user.id },
        address: biz.street ? { line1: biz.street, postal_code: biz.plz ?? undefined, city: biz.city ?? undefined, country: "DE" } : undefined,
      });
      customerId = customer.id;
      await db.from("businesses").update({ stripe_customer_id: customerId }).eq("id", biz.id);
    }

    if (b.kind === "lead") {
      if (!b.lead_id) return error("lead_id erforderlich.");
      const { data: lead } = await db.from("leads").select("id, status, buyers_count, max_buyers, trade, title").eq("id", b.lead_id).single();
      if (!lead) return error("Anfrage nicht gefunden.", 404);
      if (lead.status !== "open" || lead.buyers_count >= lead.max_buyers) return error("Diese Anfrage ist bereits vergeben.");
      const { data: already } = await db.from("lead_purchases").select("id").eq("lead_id", lead.id).eq("business_id", biz.id).maybeSingle();
      if (already) return json({ url: `${site}/betriebe/dashboard?tab=gekauft` });
      const isMember = biz.subscription_status === "active";
      const price = isMember ? Deno.env.get("STRIPE_PRICE_LEAD_MEMBER") : Deno.env.get("STRIPE_PRICE_LEAD");
      if (!price) return error("Stripe-Preis für Leads fehlt. Bitte npm run stripe:setup ausführen.", 500);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${site}/betriebe/dashboard?tab=gekauft&paid=1`,
        cancel_url: `${site}/betriebe/dashboard`,
        metadata: { kind: "lead", lead_id: lead.id, business_id: biz.id },
        locale: "de",
        invoice_creation: { enabled: true },
        payment_intent_data: { description: `Anfrage: ${lead.title}`.slice(0, 200) },
      });
      await db.from("payments").insert({ kind: "lead", stripe_session_id: session.id, stripe_customer_id: customerId, lead_id: lead.id, business_id: biz.id, status: "pending" });
      return json({ url: session.url });
    }

    if (b.kind === "subscription") {
      if (biz.subscription_status === "active") {
        const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${site}/betriebe/dashboard?tab=profil` });
        return json({ url: portal.url });
      }
      const price = Deno.env.get("STRIPE_PRICE_MEMBERSHIP");
      if (!price) return error("STRIPE_PRICE_MEMBERSHIP fehlt. Bitte npm run stripe:setup ausführen.", 500);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${site}/betriebe/dashboard?tab=profil&subscribed=1`,
        cancel_url: `${site}/betriebe/dashboard?tab=profil`,
        metadata: { kind: "subscription", business_id: biz.id },
        subscription_data: { metadata: { business_id: biz.id } },
        locale: "de",
      });
      await db.from("payments").insert({ kind: "subscription", stripe_session_id: session.id, stripe_customer_id: customerId, business_id: biz.id, status: "pending" });
      return json({ url: session.url });
    }

    return error("Unbekannte Art.");
  } catch (e) {
    return error(e instanceof Error ? e.message : "Stripe-Fehler", 500);
  }
});
