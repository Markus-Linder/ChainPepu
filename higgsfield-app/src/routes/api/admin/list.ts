import { createFileRoute } from "@tanstack/react-router";
import { db, isAdmin, json, type CampaignRow, type ListingRow } from "../../../lib/ser7.server";

export const Route = createFileRoute("/api/admin/list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdmin(request)) return json({ error: "Wrong password" }, 401);
        const d = db();
        if (!d) return json({ error: "Database unavailable" }, 503);
        const filter = new URL(request.url).searchParams.get("filter") ?? "open";
        const listingWhere = filter === "all" ? "1=1" : "status = 'pending'";
        const campaignWhere = filter === "all" ? "1=1" : "status = 'review'";
        const [listings, campaigns, stats] = await Promise.all([
          d.prepare(`SELECT * FROM listings WHERE ${listingWhere} ORDER BY id DESC LIMIT 200`).all<ListingRow>(),
          d.prepare(`SELECT * FROM campaigns WHERE ${campaignWhere} ORDER BY id DESC LIMIT 200`).all<CampaignRow>(),
          d.prepare(
            "SELECT (SELECT count(*) FROM listings WHERE status='pending') AS pending, (SELECT count(*) FROM listings WHERE status='approved') AS approved, (SELECT count(*) FROM campaigns WHERE status='review') AS review, (SELECT count(*) FROM campaigns WHERE status='active') AS active, (SELECT coalesce(sum(price_cents),0) FROM campaigns WHERE status IN ('review','active')) AS revenue",
          ).first(),
        ]);
        return json({ listings: listings.results ?? [], campaigns: campaigns.results ?? [], stats });
      },
    },
  },
});
