// Game-state helpers shared by edge functions. All writes go through the service-role client.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import type { ItemEffects } from "./catalog.ts";
import { clamp, deriveMood, levelForXp } from "./lifecycle.ts";
import { pickDailyQuests } from "./quests.ts";
import { HttpError, dayKey } from "./supabase.ts";
import type { CreatureRow, ProfileRow } from "./types.ts";
import type { MemoryInput } from "./ai.ts";

export async function loadCreatureBySlug(db: SupabaseClient, slug: string): Promise<CreatureRow> {
  const { data, error } = await db.rpc("get_creature", { p_slug: slug });
  if (error) throw new HttpError(500, error.message);
  const row = (Array.isArray(data) ? data[0] : data) as CreatureRow | null;
  if (!row || !row.id) throw new HttpError(404, "Creature not found", "not_found");
  return row;
}

export async function loadCreatureById(db: SupabaseClient, id: string): Promise<CreatureRow> {
  const { data, error } = await db.rpc("tick_creature", { p_creature_id: id });
  if (error) throw new HttpError(500, error.message);
  const row = (Array.isArray(data) ? data[0] : data) as CreatureRow | null;
  if (!row || !row.id) throw new HttpError(404, "Creature not found", "not_found");
  return row;
}

export async function loadOwnCreature(db: SupabaseClient, userId: string): Promise<CreatureRow | null> {
  const { data } = await db.from("creatures").select("id").eq("owner_id", userId).maybeSingle();
  if (!data) return null;
  return loadCreatureById(db, data.id);
}

export async function getProfile(db: SupabaseClient, userId: string): Promise<ProfileRow> {
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new HttpError(404, "Profile not found", "not_found");
  return data as ProfileRow;
}

export async function adjustCredits(db: SupabaseClient, userId: string, delta: number): Promise<number> {
  const { data, error } = await db.rpc("adjust_credits", { p_user_id: userId, p_delta: delta });
  if (error) {
    if (error.message.includes("insufficient_credits")) throw new HttpError(402, "Not enough credits", "insufficient_credits");
    throw new HttpError(500, error.message);
  }
  return data as number;
}

export type CreaturePatch = Partial<Pick<CreatureRow, "satiety" | "energy" | "happiness" | "hygiene" | "health" | "alive" | "sleeping" | "xp" | "level" | "died_at" | "battle_boost" | "cosmetics" | "last_interaction_at" | "last_free_play_at" | "persona" | "lifetime_gross_cents" | "elo" | "wins" | "losses" | "last_battle_at">>;

/** Compute the state change of applying an item to a creature. */
export function applyEffects(c: CreatureRow, fx: ItemEffects): { patch: CreaturePatch; leveledUp: boolean } {
  if (!c.alive && !fx.revive) throw new HttpError(409, "This creature has passed away", "creature_dead");
  const patch: CreaturePatch = { last_interaction_at: new Date().toISOString() };
  if (fx.revive && !c.alive) {
    patch.alive = true;
    patch.died_at = null;
    patch.sleeping = false;
    patch.satiety = fx.satiety ?? 50;
    patch.energy = fx.energy ?? 50;
    patch.happiness = fx.happiness ?? 50;
    patch.hygiene = fx.hygiene ?? 50;
    patch.health = fx.health ?? 50;
  } else {
    if (fx.satiety) patch.satiety = clamp(c.satiety + fx.satiety);
    if (fx.energy) patch.energy = clamp(c.energy + fx.energy);
    if (fx.happiness) patch.happiness = clamp(c.happiness + fx.happiness);
    if (fx.hygiene) patch.hygiene = clamp(c.hygiene + fx.hygiene);
    if (fx.health) patch.health = clamp(c.health + fx.health);
    if (fx.energy && fx.energy > 0 && c.sleeping) patch.sleeping = false;
  }
  if (fx.battleBoost) patch.battle_boost = Math.max(c.battle_boost, fx.battleBoost);
  if (fx.cosmetic && !c.cosmetics.includes(fx.cosmetic)) patch.cosmetics = [...c.cosmetics, fx.cosmetic];
  let leveledUp = false;
  if (fx.xp) {
    const xp = c.xp + fx.xp;
    const level = levelForXp(xp);
    leveledUp = level > c.level;
    patch.xp = xp;
    patch.level = level;
  }
  return { patch, leveledUp };
}

export function grantXp(c: CreatureRow, amount: number): CreaturePatch {
  const xp = (c.xp ?? 0) + amount;
  return { xp, level: levelForXp(xp) };
}

export async function saveCreature(db: SupabaseClient, id: string, patch: CreaturePatch): Promise<CreatureRow> {
  const { data, error } = await db.from("creatures").update(patch).eq("id", id).select("*").single();
  if (error) throw new HttpError(500, error.message);
  return data as CreatureRow;
}

export async function addMemory(db: SupabaseClient, creatureId: string, m: MemoryInput & { about_user_id?: string; about_creature_id?: string }) {
  await db.from("memories").insert({
    creature_id: creatureId,
    kind: m.kind,
    content: m.content.slice(0, 400),
    importance: m.importance,
    about_user_id: m.about_user_id ?? null,
    about_creature_id: m.about_creature_id ?? null,
  });
  // Keep memory bounded: drop the least important, oldest memories beyond 120.
  const { data } = await db.from("memories").select("id").eq("creature_id", creatureId).order("importance", { ascending: false }).order("created_at", { ascending: false }).range(120, 200);
  if (data && data.length) await db.from("memories").delete().in("id", data.map((r: { id: string }) => r.id));
}

export async function ledger(db: SupabaseClient, tx: {
  type: string; user_id?: string | null; creature_id?: string | null; credits?: number; gross_cents?: number; creator_cents?: number; platform_cents?: number;
  status?: "completed" | "pending" | "failed"; stripe_ref?: string | null; meta?: Record<string, unknown>;
}) {
  const { error } = await db.from("transactions").insert({
    type: tx.type,
    user_id: tx.user_id ?? null,
    creature_id: tx.creature_id ?? null,
    credits: tx.credits ?? 0,
    gross_cents: tx.gross_cents ?? 0,
    creator_cents: tx.creator_cents ?? 0,
    platform_cents: tx.platform_cents ?? 0,
    status: tx.status ?? "completed",
    stripe_ref: tx.stripe_ref ?? null,
    meta: tx.meta ?? null,
  });
  if (error) throw new HttpError(500, error.message);
}

/** Make sure today's quests exist for a creature. */
export async function ensureDailyQuests(db: SupabaseClient, creatureId: string) {
  const day = dayKey();
  const { count } = await db.from("quests").select("id", { count: "exact", head: true }).eq("creature_id", creatureId).eq("day_key", day);
  if ((count ?? 0) > 0) return;
  const templates = pickDailyQuests(creatureId, day);
  const expires = new Date();
  expires.setUTCHours(23, 59, 59, 999);
  await db.from("quests").upsert(
    templates.map((t) => ({
      creature_id: creatureId,
      audience: t.audience,
      template_key: t.key,
      event_type: t.eventType,
      goal: t.goal,
      reward_credits: t.rewardCredits,
      reward_xp: t.rewardXp,
      day_key: day,
      expires_at: expires.toISOString(),
    })),
    { onConflict: "creature_id,day_key,template_key,audience", ignoreDuplicates: true },
  );
}

/** Advance quests for an event; pays out rewards when a quest completes. Returns completed quest keys. */
export async function recordQuestEvent(db: SupabaseClient, creature: CreatureRow, eventType: string, amount = 1): Promise<string[]> {
  await ensureDailyQuests(db, creature.id);
  const { data: open } = await db.from("quests").select("*").eq("creature_id", creature.id).eq("event_type", eventType).is("completed_at", null).gt("expires_at", new Date().toISOString());
  const completed: string[] = [];
  let xpTotal = 0;
  let creditsTotal = 0;
  for (const q of open ?? []) {
    const progress = Math.min(q.goal, q.progress + amount);
    const done = progress >= q.goal;
    await db.from("quests").update({ progress, completed_at: done ? new Date().toISOString() : null }).eq("id", q.id);
    if (done) {
      completed.push(q.template_key);
      xpTotal += q.reward_xp;
      creditsTotal += q.reward_credits;
    }
  }
  if (xpTotal > 0) await saveCreature(db, creature.id, grantXp({ ...creature, xp: creature.xp }, xpTotal));
  if (creditsTotal > 0) {
    await adjustCredits(db, creature.owner_id, creditsTotal);
    await ledger(db, { type: "quest_reward", user_id: creature.owner_id, creature_id: creature.id, credits: creditsTotal, meta: { quests: completed } });
  }
  return completed;
}

export function publicCreature(c: CreatureRow) {
  return { ...c, mood: deriveMood(c) };
}

export const ageDays = (c: CreatureRow) => (Date.now() - new Date(c.born_at).getTime()) / 86_400_000;
