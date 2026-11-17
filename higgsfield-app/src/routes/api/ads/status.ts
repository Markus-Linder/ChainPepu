import { createFileRoute } from "@tanstack/react-router";
import { db, json, stripe, type CampaignRow } from "../../../lib/ser7.server";

// Werbeanzeigenmanager: Status und Zahlen einer Buchung über den privaten Link
export const Route = createFileRoute("/api/ads/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const d = db();
        if (!d) return json({ error: "Database unavailable" }, 503);
        const token = new URL(request.url).searchParams.get("k") ?? "";
        if (!/^[a-f0-9]{36}$/.test(token)) return json({ error: "Invalid link" }, 400);
        let c = await d.prepare("SELECT * FROM campaigns WHERE token = ?").bind(token).first<CampaignRow>();
        if (!c) return json({ error: "Booking not found" }, 404);
        // Zahlung bei Stripe prüfen, solange noch offen
        if (c.status === "unpaid" && c.stripe_session) {
          try {
            const s = await stripe(`checkout/sessions/${encodeURIComponent(c.stripe_session)}`);
            if (s.payment_status === "paid") {
              await d.prepare("UPDATE campaigns SET status = 'review' WHERE id = ? AND status = 'unpaid'").bind(c.id).run();
              c = { ...c, status: "review" };
            }
          } catch (e) {
            console.error(e);
          }
        }
        const pub: Partial<CampaignRow> = { ...c };
        delete pub.token;
        delete pub.stripe_session;
        delete pub.check_result;
        return json({ campaign: pub });
      },
    },
  },
});
