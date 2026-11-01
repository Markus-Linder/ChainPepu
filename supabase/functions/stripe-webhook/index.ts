// Stripe webhook: fulfil credit purchases and keep subscription state in sync.
import Stripe from "npm:stripe@23.1.0";
import { CREATOR_PLAN, CREDIT_PACKS } from "../_shared/economy.ts";
import { adjustCredits, ledger } from "../_shared/game.ts";
import { adminClient, env, json, serve } from "../_shared/supabase.ts";

serve(async (req) => {
  const stripe = new Stripe(env("STRIPE_SECRET_KEY"));
  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "Missing signature" }, 400);
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, env("STRIPE_WEBHOOK_SECRET"));
  } catch (e) {
    return json({ error: `Invalid signature: ${(e as Error).message}` }, 400);
  }
  const db = adminClient();
  const { error: dupErr } = await db.from("processed_events").insert({ id: event.id });
  if (dupErr) return json({ received: true, duplicate: true });

  const userIdFromCustomer = async (customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null) => {
    const id = typeof customerId === "string" ? customerId : customerId?.id;
    if (!id) return null;
    const { data } = await db.from("profiles").select("id").eq("stripe_customer_id", id).maybeSingle();
    return data?.id ?? null;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const userId = s.metadata?.user_id ?? (await userIdFromCustomer(s.customer));
      if (!userId) break;
      if (s.metadata?.kind === "credits") {
        const pack = CREDIT_PACKS.find((p) => p.id === s.metadata?.pack_id);
        if (pack) {
          await adjustCredits(db, userId, pack.credits);
          await ledger(db, { type: "credit_purchase", user_id: userId, credits: pack.credits, gross_cents: s.amount_total ?? pack.priceCents, platform_cents: s.amount_total ?? pack.priceCents, stripe_ref: s.id, meta: { pack: pack.id } });
        }
      } else if (s.mode === "subscription") {
        await db.from("profiles").update({ subscription_status: "active", stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null }).eq("id", userId);
      }
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object;
      const userId = await userIdFromCustomer(inv.customer);
      if (!userId) break;
      const periodEnd = inv.lines?.data?.[0]?.period?.end;
      await db.from("profiles").update({ subscription_status: "active", subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null }).eq("id", userId);
      await adjustCredits(db, userId, CREATOR_PLAN.includedCredits);
      await ledger(db, { type: "subscription", user_id: userId, credits: CREATOR_PLAN.includedCredits, gross_cents: inv.amount_paid ?? CREATOR_PLAN.priceCents, platform_cents: inv.amount_paid ?? CREATOR_PLAN.priceCents, stripe_ref: inv.id });
      break;
    }
    case "invoice.payment_failed": {
      const userId = await userIdFromCustomer(event.data.object.customer);
      if (userId) await db.from("profiles").update({ subscription_status: "past_due" }).eq("id", userId);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = await userIdFromCustomer(sub.customer);
      if (userId) await db.from("profiles").update({ subscription_status: "canceled" }).eq("id", userId);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = await userIdFromCustomer(sub.customer);
      if (!userId) break;
      const status = sub.cancel_at_period_end ? "canceled" : sub.status === "active" || sub.status === "trialing" ? sub.status : sub.status === "past_due" ? "past_due" : "canceled";
      const periodEnd = sub.items?.data?.[0]?.current_period_end;
      await db.from("profiles").update({ subscription_status: status, subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null }).eq("id", userId);
      break;
    }
  }
  return json({ received: true });
});
