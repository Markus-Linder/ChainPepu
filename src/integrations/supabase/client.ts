import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn("Supabase-Umgebungsvariablen fehlen. Bitte VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY setzen.");
}

// Hinweis: Lovable/Supabase generieren bei Bedarf typisierte Clients (src/integrations/supabase/types.ts).
// Der Client bleibt hier bewusst untypisiert, damit RPC-Aufrufe und Tabellen ohne Typ-Regeneration funktionieren.
export const supabase = createClient(SUPABASE_URL ?? "http://localhost:54321", SUPABASE_PUBLISHABLE_KEY ?? "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, storage: typeof window !== "undefined" ? window.localStorage : undefined },
});
