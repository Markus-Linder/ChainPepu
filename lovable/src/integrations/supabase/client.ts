// Lovable legt diese Datei beim Verbinden mit Supabase selbst an. Falls sie
// schon existiert, diese Version einfach verwerfen.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
});
