// Scheduled maintenance: apply decay to every creature, roll daily quests, let random creatures chat.
// Schedule with pg_cron + pg_net (see README) or an external cron hitting this URL with the CRON_SECRET header.
import { creatureConversation } from "../_shared/ai.ts";
import { addMemory, ensureDailyQuests } from "../_shared/game.ts";
import { deriveMood } from "../_shared/lifecycle.ts";
import { adminClient, HttpError, json, optionalEnv, serve } from "../_shared/supabase.ts";
import type { CreatureRow } from "../_shared/types.ts";

serve(async (req) => {
  const secret = optionalEnv("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) throw new HttpError(401, "Unauthorized", "unauthorized");
  const db = adminClient();
  const { data: ticked, error } = await db.rpc("tick_all_creatures");
  if (error) throw new HttpError(500, error.message);

  const { data: alive } = await db.from("creatures").select("*").eq("alive", true);
  const creatures = (alive ?? []) as CreatureRow[];
  for (const c of creatures) await ensureDailyQuests(db, c.id);

  // Ambient social life: a couple of random conversations per run, if there are enough creatures.
  let conversations = 0;
  if (creatures.length >= 2 && optionalEnv("AMBIENT_CONVERSATIONS") !== "false") {
    const shuffled = [...creatures].sort(() => Math.random() - 0.5);
    for (let i = 0; i + 1 < shuffled.length && conversations < 2; i += 2) {
      const [a, b] = [shuffled[i], shuffled[i + 1]];
      const party = (c: CreatureRow) => ({ name: c.name, species: c.species, persona: c.persona, mood: deriveMood(c), level: c.level, elo: c.elo, memoriesAboutOther: [] as string[] });
      const topic = ["today's mood", "their owners", "the leaderboard"][conversations % 3];
      const r = await creatureConversation(party(a), party(b), topic);
      await db.from("creature_conversations").insert({ creature_a_id: a.id, creature_b_id: b.id, topic, transcript: r.lines, summary: r.summary, relationship: r.relationship });
      await addMemory(db, a.id, { kind: "relationship", content: r.memoryForA, importance: 2, about_creature_id: b.id });
      await addMemory(db, b.id, { kind: "relationship", content: r.memoryForB, importance: 2, about_creature_id: a.id });
      conversations++;
    }
  }
  return json({ ticked, quests: creatures.length, conversations });
});
