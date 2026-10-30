import Stripe from "npm:stripe@23.1.0";
import { adminClient, siteUrl } from "../_shared/supabase.ts";
import { emailLayout, sendEmail } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !whSecret) return new Response("Stripe-Konfiguration fehlt", { status: 500 });

  const stripe = new Stripe(secret);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signatur fehlt", { status: 400 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, whSecret);
  } catch (e) {
    console.error("[webhook] Signatur ungültig", e);
    return new Response("Signatur ungültig", { status: 400 });
  }

  const db = adminClient();
  const { error: dupErr } = await db.from("processed_stripe_events").insert({ event_id: event.id });
  if (dupErr) {
    // bereits verarbeitet
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const kind = session.metadata?.kind;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

        await db.from("payments").update({
          status: session.payment_status === "paid" || session.mode === "subscription" ? "paid" : session.payment_status,
          amount_cents: session.amount_total ?? null,
          stripe_customer_id: customerId,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          metadata: session.metadata ?? null,
        }).eq("stripe_session_id", session.id);

        if (kind === "premium_report" && session.metadata?.quote_id) {
          await db.from("quotes").update({ premium: true, premium_paid_at: new Date().toISOString() }).eq("id", session.metadata.quote_id);
          const { data: q } = await db.from("quotes").select("id, access_token, email").eq("id", session.metadata.quote_id).single();
          const to = q?.email ?? session.customer_details?.email;
          if (q && to) {
            await sendEmail({
              to,
              subject: "Ihr vollständiger Prüfbericht ist freigeschaltet",
              html: emailLayout("Prüfbericht freigeschaltet", `<p>Vielen Dank. Ihr vollständiger Prüfbericht mit allen Positionen, Rückfragen und Verhandlungstipps ist jetzt verfügbar.</p><p><a href="${siteUrl()}/bericht/${q.id}?t=${q.access_token}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Bericht öffnen</a></p>`),
            });
          }
        }

        if (kind === "lead" && session.metadata?.lead_id && session.metadata?.business_id) {
          const leadId = session.metadata.lead_id;
          const businessId = session.metadata.business_id;
          const { error: pErr } = await db.from("lead_purchases").insert({
            lead_id: leadId,
            business_id: businessId,
            stripe_session_id: session.id,
            amount_cents: session.amount_total ?? 0,
          });
          if (!pErr) {
            const { data: lead } = await db.from("leads").select("buyers_count, max_buyers, customer_email, customer_name, title").eq("id", leadId).single();
            if (lead) {
              const count = lead.buyers_count + 1;
              await db.from("leads").update({ buyers_count: count, status: count >= lead.max_buyers ? "sold_out" : "open" }).eq("id", leadId);
              const { data: biz } = await db.from("businesses").select("company_name, email, phone").eq("id", businessId).single();
              if (biz) {
                await sendEmail({
                  to: biz.email,
                  subject: `Kontaktdaten freigeschaltet: ${lead.title}`,
                  html: emailLayout("Kontaktdaten freigeschaltet", `<p>Die Kontaktdaten zur Anfrage <strong>${lead.title}</strong> sind jetzt in Ihrem Dashboard sichtbar.</p><p><a href="${siteUrl()}/betriebe/dashboard?tab=gekauft">Zum Dashboard</a></p>`),
                });
                await sendEmail({
                  to: lead.customer_email,
                  subject: "Ein Betrieb meldet sich bei Ihnen",
                  html: emailLayout("Ein Betrieb meldet sich", `<p>Hallo ${lead.customer_name},</p><p>der Betrieb <strong>${biz.company_name}</strong> hat Ihre Anfrage angenommen und wird sich in Kürze bei Ihnen melden${biz.phone ? ` (Tel. ${biz.phone})` : ""}.</p>`),
                });
              }
            }
          }
        }

        if (kind === "subscription" && session.metadata?.business_id) {
          await db.from("businesses").update({ subscription_status: "active", stripe_customer_id: customerId }).eq("id", session.metadata.business_id);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const statusMap: Record<string, string> = { active: "active", trialing: "active", past_due: "past_due", canceled: "canceled", unpaid: "past_due", incomplete: "none", incomplete_expired: "none", paused: "canceled" };
        const periodEnd = sub.current_period_end;
        await db.from("businesses").update({
          subscription_status: statusMap[sub.status] ?? "none",
          subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }).eq("stripe_customer_id", customerId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[webhook] Verarbeitungsfehler", e);
    await db.from("processed_stripe_events").delete().eq("event_id", event.id);
    return new Response("Verarbeitungsfehler", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
