import { corsHeaders, error, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { fileToPart, structured, type ContentPart } from "../_shared/anthropic.ts";
import { AnalysisSchema, buildPreview } from "../_shared/schemas.ts";
import { ANALYSIS_SYSTEM, TRADE_NAMES, benchmarkTable } from "../_shared/prompts.ts";
import { emailLayout, sendEmail } from "../_shared/notify.ts";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Nur POST erlaubt", 405);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Ungültige Anfrage. Erwartet wird multipart/form-data.");
  }
  const file = form.get("file");
  const trade = String(form.get("trade") ?? "sonstiges");
  const email = (form.get("email") as string | null)?.trim() || null;
  const plz = (form.get("plz") as string | null)?.trim() || null;
  const city = (form.get("city") as string | null)?.trim() || null;
  const projectTitle = (form.get("project_title") as string | null)?.trim() || null;

  if (!(file instanceof File)) return error("Bitte eine Datei hochladen (PDF, JPG, PNG oder WebP).");
  if (file.size > MAX_BYTES) return error("Die Datei ist größer als 20 MB.");
  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!ALLOWED.has(mime)) return error(`Dateityp ${file.type || "unbekannt"} wird nicht unterstützt. Bitte PDF, JPG, PNG oder WebP hochladen.`);

  const db = adminClient();

  const { data: quote, error: insErr } = await db
    .from("quotes")
    .insert({ trade, email, plz, city, project_title: projectTitle, file_name: file.name, mime_type: mime, status: "processing" })
    .select("id, access_token")
    .single();
  if (insErr || !quote) return error("Angebot konnte nicht gespeichert werden.", 500, insErr?.message);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${quote.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await db.storage.from("quotes").upload(path, bytes, { contentType: mime, upsert: false });
  if (upErr) console.warn("[analyze-quote] Upload fehlgeschlagen:", upErr.message);
  else await db.from("quotes").update({ file_path: path }).eq("id", quote.id);

  try {
    const { data: benchmarks } = await db
      .from("price_benchmarks")
      .select("position, unit, price_min, price_typ, price_max")
      .eq("trade", trade);

    const { data: observed } = await db
      .from("observed_prices")
      .select("position, unit, unit_price")
      .eq("trade", trade)
      .not("unit_price", "is", null)
      .order("created_at", { ascending: false })
      .limit(60);

    const observedText = observed && observed.length
      ? observed.map((o) => `- ${o.position} | ${o.unit ?? ""} | ${o.unit_price} EUR`).join("\n")
      : "Noch keine Vergleichsdaten.";

    const content: ContentPart[] = [
      fileToPart(bytes, mime),
      {
        type: "text",
        text: `Gewerk laut Kunde: ${TRADE_NAMES[trade] ?? trade}
Region (PLZ): ${plz ?? "unbekannt"}${city ? `, ${city}` : ""}
Vorhaben laut Kunde: ${projectTitle ?? "nicht angegeben"}

Richtwerte für dieses Gewerk (brutto, min / typisch / max):
${benchmarkTable(benchmarks ?? [])}

Beobachtete Einheitspreise aus anderen Angeboten derselben Kategorie (anonymisiert):
${observedText}

Prüfe jetzt das Angebot vollständig.`,
      },
    ];

    const result = await structured({ system: ANALYSIS_SYSTEM, content, schema: AnalysisSchema, effort: "medium", maxTokens: 16000 });
    const analysis = result.data;

    await db.from("quote_analyses").insert({
      quote_id: quote.id,
      result: { ...analysis, preview: buildPreview(analysis) },
      model: result.model,
      input_tokens: result.usage.input,
      output_tokens: result.usage.output,
    });

    const observedRows = analysis.positions
      .filter((p) => p.unit_price !== null || p.total !== null)
      .slice(0, 80)
      .map((p) => ({
        quote_id: quote.id,
        trade,
        region: plz ? plz.slice(0, 2) : null,
        position: p.description.slice(0, 200),
        unit: p.unit,
        quantity: p.quantity,
        unit_price: p.unit_price,
        total: p.total,
      }));
    if (observedRows.length) await db.from("observed_prices").insert(observedRows);

    await db.from("quotes").update({ status: "done" }).eq("id", quote.id);

    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://profiangebot.de").replace(/\/$/, "");
    const reportUrl = `${siteUrl}/bericht/${quote.id}?t=${quote.access_token}`;
    if (email) {
      await sendEmail({
        to: email,
        subject: "Ihr Angebots-Check ist fertig",
        html: emailLayout(
          "Ihr Angebots-Check ist fertig",
          `<p>Wir haben Ihr Angebot geprüft. Ergebnis: <strong>${analysis.score} von 100 Punkten</strong>.</p>
           <p><a href="${reportUrl}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Bericht öffnen</a></p>
           <p style="color:#6b7a80;font-size:13px">Bewahren Sie diesen Link auf, er ist Ihr Zugang zum Bericht.</p>`,
        ),
      });
    }

    return json({ id: quote.id, token: quote.access_token, score: analysis.score }, 200, corsHeaders);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    await db.from("quotes").update({ status: "failed", error: message }).eq("id", quote.id);
    return error(message, 500);
  }
});
