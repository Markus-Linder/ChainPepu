import { createFileRoute } from "@tanstack/react-router";

// Darf eine Seite in einem iframe gezeigt werden? (X-Frame-Options / CSP frame-ancestors)
async function isFrameable(target: string): Promise<boolean> {
  try {
    const r = await fetch(target, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; ChainPepu/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    await r.body?.cancel();
    const xfo = (r.headers.get("x-frame-options") ?? "").toLowerCase();
    const csp = (r.headers.get("content-security-policy") ?? "").toLowerCase();
    const fa = csp
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("frame-ancestors"));
    return !xfo && (!fa || /frame-ancestors\s+(\*|https?:)/.test(fa));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/frameable")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url") ?? "";
        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return Response.json({ error: "Ungültige Adresse" }, { status: 400 });
        }
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return Response.json({ error: "Ungültige Adresse" }, { status: 400 });
        }
        const frameable = await isFrameable(parsed.href);
        return Response.json(
          { frameable },
          { headers: { "cache-control": "public, max-age=3600" } },
        );
      },
    },
  },
});
