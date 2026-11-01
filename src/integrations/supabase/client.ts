// Lovable convention: Supabase credentials come from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? "http://localhost:54321", key ?? "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const functionsUrl = `${(url ?? "http://localhost:54321").replace(/\/$/, "")}/functions/v1`;
