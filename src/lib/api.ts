import { supabase } from "@/integrations/supabase/client";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
  }
}

/** Call a Supabase Edge Function with the current session (anonymous sessions included). */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js wraps non-2xx responses; try to surface our JSON error payload.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = (await ctx.json()) as { error?: string; code?: string };
        throw new ApiError(ctx.status, payload.error ?? error.message, payload.code ?? "error");
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    throw new ApiError(500, error.message, "error");
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new ApiError(400, (data as { error: string }).error, (data as { code?: string }).code ?? "error");
  }
  return data as T;
}
