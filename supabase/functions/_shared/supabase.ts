import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Liest den eingeloggten Nutzer aus dem Authorization-Header (Bearer JWT). */
export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export function siteUrl() {
  return (Deno.env.get("SITE_URL") ?? "https://profiangebot.de").replace(/\/$/, "");
}
