/** E-Mail-Versand über Resend (optional). Ohne RESEND_API_KEY wird nur geloggt. */
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("FROM_EMAIL") ?? "Profiangebot <kontakt@profiangebot.de>";
  if (!key) {
    console.log("[notify] RESEND_API_KEY fehlt, E-Mail nicht gesendet:", opts.subject, "->", opts.to);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: Array.isArray(opts.to) ? opts.to : [opts.to], subject: opts.subject, html: opts.html, reply_to: opts.replyTo }),
  });
  if (!res.ok) {
    console.error("[notify] Resend-Fehler", res.status, await res.text());
    return { sent: false };
  }
  return { sent: true };
}

export function emailLayout(title: string, body: string) {
  return `<!doctype html><html lang="de"><body style="font-family:Inter,Arial,sans-serif;background:#f6f8f8;padding:24px;color:#13232a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e3e8ea">
    <div style="font-weight:800;color:#0f766e;font-size:20px;margin-bottom:16px">Profiangebot</div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.55">${body}</div>
    <hr style="border:none;border-top:1px solid #e3e8ea;margin:24px 0">
    <div style="font-size:12px;color:#6b7a80">Profiangebot · Markus Linder · Schloßwiesen 5 · 74579 Fichtenau · kontakt@profiangebot.de</div>
  </div></body></html>`;
}
