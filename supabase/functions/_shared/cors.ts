export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

export function error(message: string, status = 400, details?: unknown) {
  console.error("[error]", status, message, details ?? "");
  return json({ error: message, details: details ?? null }, status);
}

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}
