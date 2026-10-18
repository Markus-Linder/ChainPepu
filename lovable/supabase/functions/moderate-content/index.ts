// Prüfung VOR der Veröffentlichung: Text, Bild und Video (als Standbilder) eines Glieds oder einer Antwort.
// Aufruf auf zwei Wegen:
//   1. Vom Client direkt nach dem Absenden (Bearer-JWT des Autors, Body {link_id} oder {reply_id}).
//   2. Per Datenbank-Webhook auf INSERT in "links"/"replies" (Header x-webhook-secret).
// Ergebnis: status 'sichtbar' (frei) oder 'gesperrt' (Verstoß, mit Begründung). Bei unklaren Fällen
// 'gemeldet' (Mensch prüft). Bei API-Fehler bleibt der Beitrag in 'pruefung' und landet in der Moderation.
// Secrets in Supabase: ANTHROPIC_API_KEY, MODERATION_WEBHOOK_SECRET (optional). config.toml: verify_jwt = false.
import Anthropic from "npm:@anthropic-ai/sdk@0.78.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SYSTEM = `You are the content safety check of an international social app. Posts may be in any language.
A post is a VIOLATION if it contains or clearly promotes: violence or threats, hate or contempt against groups
(origin, religion, gender, sexuality, disability, age), harassment or bullying, sexual content involving minors
or any exploitation, nudity or explicit sexual content, self-harm or eating disorders, terrorism or extremism
or banned symbols, illegal offers (drugs, weapons, forged documents), fraud, scams or spam, or doxxing.
Everyday life, humor, opinions, criticism, art, sport, food, pets, selfies and mild language are ALLOWED.
Images and video frames must be judged as strictly as text. If a frame shows nudity, gore, weapons used
against people, hate symbols or drugs, it is a violation.
Answer ONLY with JSON in exactly this form, nothing else:
{"violation": true|false, "category": "<short label or empty>", "reason": "<one short, friendly sentence in the language of the post, telling the author why it was not published>"}`;

type Verdict = { violation: boolean; category?: string; reason?: string };
type Row = { id: number; user_id: string; chain_id: number; text: string; status: string; image_url?: string | null; video_frames?: string[] | null };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Kein JSON" }, 400); }

  // Welche Zeile? Webhook liefert {table, record}, der Client {link_id} oder {reply_id}.
  const record = (body.record ?? null) as Row | null;
  const table = body.table === "replies" || body.reply_id ? "replies" : "links";
  const id = Number(body.link_id ?? body.reply_id ?? record?.id);
  if (!id) return json({ error: "Keine ID" }, 400);

  // Zugriff: entweder Webhook-Geheimnis oder der angemeldete Autor der Zeile.
  const secret = Deno.env.get("MODERATION_WEBHOOK_SECRET");
  const viaWebhook = Boolean(secret) && req.headers.get("x-webhook-secret") === secret;
  let callerId: string | null = null;
  if (!viaWebhook) {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data } = await admin.auth.getUser(jwt);
    callerId = data.user?.id ?? null;
    if (!callerId) return json({ error: "Nicht erlaubt" }, 401);
  }

  const { data: row } = await admin.from(table).select("*").eq("id", id).maybeSingle();
  if (!row) return json({ error: "Nicht gefunden" }, 404);
  const r = row as Row;
  if (callerId && r.user_id !== callerId) return json({ error: "Nicht erlaubt" }, 403);
  if (r.status !== "pruefung") return json({ skipped: true, status: r.status });

  // Inhalt zusammenstellen: Text plus alle Bilder (Foto oder Video-Standbilder).
  const images = [r.image_url, ...(r.video_frames ?? [])].filter((u): u is string => Boolean(u)).slice(0, 6);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...images.map((url): Anthropic.Beta.BetaImageBlockParam => ({ type: "image", source: { type: "url", url } })),
    { type: "text", text: `Post text:\n"""\n${String(r.text ?? "").trim() || "(no text)"}\n"""\n${images.length ? `Attached: ${images.length} image(s)${r.video_frames?.length ? " (video frames)" : ""}.` : ""}` },
  ];

  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  let verdict: Verdict | null = null;
  let refused = false;
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 512,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") {
      refused = true;
    } else {
      const raw = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) verdict = JSON.parse(match[0]) as Verdict;
    }
  } catch (e) {
    // Bleibt in 'pruefung' und landet in der Moderations-Warteschlange.
    console.error("Moderation fehlgeschlagen:", (e as Error).message);
    return json({ error: (e as Error).message, status: "pruefung" });
  }

  if (refused || !verdict) {
    // Unklar: ein Mensch entscheidet.
    await admin.from(table).update({ status: "gemeldet", moderation_note: "Automatische Prüfung unklar, bitte manuell entscheiden." }).eq("id", id);
    return json({ status: "gemeldet" });
  }

  if (verdict.violation) {
    const reason = verdict.reason || "Rule violation";
    await admin.from(table).update({ status: "gesperrt", moderation_note: `${verdict.category ?? ""}: ${reason}`.replace(/^: /, "") }).eq("id", id);
    await admin.from("notifications").insert({
      user_id: r.user_id, type: "moderation", chain_id: r.chain_id,
      message: `Ein Beitrag von dir wurde nicht veröffentlicht: ${reason}`,
      params: { key: "auto_blocked", reason },
    });
    return json({ status: "gesperrt", ...verdict });
  }

  await admin.from(table).update({ status: "sichtbar", moderation_note: "ok" }).eq("id", id);
  return json({ status: "sichtbar" });
});
