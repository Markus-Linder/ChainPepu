import { createFileRoute } from "@tanstack/react-router";
import { db, json } from "../../lib/ser7.server";

// Zählt Klicks auf Sponsorplätze (für den Werbeanzeigenmanager)
export const Route = createFileRoute("/api/click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const id = Number(new URL(request.url).searchParams.get("id"));
        const d = db();
        if (d && Number.isInteger(id) && id > 0) {
          await d.prepare("UPDATE campaigns SET clicks = clicks + 1 WHERE id = ? AND status = 'active'").bind(id).run();
        }
        return json({ ok: true });
      },
    },
  },
});
