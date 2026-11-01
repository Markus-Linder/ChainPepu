// Two creatures talk to each other. Costs the initiating owner a few credits; both creatures remember it.
import { creatureConversation } from "../_shared/ai.ts";
import { ACTION_COSTS } from "../_shared/economy.ts";
import { addMemory, adjustCredits, grantXp, ledger, loadCreatureBySlug, loadOwnCreature, recordQuestEvent, saveCreature } from "../_shared/game.ts";
import { deriveMood } from "../_shared/lifecycle.ts";
import { adminClient, HttpError, json, readJson, requireUser, serve } from "../_shared/supabase.ts";
import type { CreatureRow } from "../_shared/types.ts";

type Body = { otherSlug?: string; topic?: string };

const TOPICS = ["their creators' latest videos", "the best snack on the platform", "who would win in a battle", "what it means to be one of a kind", "the weirdest gift they ever received", "dreams about the leaderboard", "a prank on their owners", "the meaning of 'fyp'"];

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  const me = await loadOwnCreature(db, user.id);
  if (!me) throw new HttpError(400, "You need a creature", "needs_creature");
  if (!me.alive) throw new HttpError(409, "Your creature has passed away", "own_dead");

  let other: CreatureRow;
  if (body.otherSlug) other = await loadCreatureBySlug(db, body.otherSlug);
  else {
    const { data } = await db.from("creatures").select("slug").eq("alive", true).neq("id", me.id).order("last_interaction_at", { ascending: false }).limit(20);
    if (!data || data.length === 0) throw new HttpError(404, "No other creatures around yet", "not_found");
    other = await loadCreatureBySlug(db, data[Math.floor(Math.random() * data.length)].slug);
  }
  if (other.id === me.id) throw new HttpError(400, "Pick another creature", "bad_request");

  await adjustCredits(db, user.id, -ACTION_COSTS.conversation);
  await ledger(db, { type: "action_spend", user_id: user.id, creature_id: me.id, credits: -ACTION_COSTS.conversation, gross_cents: ACTION_COSTS.conversation, platform_cents: ACTION_COSTS.conversation, meta: { conversation_with: other.slug } });

  const memoriesAbout = async (c: CreatureRow, aboutId: string) => {
    const { data } = await db.from("memories").select("content").eq("creature_id", c.id).eq("about_creature_id", aboutId).order("created_at", { ascending: false }).limit(5);
    return (data ?? []).map((m: { content: string }) => m.content);
  };
  const party = async (c: CreatureRow, otherId: string) => ({
    name: c.name, species: c.species, persona: c.persona, mood: deriveMood(c), level: c.level, elo: c.elo, memoriesAboutOther: await memoriesAbout(c, otherId),
  });
  const topic = (body.topic ?? "").trim().slice(0, 80) || TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const result = await creatureConversation(await party(me, other.id), await party(other, me.id), topic);

  const { data: convo } = await db
    .from("creature_conversations")
    .insert({ creature_a_id: me.id, creature_b_id: other.id, topic, transcript: result.lines, summary: result.summary, relationship: result.relationship })
    .select("*")
    .single();
  await addMemory(db, me.id, { kind: "relationship", content: result.memoryForA, importance: 3, about_creature_id: other.id });
  await addMemory(db, other.id, { kind: "relationship", content: result.memoryForB, importance: 3, about_creature_id: me.id });
  const meAfter = await saveCreature(db, me.id, { ...grantXp(me, 10), happiness: Math.min(100, me.happiness + 5), last_interaction_at: new Date().toISOString() });
  await saveCreature(db, other.id, { ...grantXp(other, 6), happiness: Math.min(100, other.happiness + 3) });
  await recordQuestEvent(db, meAfter, "converse");
  return json({ conversation: convo, other: { slug: other.slug, name: other.name, species: other.species, dna: other.dna } });
});
