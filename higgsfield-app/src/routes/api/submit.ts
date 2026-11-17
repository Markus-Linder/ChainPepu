import { createFileRoute } from "@tanstack/react-router";
import { checkContent, clean, db, isEmail, json, normalizeUrl } from "../../lib/ser7.server";

// Besucher tragen eine Webseite oder ein Video ein. Automatische Vorprüfung,
// danach Freigabe durch den Betreiber.
export const Route = createFileRoute("/api/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const d = db();
        if (!d) return json({ error: "Database unavailable" }, 503);
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Invalid request" }, 400);
        }
        const kind = body.kind === "video" ? "video" : "web";
        const url = normalizeUrl(body.url);
        const title = clean(body.title, 120);
        const description = clean(body.description, 600);
        const keywords = clean(body.keywords, 200);
        const promo = clean(body.promo, 80);
        const promoUntil = /^\d{4}-\d{2}-\d{2}$/.test(String(body.promo_until ?? "")) ? String(body.promo_until) : null;
        const email = clean(body.email, 200);
        if (!url) return json({ error: "Please enter a valid address, e.g. https://myshop.com" }, 400);
        if (title.length < 3) return json({ error: "Please enter a title with at least 3 characters." }, 400);
        if (email && !isEmail(email)) return json({ error: "That email address doesn't look valid." }, 400);
        if (body.accept !== true) return json({ error: "Please confirm that the content is legal." }, 400);

        const dup = await d.prepare("SELECT id FROM listings WHERE url = ? AND status != 'rejected'").bind(url).first();
        if (dup) return json({ error: "This address is already listed or waiting for review." }, 409);

        const check = await checkContent(url, [title, description, keywords, promo]);
        const status = check.verdict === "reject" ? "rejected" : "pending";
        await d
          .prepare("INSERT INTO listings (kind, url, title, description, keywords, promo, promo_until, email, status, check_result) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .bind(kind, url, title, description, keywords, promo, promoUntil, email || null, status, JSON.stringify(check))
          .run();
        if (status === "rejected") {
          return json({ ok: false, status, message: `Your submission was rejected: ${check.reasons.join(", ")}.` });
        }
        return json({ ok: true, status, message: "Thanks! Your submission will be reviewed and appears in search once approved." });
      },
    },
  },
});
