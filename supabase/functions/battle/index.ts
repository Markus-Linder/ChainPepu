// Creature vs. creature battle. Deterministic simulation, Elo, stakes, real health damage.
import { simulateBattle, type Combatant } from "../_shared/battle.ts";
import { ACTION_COSTS } from "../_shared/economy.ts";
import { addMemory, adjustCredits, grantXp, ledger, loadCreatureBySlug, loadOwnCreature, publicCreature, recordQuestEvent, saveCreature } from "../_shared/game.ts";
import { clamp } from "../_shared/lifecycle.ts";
import { adminClient, HttpError, json, readJson, requireUser, serve } from "../_shared/supabase.ts";
import type { CreatureRow } from "../_shared/types.ts";

type Body = { defenderSlug: string; stake?: number };

const COOLDOWN_MS = 15 * 60_000;

function toCombatant(c: CreatureRow): Combatant {
  return { id: c.id, name: c.name, level: c.level, health: c.health, happiness: c.happiness, energy: c.energy, dna: c.dna, boost: c.battle_boost ?? 0, elo: c.elo };
}

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  const me = await loadOwnCreature(db, user.id);
  if (!me) throw new HttpError(400, "You need a creature to battle", "needs_creature");
  if (!me.alive) throw new HttpError(409, "Your creature must be alive to fight", "own_dead");
  if (me.sleeping) throw new HttpError(409, "Your creature is sleeping", "sleeping");
  const other = await loadCreatureBySlug(db, body.defenderSlug);
  if (other.id === me.id) throw new HttpError(400, "You can't fight yourself", "bad_request");
  if (!other.alive) throw new HttpError(409, "That creature can't fight right now", "target_dead");
  if (!other.accepts_battles) throw new HttpError(409, "That creature is not accepting challenges", "no_battles");
  const last = me.last_battle_at ? new Date(me.last_battle_at).getTime() : 0;
  if (Date.now() - last < COOLDOWN_MS) {
    throw new HttpError(429, `Cooldown: ${Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60_000)} min`, "cooldown");
  }
  const stake = Math.floor(body.stake ?? 0);
  if (stake !== 0 && (stake < ACTION_COSTS.battleStakeMin || stake > ACTION_COSTS.battleStakeMax)) throw new HttpError(400, "Invalid stake", "bad_request");

  // Stake: challenger risks credits; if they win, the platform pays out 1.8x (house keeps 10%). Defender never loses credits.
  if (stake > 0) {
    await adjustCredits(db, user.id, -stake);
    await ledger(db, { type: "battle_stake", user_id: user.id, creature_id: me.id, credits: -stake, gross_cents: stake, platform_cents: stake, meta: { defender: other.slug } });
  }

  const result = simulateBattle(toCombatant(me), toCombatant(other), `${Date.now()}`);
  const iWon = result.winnerId === me.id;

  const now = new Date().toISOString();
  const mePatch = {
    ...grantXp(me, result.xp[me.id]),
    health: clamp(me.health - result.healthDamage[me.id]),
    happiness: clamp(me.happiness + (iWon ? 10 : -8)),
    energy: clamp(me.energy - 10),
    elo: me.elo + result.eloDelta[me.id],
    wins: me.wins + (iWon ? 1 : 0),
    losses: me.losses + (iWon ? 0 : 1),
    battle_boost: 0,
    last_battle_at: now,
    last_interaction_at: now,
  };
  const otherPatch = {
    ...grantXp(other, result.xp[other.id]),
    health: clamp(other.health - result.healthDamage[other.id]),
    happiness: clamp(other.happiness + (iWon ? -8 : 10)),
    elo: other.elo + result.eloDelta[other.id],
    wins: other.wins + (iWon ? 0 : 1),
    losses: other.losses + (iWon ? 1 : 0),
    battle_boost: 0,
  };
  // A battle can be fatal if health hits zero.
  const meAfter = await saveCreature(db, me.id, { ...mePatch, alive: mePatch.health > 0, died_at: mePatch.health > 0 ? null : now });
  const otherAfter = await saveCreature(db, other.id, { ...otherPatch, alive: otherPatch.health > 0, died_at: otherPatch.health > 0 ? null : now });

  const { data: battle } = await db
    .from("battles")
    .insert({
      challenger_id: me.id,
      defender_id: other.id,
      winner_id: result.winnerId,
      stake_credits: stake,
      log: { ...result, challengerName: me.name, defenderName: other.name },
      challenger_elo_delta: result.eloDelta[me.id],
      defender_elo_delta: result.eloDelta[other.id],
    })
    .select("*")
    .single();

  let payout = 0;
  if (iWon && stake > 0) {
    payout = Math.floor(stake * 1.8);
    await adjustCredits(db, user.id, payout);
    await ledger(db, { type: "battle_reward", user_id: user.id, creature_id: me.id, credits: payout, meta: { battle: battle?.id } });
  }
  if (iWon) await recordQuestEvent(db, meAfter, "battle_win");
  else await recordQuestEvent(db, otherAfter, "battle_win");

  await addMemory(db, me.id, { kind: "episodic", content: `I ${iWon ? "defeated" : "lost to"} ${other.name} the ${other.species} in a battle${stake ? ` with ${stake} credits at stake` : ""}.`, importance: 3, about_creature_id: other.id });
  await addMemory(db, other.id, { kind: "episodic", content: `${me.name} the ${me.species} challenged me and ${iWon ? "won. I want a rematch." : "lost. Sweet victory."}`, importance: 3, about_creature_id: me.id });

  return json({ battle, me: publicCreature(meAfter), other: publicCreature(otherAfter), payout });
});
