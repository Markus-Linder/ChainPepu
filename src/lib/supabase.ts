import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** True when Supabase env vars are present. Lets the app render a setup hint instead of crashing. */
export const supabaseReady = Boolean(url && key);

export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-anon-key",
);
