// Owner actions: free play, sleep/wake, use inventory items, buy items for own creature.
import { findItem } from "../_shared/catalog.ts";
import { adjustCredits, applyEffects, ledger, loadCreatureBySlug, recordQuestEvent, saveCreature, publicCreature } from "../_shared/game.ts";
import { clamp } from "../_shared/lifecycle.ts";
import { adminClient, HttpError, json, readJson, requireUser, serve } from "../_shared/supabase.ts";

type Body = { slug: string; action: "play" | "sleep" | "wake" | "use_item" | "buy_item" | "pet"; itemSlug?: string; qty?: number };

const FREE_PLAY_COOLDOWN_MS = 10 * 60_000;

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  let c = await loadCreatureBySlug(db, body.slug);
  const isOwner = c.owner_id === user.id;

  switch (body.action) {
    case "pet": {
      // Anyone may pet once in a while: tiny mood boost, no cost.
      if (!c.alive) throw new HttpError(409, "This creature has passed away", "creature_dead");
      c = await saveCreature(db, c.id, { happiness: clamp(c.happiness + 1), last_interaction_at: new Date().toISOString() });
      return json({ creature: publicCreature(c) });
    }
    case "play": {
      if (!isOwner) throw new HttpError(403, "Only the owner can do that", "forbidden");
      if (!c.alive) throw new HttpError(409, "This creature has passed away", "creature_dead");
      if (c.sleeping) throw new HttpError(409, "Your creature is sleeping", "sleeping");
      const last = c.last_free_play_at ? new Date(c.last_free_play_at).getTime() : 0;
      if (Date.now() - last < FREE_PLAY_COOLDOWN_MS) throw new HttpError(429, "Play again in a few minutes", "cooldown");
      const { patch } = applyEffects(c, { happiness: 8, energy: -4, xp: 3 });
      c = await saveCreature(db, c.id, { ...patch, last_free_play_at: new Date().toISOString() });
      const completed = await recordQuestEvent(db, c, "play");
      return json({ creature: publicCreature(c), completedQuests: completed });
    }
    case "sleep":
    case "wake": {
      if (!isOwner) throw new HttpError(403, "Only the owner can do that", "forbidden");
      if (!c.alive) throw new HttpError(409, "This creature has passed away", "creature_dead");
      c = await saveCreature(db, c.id, { sleeping: body.action === "sleep", last_interaction_at: new Date().toISOString() });
      return json({ creature: publicCreature(c) });
    }
    case "buy_item": {
      if (!isOwner) throw new HttpError(403, "Only the owner can do that", "forbidden");
      const item = findItem(body.itemSlug ?? "");
      if (!item || !item.stockable) throw new HttpError(400, "Unknown item", "bad_request");
      const qty = Math.max(1, Math.min(20, Math.floor(body.qty ?? 1)));
      const cost = item.priceCredits * qty;
      await adjustCredits(db, user.id, -cost);
      await ledger(db, { type: "action_spend", user_id: user.id, creature_id: c.id, credits: -cost, gross_cents: cost, platform_cents: cost, meta: { item: item.slug, qty } });
      const { data: inv } = await db.from("inventory").select("qty").eq("creature_id", c.id).eq("item_slug", item.slug).maybeSingle();
      await db.from("inventory").upsert({ creature_id: c.id, item_slug: item.slug, qty: (inv?.qty ?? 0) + qty });
      const { data: inventory } = await db.from("inventory").select("*").eq("creature_id", c.id);
      return json({ inventory, creature: publicCreature(c) });
    }
    case "use_item": {
      if (!isOwner) throw new HttpError(403, "Only the owner can do that", "forbidden");
      const item = findItem(body.itemSlug ?? "");
      if (!item) throw new HttpError(400, "Unknown item", "bad_request");
      const { data: inv } = await db.from("inventory").select("qty").eq("creature_id", c.id).eq("item_slug", item.slug).maybeSingle();
      if (!inv || inv.qty < 1) throw new HttpError(409, "You don't have that item", "no_item");
      const { patch, leveledUp } = applyEffects(c, item.effects);
      await db.from("inventory").update({ qty: inv.qty - 1 }).eq("creature_id", c.id).eq("item_slug", item.slug);
      c = await saveCreature(db, c.id, patch);
      const eventType = item.category === "food" ? "feed" : item.category === "toy" ? "play" : item.category === "care" ? "clean" : null;
      const completed = eventType ? await recordQuestEvent(db, c, eventType) : [];
      if (item.effects.revive) await ledger(db, { type: "revive", user_id: user.id, creature_id: c.id, meta: { item: item.slug } });
      const { data: inventory } = await db.from("inventory").select("*").eq("creature_id", c.id);
      return json({ creature: publicCreature(c), inventory, leveledUp, completedQuests: completed });
    }
    default:
      throw new HttpError(400, "Unknown action", "bad_request");
  }
});
