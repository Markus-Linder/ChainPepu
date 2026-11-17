import { createFileRoute } from "@tanstack/react-router";
import { db, isAdmin, json } from "../../../lib/ser7.server";

// Freigeben / Ablehnen von Einträgen und Sponsorplätzen
export const Route = createFileRoute("/api/admin/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAdmin(request)) return json({ error: "Falsches Passwort" }, 401);
        const d = db();
        if (!d) return json({ error: "Datenbank nicht verfügbar" }, 503);
        const body = (await request.json().catch(() => ({}))) as { type?: string; id?: number; action?: string };
        const id = Number(body.id);
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Ungültige ID" }, 400);
        if (body.type === "listing") {
          const status = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : null;
          if (!status) return json({ error: "Ungültige Aktion" }, 400);
          await d.prepare("UPDATE listings SET status = ?, reviewed_at = datetime('now') WHERE id = ?").bind(status, id).run();
          return json({ ok: true });
        }
        if (body.type === "campaign") {
          if (body.action === "approve") {
            const c = await d.prepare("SELECT days, status FROM campaigns WHERE id = ?").bind(id).first<{ days: number; status: string }>();
            if (!c) return json({ error: "Nicht gefunden" }, 404);
            if (c.status === "unpaid") return json({ error: "Diese Buchung ist noch nicht bezahlt." }, 409);
            const start = new Date();
            const end = new Date(start.getTime() + c.days * 86_400_000);
            await d
              .prepare("UPDATE campaigns SET status = 'active', starts_at = ?, ends_at = ? WHERE id = ?")
              .bind(start.toISOString(), end.toISOString(), id)
              .run();
            return json({ ok: true });
          }
          if (body.action === "reject") {
            await d.prepare("UPDATE campaigns SET status = 'rejected' WHERE id = ?").bind(id).run();
            return json({ ok: true, note: "Bitte die Zahlung im Stripe-Dashboard erstatten." });
          }
        }
        return json({ error: "Ungültige Anfrage" }, 400);
      },
    },
  },
});
