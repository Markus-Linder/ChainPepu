import { error, handleOptions, json } from "../_shared/cors.ts";
import { adminClient, siteUrl } from "../_shared/supabase.ts";
import { emailLayout, sendEmail } from "../_shared/notify.ts";
import { TRADE_NAMES } from "../_shared/prompts.ts";

interface Body {
  quote_id?: string;
  project_id?: string;
  token: string;
  name: string;
  email: string;
  phone?: string;
  plz: string;
  city?: string;
  timeframe?: string;
  preferred_contact?: "phone" | "email";
  consent: boolean;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Nur POST erlaubt", 405);
  let b: Body;
  try {
    b = await req.json();
  } catch {
    return error("Ungültiger JSON-Body.");
  }
  if (!b.consent) return error("Bitte stimmen Sie der Weitergabe Ihrer Kontaktdaten an bis zu drei Betriebe zu.");
  if (!b.name?.trim() || !/^\S+@\S+\.\S+$/.test(b.email ?? "") || !/^\d{5}$/.test(b.plz ?? "")) {
    return error("Bitte Name, gültige E-Mail und fünfstellige PLZ angeben.");
  }
  if (!b.quote_id && !b.project_id) return error("Referenz fehlt.");

  const db = adminClient();
  let trade = "sonstiges";
  let title = "Handwerksprojekt";
  let summary = "";
  let existingTotal: number | null = null;
  let budgetMin: number | null = null;
  let budgetMax: number | null = null;

  if (b.quote_id) {
    const { data: q } = await db.from("quotes").select("id, access_token, trade, project_title").eq("id", b.quote_id).single();
    if (!q || q.access_token !== b.token) return error("Zugriff ungültig.", 403);
    const { data: a } = await db.from("quote_analyses").select("result").eq("quote_id", q.id).single();
    const r = (a?.result ?? {}) as Record<string, unknown>;
    trade = q.trade;
    title = q.project_title || `${TRADE_NAMES[trade] ?? trade}: Vergleichsangebot gesucht`;
    summary = String(r.summary ?? "Kunde hat bereits ein Angebot und sucht Vergleichsangebote.");
    existingTotal = typeof r.total_gross === "number" ? r.total_gross : null;
    const pa = r.price_assessment as { comparable_min?: number | null; comparable_max?: number | null } | undefined;
    budgetMin = pa?.comparable_min ?? null;
    budgetMax = pa?.comparable_max ?? null;
    const { data: existing } = await db.from("leads").select("id").eq("quote_id", q.id).limit(1);
    if (existing && existing.length) return json({ ok: true, already: true });
  } else if (b.project_id) {
    const { data: p } = await db.from("projects").select("id, access_token, trade, title, result").eq("id", b.project_id).single();
    if (!p || p.access_token !== b.token) return error("Zugriff ungültig.", 403);
    const r = (p.result ?? {}) as { summary?: string; estimated_range?: { min: number | null; max: number | null } };
    trade = p.trade;
    title = p.title || `${TRADE_NAMES[trade] ?? trade}: Angebote gesucht`;
    summary = r.summary ?? "Kunde hat ein Leistungsverzeichnis erstellt und sucht Angebote.";
    budgetMin = r.estimated_range?.min ?? null;
    budgetMax = r.estimated_range?.max ?? null;
    const { data: existing } = await db.from("leads").select("id").eq("project_id", p.id).limit(1);
    if (existing && existing.length) return json({ ok: true, already: true });
  }

  const { data: lead, error: insErr } = await db
    .from("leads")
    .insert({
      quote_id: b.quote_id ?? null,
      project_id: b.project_id ?? null,
      trade,
      plz: b.plz,
      city: b.city ?? null,
      title,
      summary: summary.slice(0, 1200),
      budget_min: budgetMin,
      budget_max: budgetMax,
      existing_quote_total: existingTotal,
      timeframe: b.timeframe ?? null,
      customer_name: b.name.trim(),
      customer_email: b.email.trim(),
      customer_phone: b.phone?.trim() || null,
      preferred_contact: b.preferred_contact ?? "phone",
    })
    .select("id, region")
    .single();
  if (insErr || !lead) return error("Anfrage konnte nicht gespeichert werden.", 500, insErr?.message);

  // Passende Betriebe benachrichtigen
  const { data: matches } = await db
    .from("businesses")
    .select("email, company_name, trades, regions")
    .contains("trades", [trade]);
  const recipients = (matches ?? []).filter((m) => !m.regions?.length || m.regions.includes(lead.region)).map((m) => m.email);
  if (recipients.length) {
    await sendEmail({
      to: recipients.slice(0, 50),
      subject: `Neue Anfrage: ${TRADE_NAMES[trade] ?? trade} in ${b.plz.slice(0, 2)}xxx`,
      html: emailLayout(
        "Neue Anfrage in Ihrer Region",
        `<p><strong>${title}</strong></p><p>${summary.slice(0, 300)}…</p>
         <p>Region: PLZ ${b.plz.slice(0, 2)}xxx${existingTotal ? ` · Vorliegendes Angebot: ca. ${Math.round(existingTotal)} €` : ""}</p>
         <p><a href="${siteUrl()}/betriebe/dashboard" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Anfrage ansehen</a></p>`,
      ),
    });
  }

  await sendEmail({
    to: b.email,
    subject: "Ihre Anfrage für Vergleichsangebote ist aktiv",
    html: emailLayout(
      "Ihre Anfrage ist aktiv",
      `<p>Hallo ${b.name},</p><p>bis zu drei geprüfte Betriebe aus Ihrer Region können sich jetzt bei Ihnen melden. Sie entscheiden, mit wem Sie sprechen.</p>
       <p>Tipp: Schicken Sie den Betrieben Ihren Prüfbericht, dann kalkulieren alle den gleichen Umfang.</p>`,
    ),
  });

  return json({ ok: true, lead_id: lead.id, notified: recipients.length });
});
