// TikTok Login Kit: links a TikTok account to the signed-in user so we can read their videos.
// GET ?action=start&redirect=<app url>  -> redirects to TikTok (requires Authorization header via fetch, so the client calls it and follows `url`)
// GET ?action=callback&code=..&state=.. -> TikTok redirects here; we store tokens and send the user back to the app.
import { authorizeUrl, exchangeCode, fetchUser, type TikTokConfig } from "../_shared/tiktok.ts";
import { adminClient, env, HttpError, json, optionalEnv, requireUser, serve } from "../_shared/supabase.ts";

function config(): TikTokConfig | null {
  const clientKey = optionalEnv("TIKTOK_CLIENT_KEY");
  const clientSecret = optionalEnv("TIKTOK_CLIENT_SECRET");
  if (!clientKey || !clientSecret) return null;
  return { clientKey, clientSecret, redirectUri: `${env("SUPABASE_URL")}/functions/v1/tiktok-auth?action=callback` };
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("SUPABASE_SERVICE_ROLE_KEY")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const cfg = config();

  if (action === "status") return json({ configured: cfg !== null });

  if (action === "start") {
    if (!cfg) throw new HttpError(400, "TikTok login is not configured", "tiktok_not_configured");
    const user = await requireUser(req);
    const redirect = url.searchParams.get("redirect") ?? "/onboarding";
    const payload = `${user.id}.${Date.now()}.${encodeURIComponent(redirect)}`;
    const state = `${payload}.${await hmac(payload)}`;
    return json({ url: authorizeUrl(cfg, state) });
  }

  if (action === "callback") {
    if (!cfg) throw new HttpError(400, "TikTok login is not configured", "tiktok_not_configured");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? "";
    const [userId, ts, redirectEnc, sig] = state.split(".");
    if (!code || !userId || !ts || !sig || (await hmac(`${userId}.${ts}.${redirectEnc}`)) !== sig) throw new HttpError(400, "Invalid state", "bad_state");
    if (Date.now() - Number(ts) > 15 * 60_000) throw new HttpError(400, "Login expired, try again", "expired");
    const tokens = await exchangeCode(cfg, code);
    const ttUser = await fetchUser(tokens.access_token);
    const db = adminClient();
    await db.from("tiktok_connections").upsert({
      user_id: userId,
      open_id: tokens.open_id,
      username: ttUser.username ?? null,
      display_name: ttUser.display_name,
      avatar_url: ttUser.avatar_url ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope,
    });
    await db.from("profiles").update({ tiktok_open_id: tokens.open_id, tiktok_username: ttUser.username ?? null, avatar_url: ttUser.avatar_url ?? null }).eq("id", userId);
    const target = decodeURIComponent(redirectEnc ?? "/onboarding");
    return Response.redirect(`${target}${target.includes("?") ? "&" : "?"}tiktok=connected`, 302);
  }

  throw new HttpError(404, "Unknown action", "not_found");
});
