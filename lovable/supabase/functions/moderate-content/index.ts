// KI-Prüfung neuer Glieder. Wird von einem Datenbank-Webhook auf INSERT in "links" aufgerufen.
// Prüft den Text mit Claude; bei Verstoß wird das Glied gesperrt und der Autor informiert.
// Secrets in Supabase setzen: ANTHROPIC_API_KEY. In config.toml: verify_jwt = false,
// dafür prüfen wir hier ein eigenes Geheimnis (MODERATION_WEBHOOK_SECRET) aus dem Header.
import Anthropic from "npm:@anthropic-ai/sdk@0.78.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SYSTEM = `Du bist die Inhaltsprüfung einer deutschsprachigen Social-App. Prüfe den Beitrag auf
kritische Inhalte: Gewaltverherrlichung oder -aufrufe, Hass gegen Gruppen, Belästigung oder Mobbing,
sexuelle Inhalte mit Minderjährigen, Selbstverletzung, Terrorismus, illegale Angebote (Drogen, Waffen),
Betrug oder Spam. Harmlose Alltagsinhalte, Humor, Meinungen und Kritik sind erlaubt.
Antworte ausschließlich mit JSON in genau dieser Form, ohne weiteren Text:
{"verstoss": true|false, "kategorie": "<kurz oder leer>", "begruendung": "<ein Satz>"}`;

type Verdict = { verstoss: boolean; kategorie?: string; begruendung?: string };

Deno.serve(async (req) => {
  const expected = Deno.env.get("MODERATION_WEBHOOK_SECRET");
  if (expected && req.headers.get("x-webhook-secret") !== expected) {
    return new Response("Nicht erlaubt", { status: 401 });
  }
  const payload = await req.json();
  const record = payload?.record ?? payload;
  const linkId = record?.id as number | undefined;
  const text = String(record?.text ?? "").trim();
  if (!linkId || !text) return Response.json({ skipped: true });

  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  let verdict: Verdict = { verstoss: false };
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 256,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `Beitrag:\n"""\n${text}\n"""` }],
    });
    if (response.stop_reason !== "refusal") {
      const raw = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) verdict = JSON.parse(match[0]) as Verdict;
    }
  } catch (e) {
    // Bei einem API-Fehler bleibt das Glied sichtbar; Meldungen und Moderation fangen den Rest.
    console.error("Moderation fehlgeschlagen:", (e as Error).message);
    return Response.json({ error: (e as Error).message }, { status: 200 });
  }

  if (verdict.verstoss) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("links").update({ status: "gesperrt" }).eq("id", linkId);
    await admin.from("notifications").insert({
      user_id: record.user_id,
      type: "moderation",
      chain_id: record.chain_id,
      message: `Ein Glied von dir wurde automatisch gesperrt: ${verdict.begruendung ?? "Regelverstoß"}`,
    });
  }
  return Response.json({ link_id: linkId, ...verdict });
});
