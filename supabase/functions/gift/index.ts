// Visitors gift items to a creature. Credits are deducted, effects applied, revenue split 80/20.
import { findItem } from "../_shared/catalog.ts";
import { splitGift } from "../_shared/economy.ts";
import { addMemory, adjustCredits, applyEffects, getProfile, ledger, loadCreatureBySlug, publicCreature, recordQuestEvent, saveCreature } from "../_shared/game.ts";
import { adminClient, HttpError, json, readJson, requireUser, serve } from "../_shared/supabase.ts";

type Body = { slug: string; itemSlug: string; message?: string };

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  const item = findItem(body.itemSlug);
  if (!item) throw new HttpError(400, "Unknown item", "bad_request");
  let c = await loadCreatureBySlug(db, body.slug);
  if (!c.alive && !item.effects.revive) throw new HttpError(409, "This creature has passed away. Send a Phoenix Feather to revive it.", "creature_dead");
  const sender = await getProfile(db, user.id);
  const isOwner = c.owner_id === user.id;

  await adjustCredits(db, user.id, -item.priceCredits);
  // Owners gifting themselves don't earn revenue (prevents wash trading); platform keeps 100%.
  const split = isOwner
    ? { grossCents: item.priceCredits, creatorCents: 0, platformCents: item.priceCredits }
    : splitGift(item.priceCredits);
  await ledger(db, {
    type: "gift",
    user_id: user.id,
    creature_id: c.id,
    credits: -item.priceCredits,
    gross_cents: split.grossCents,
    creator_cents: split.creatorCents,
    platform_cents: split.platformCents,
    meta: { item: item.slug, sender_handle: sender.handle, self: isOwner },
  });
  const message = (body.message ?? "").trim().slice(0, 140) || null;
  const { data: gift } = await db
    .from("gifts")
    .insert({ creature_id: c.id, item_slug: item.slug, sender_id: user.id, sender_name: sender.display_name, price_credits: item.priceCredits, message })
    .select("*")
    .single();

  const { patch, leveledUp } = applyEffects(c, item.effects);
  c = await saveCreature(db, c.id, { ...patch, lifetime_gross_cents: c.lifetime_gross_cents + split.grossCents });

  const events: string[] = ["gift"];
  if (item.category === "food") events.push("feed");
  if (item.category === "toy") events.push("play");
  if (item.category === "care") events.push("clean");
  const completed: string[] = [];
  for (const e of events) completed.push(...(await recordQuestEvent(db, c, e)));

  if (item.priceCredits >= 90 || item.rarity !== "common") {
    await addMemory(db, c.id, {
      kind: "relationship",
      content: `${sender.display_name} gave me a ${item.slug}${message ? ` and said "${message}"` : ""}. ${item.rarity === "legendary" ? "I will never forget this." : "Generous!"}`,
      importance: item.rarity === "legendary" ? 5 : item.rarity === "epic" ? 4 : 3,
      about_user_id: user.id,
    });
  }
  return json({ creature: publicCreature(c), gift, leveledUp, completedQuests: completed, split });
});
