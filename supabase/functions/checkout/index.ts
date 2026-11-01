// Stripe Checkout for the Creator subscription and credit packs. Sandbox mode without Stripe keys.
import Stripe from "npm:stripe@23.1.0";
import { CREATOR_PLAN, CREDIT_PACKS, CURRENCY } from "../_shared/economy.ts";
import { adjustCredits, getProfile, ledger } from "../_shared/game.ts";
import { adminClient, HttpError, json, optionalEnv, readJson, requireUser, serve } from "../_shared/supabase.ts";

type Body = { kind: "subscription" | "credits"; packId?: string; successUrl: string; cancelUrl: string; locale?: string };

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  const profile = await getProfile(db, user.id);
  const stripeKey = optionalEnv("STRIPE_SECRET_KEY");
  const pack = body.kind === "credits" ? CREDIT_PACKS.find((p) => p.id === body.packId) : undefined;
  if (body.kind === "credits" && !pack) throw new HttpError(400, "Unknown credit pack", "bad_request");
  if (!/^https?:\/\//.test(body.successUrl ?? "") || !/^https?:\/\//.test(body.cancelUrl ?? "")) throw new HttpError(400, "Invalid redirect URLs", "bad_request");

  // ---------- Sandbox fulfilment ----------
  if (!stripeKey) {
    const ref = `sandbox_${crypto.randomUUID()}`;
    if (body.kind === "subscription") {
      const ends = new Date(Date.now() + 30 * 86_400_000).toISOString();
      await db.from("profiles").update({ subscription_status: "active", subscription_ends_at: ends }).eq("id", user.id);
      await adjustCredits(db, user.id, CREATOR_PLAN.includedCredits);
      await ledger(db, { type: "subscription", user_id: user.id, credits: CREATOR_PLAN.includedCredits, gross_cents: CREATOR_PLAN.priceCents, platform_cents: CREATOR_PLAN.priceCents, stripe_ref: ref, meta: { sandbox: true } });
    } else if (pack) {
      await adjustCredits(db, user.id, pack.credits);
      await ledger(db, { type: "credit_purchase", user_id: user.id, credits: pack.credits, gross_cents: pack.priceCents, platform_cents: pack.priceCents, stripe_ref: ref, meta: { sandbox: true, pack: pack.id } });
    }
    return json({ url: body.successUrl, sandbox: true });
  }

  // ---------- Stripe ----------
  const stripe = new Stripe(stripeKey);
  let customerId = profile.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id, handle: profile.handle } });
    customerId = customer.id;
    await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }
  const locale = (body.locale ?? profile.locale ?? "auto") as Stripe.Checkout.SessionCreateParams.Locale;
  if (body.kind === "subscription") {
    const priceId = optionalEnv("STRIPE_PRICE_CREATOR_MONTHLY");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      locale,
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : { quantity: 1, price_data: { currency: CURRENCY, unit_amount: CREATOR_PLAN.priceCents, recurring: { interval: "month" }, product_data: { name: "ChainPepu Creator" } } },
      ],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      metadata: { user_id: user.id, kind: "subscription" },
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
    });
    return json({ url: session.url });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    locale,
    line_items: [{ quantity: 1, price_data: { currency: CURRENCY, unit_amount: pack!.priceCents, product_data: { name: `${pack!.credits} ChainPepu credits` } } }],
    success_url: body.successUrl,
    cancel_url: body.cancelUrl,
    metadata: { user_id: user.id, kind: "credits", pack_id: pack!.id },
  });
  return json({ url: session.url });
});
