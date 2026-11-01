// Shared helpers for Supabase Edge Functions (Deno runtime).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined) throw new HttpError(500, `Missing environment variable ${name}`);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.length > 0 ? v : undefined;
}

/** Service-role client: bypasses RLS. Only use inside edge functions. */
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve the calling user (anonymous visitors included) from the Authorization header. */
export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new HttpError(401, "Not authenticated", "unauthenticated");
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid session", "unauthenticated");
  return data.user;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body", "bad_request");
  }
}

/** Wrap a handler with CORS + error formatting. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code ?? "error" }, e.status);
      console.error(e);
      return json({ error: "Internal error", code: "internal" }, 500);
    }
  });
}

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const uuid = () => crypto.randomUUID();
