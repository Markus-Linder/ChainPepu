// Creator payout request. Balance = creator share of completed gifts - previous payouts.
import { ledger } from "../_shared/game.ts";
import { adminClient, HttpError, json, readJson, requireUser, serve } from "../_shared/supabase.ts";

const MIN_PAYOUT_CENTS = 2000;

type Body = { details?: { method: "iban" | "paypal"; account: string; holder: string } };

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  const { data: creature } = await db.from("creatures").select("id").eq("owner_id", user.id).maybeSingle();
  if (!creature) throw new HttpError(400, "No creature", "needs_creature");
  const { data: txs } = await db.from("transactions").select("type,creator_cents,gross_cents,status").eq("creature_id", creature.id).in("type", ["gift", "payout"]).neq("status", "failed");
  let earned = 0;
  let paid = 0;
  for (const t of txs ?? []) {
    if (t.type === "gift") earned += t.creator_cents;
    if (t.type === "payout") paid += t.gross_cents;
  }
  const balance = earned - paid;
  if (balance < MIN_PAYOUT_CENTS) throw new HttpError(400, "Minimum payout is €20.00", "below_minimum");
  if (body.details) await db.from("profiles").update({ payout_details: { ...body.details, account: body.details.account.slice(0, 64) } }).eq("id", user.id);
  await ledger(db, { type: "payout", user_id: user.id, creature_id: creature.id, gross_cents: balance, status: "pending", meta: { requested_at: new Date().toISOString() } });
  return json({ requested_cents: balance });
});
