import { error, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { structured, type ContentPart } from "../_shared/anthropic.ts";
import { LvSchema } from "../_shared/schemas.ts";
import { LV_SYSTEM, TRADE_NAMES } from "../_shared/prompts.ts";

interface Body {
  trade: string;
  description: string;
  plz?: string;
  photos?: { data: string; media_type: "image/jpeg" | "image/png" | "image/webp" }[];
}

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
  const description = (body.description ?? "").trim();
  if (description.length < 20) return error("Bitte beschreiben Sie Ihr Vorhaben mit mindestens 20 Zeichen.");
  if (description.length > 8000) return error("Die Beschreibung ist zu lang (max. 8000 Zeichen).");
  const trade = body.trade || "sonstiges";
  const photos = (body.photos ?? []).slice(0, 6);

  const content: ContentPart[] = [
    ...photos.map((p): ContentPart => ({ type: "image", source: { type: "base64", media_type: p.media_type, data: p.data } })),
    {
      type: "text",
      text: `Gewerk: ${TRADE_NAMES[trade] ?? trade}
Region (PLZ): ${body.plz ?? "unbekannt"}

Beschreibung des Kunden (Diktat oder Text):
"""
${description}
"""

Erstelle daraus ein vollständiges Leistungsverzeichnis.`,
    },
  ];

  try {
    const result = await structured({ system: LV_SYSTEM, content, schema: LvSchema, effort: "medium", maxTokens: 12000 });
    const db = adminClient();
    const { data, error: insErr } = await db
      .from("projects")
      .insert({ trade, title: result.data.title, description, plz: body.plz ?? null, result: result.data })
      .select("id, access_token")
      .single();
    if (insErr || !data) return error("Leistungsverzeichnis konnte nicht gespeichert werden.", 500, insErr?.message);
    return json({ id: data.id, token: data.access_token });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Unbekannter Fehler", 500);
  }
});
