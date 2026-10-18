// Push-Mitteilungen aufs Handy. Wird per Datenbank-Webhook auf INSERT in "notifications" aufgerufen.
// Secrets in Supabase: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), MODERATION_WEBHOOK_SECRET (optional).
// Schlüssel erzeugen: npx web-push generate-vapid-keys. Den öffentlichen Schlüssel auch als VITE_VAPID_PUBLIC_KEY in die App.
// config.toml: verify_jwt = false.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

Deno.serve(async (req) => {
  const expected = Deno.env.get("MODERATION_WEBHOOK_SECRET");
  if (expected && req.headers.get("x-webhook-secret") !== expected) return new Response("Nicht erlaubt", { status: 401 });
  const payload = await req.json();
  const n = payload?.record;
  if (!n?.user_id) return Response.json({ skipped: true });

  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", n.user_id);
  const url = n.params?.duel ? `/duel/${n.params.duel}` : n.chain_id ? `/c/${n.chain_id}` : "/notifications";
  const body = JSON.stringify({ title: "ChainPepu", body: n.message, url, tag: `cp-${n.id}` });
  let sent = 0;
  for (const s of subs ?? []) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body); sent++; }
    catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id); // abgelaufen
    }
  }
  return Response.json({ sent });
});
