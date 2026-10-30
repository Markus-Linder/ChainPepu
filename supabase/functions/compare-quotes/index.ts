import { error, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { structured } from "../_shared/anthropic.ts";
import { ComparisonSchema } from "../_shared/schemas.ts";
import { COMPARISON_SYSTEM } from "../_shared/prompts.ts";

interface Body { quotes: { id: string; token: string }[] }

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Nur POST erlaubt", 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return error("Ungültiger JSON-Body.");
  }
  const refs = (body.quotes ?? []).slice(0, 5);
  if (refs.length < 2) return error("Bitte mindestens zwei Angebote auswählen.");

  const db = adminClient();
  const quotes: { id: string; file_name: string | null; analysis: Record<string, unknown> }[] = [];
  for (const r of refs) {
    const { data: q } = await db.from("quotes").select("id, access_token, file_name, status").eq("id", r.id).single();
    if (!q || q.access_token !== r.token) return error("Ein Angebot konnte nicht gefunden werden oder der Zugriff ist ungültig.", 403);
    if (q.status !== "done") return error("Mindestens ein Angebot ist noch nicht fertig analysiert.");
    const { data: a } = await db.from("quote_analyses").select("result").eq("quote_id", q.id).single();
    if (!a) return error("Analyse fehlt.");
    const { preview: _p, ...full } = a.result as Record<string, unknown>;
    quotes.push({ id: q.id, file_name: q.file_name, analysis: full });
  }

  try {
    const text = quotes
      .map((q, i) => `### Angebot ${i + 1} (quote_id: ${q.id}, Datei: ${q.file_name ?? "unbekannt"})\n${JSON.stringify(q.analysis)}`)
      .join("\n\n");
    const result = await structured({
      system: COMPARISON_SYSTEM,
      content: [{ type: "text", text: `Vergleiche die folgenden Angebote. Verwende exakt die quote_id-Werte.\n\n${text}` }],
      schema: ComparisonSchema,
      effort: "medium",
      maxTokens: 12000,
    });
    const { data, error: insErr } = await db
      .from("comparisons")
      .insert({ quote_ids: quotes.map((q) => q.id), result: result.data })
      .select("id, access_token")
      .single();
    if (insErr || !data) return error("Vergleich konnte nicht gespeichert werden.", 500, insErr?.message);
    return json({ id: data.id, token: data.access_token });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Unbekannter Fehler", 500);
  }
});
