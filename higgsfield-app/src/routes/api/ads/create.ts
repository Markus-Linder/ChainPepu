import { createFileRoute } from "@tanstack/react-router";
import {
  checkContent,
  clean,
  db,
  isEmail,
  json,
  normalizeUrl,
  pricePerDayCents,
  randomToken,
  stripe,
} from "../../../lib/ser7.server";

// Werbekunde bucht einen Sponsorplatz: Vorprüfung → Stripe Checkout
export const Route = createFileRoute("/api/ads/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const d = db();
        if (!d) return json({ error: "Datenbank nicht verfügbar" }, 503);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const url = normalizeUrl(body.url);
        const headline = clean(body.headline, 80);
        const description = clean(body.description, 300);
        const keywords = clean(body.keywords, 200).toLowerCase();
        const promo = clean(body.promo, 80);
        const email = clean(body.email, 200);
        const days = [7, 14, 30, 90].includes(Number(body.days)) ? Number(body.days) : 0;
        if (!url) return json({ error: "Bitte eine gültige Zieladresse angeben." }, 400);
        if (headline.length < 3) return json({ error: "Bitte eine Überschrift angeben." }, 400);
        if (keywords.split(/[,;]+/).filter((k) => k.trim()).length < 1) return json({ error: "Bitte mindestens ein Suchwort angeben." }, 400);
        if (!isEmail(email)) return json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, 400);
        if (!days) return json({ error: "Bitte eine Laufzeit wählen." }, 400);
        if (body.accept !== true) return json({ error: "Bitte bestätige die Werberichtlinien." }, 400);

        const check = await checkContent(url, [headline, description, keywords, promo]);
        if (check.verdict === "reject") {
          return json({ error: `Diese Anzeige kann nicht gebucht werden: ${check.reasons.join(", ")}.` }, 422);
        }
        const price = days * pricePerDayCents();
        const token = randomToken();
        await d
          .prepare("INSERT INTO campaigns (token, url, headline, description, keywords, promo, days, price_cents, email, status, check_result) VALUES (?,?,?,?,?,?,?,?,?, 'unpaid', ?)")
          .bind(token, url, headline, description, keywords, promo, days, price, email, JSON.stringify(check))
          .run();

        const origin = new URL(request.url).origin;
        try {
          const session = await stripe("checkout/sessions", {
            form: {
              mode: "payment",
              "line_items[0][quantity]": "1",
              "line_items[0][price_data][currency]": "eur",
              "line_items[0][price_data][unit_amount]": String(price),
              "line_items[0][price_data][product_data][name]": `ser7 Sponsorplatz · ${days} Tage`,
              "line_items[0][price_data][product_data][description]": `„${headline}“ für: ${keywords}`.slice(0, 300),
              customer_email: email,
              "metadata[campaign_token]": token,
              success_url: `${origin}/werbung/?k=${token}&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${origin}/werbung/?k=${token}&abgebrochen=1`,
            },
          });
          await d.prepare("UPDATE campaigns SET stripe_session = ? WHERE token = ?").bind(String(session.id), token).run();
          return json({ ok: true, token, checkoutUrl: session.url });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg === "STRIPE_NOT_CONFIGURED") {
            return json({ ok: true, token, checkoutUrl: null, message: "Die Online-Bezahlung ist noch nicht eingerichtet. Deine Buchung ist gespeichert, wir melden uns per E-Mail." });
          }
          console.error(e);
          return json({ error: "Die Bezahlung konnte nicht gestartet werden. Bitte später erneut versuchen." }, 502);
        }
      },
    },
  },
});
