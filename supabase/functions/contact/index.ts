import { error, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { emailLayout, sendEmail } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Nur POST erlaubt", 405);
  let b: { name?: string; email?: string; phone?: string; subject?: string; message?: string; website?: string };
  try {
    b = await req.json();
  } catch {
    return error("Ungültiger JSON-Body.");
  }
  if (b.website) return json({ ok: true }); // Honeypot
  if (!b.name?.trim() || !/^\S+@\S+\.\S+$/.test(b.email ?? "") || !b.message?.trim()) return error("Bitte Name, E-Mail und Nachricht ausfüllen.");
  const db = adminClient();
  const { error: insErr } = await db.from("contact_messages").insert({ name: b.name.trim(), email: b.email!.trim(), phone: b.phone?.trim() || null, subject: b.subject?.trim() || null, message: b.message.trim() });
  if (insErr) return error("Nachricht konnte nicht gespeichert werden.", 500, insErr.message);
  await sendEmail({
    to: Deno.env.get("CONTACT_EMAIL") ?? "kontakt@profiangebot.de",
    subject: `Kontaktanfrage: ${b.subject?.trim() || "ohne Betreff"}`,
    replyTo: b.email!.trim(),
    html: emailLayout("Neue Kontaktanfrage", `<p><strong>${b.name}</strong> (${b.email}${b.phone ? `, ${b.phone}` : ""})</p><p>${b.message.replace(/\n/g, "<br>")}</p>`),
  });
  return json({ ok: true });
});
