// Chat with a creature. The creature remembers and learns.
import { chatReply } from "../_shared/ai.ts";
import { addMemory, ageDays, getProfile, loadCreatureBySlug, publicCreature, recordQuestEvent, saveCreature } from "../_shared/game.ts";
import { clamp, deriveMood } from "../_shared/lifecycle.ts";
import type { Persona } from "../_shared/persona.ts";
import { adminClient, HttpError, json, readJson, requireUser, serve } from "../_shared/supabase.ts";

type Body = { slug: string; message: string; locale?: string };

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const message = (body.message ?? "").trim().slice(0, 500);
  if (message.length < 1) throw new HttpError(400, "Empty message", "bad_request");
  const db = adminClient();
  let c = await loadCreatureBySlug(db, body.slug);
  const profile = await getProfile(db, user.id);

  // Rate limit: 20 messages / 10 min per user per creature
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("chat_messages").select("id", { count: "exact", head: true }).eq("creature_id", c.id).eq("user_id", user.id).gt("created_at", since);
  if ((count ?? 0) >= 20) throw new HttpError(429, "Slow down a little", "rate_limited");

  const [{ data: memories }, { data: history }] = await Promise.all([
    db.from("memories").select("kind,content,about_user_id,importance").eq("creature_id", c.id).order("importance", { ascending: false }).order("created_at", { ascending: false }).limit(40),
    db.from("chat_messages").select("role,user_name,content,user_id").eq("creature_id", c.id).order("created_at", { ascending: false }).limit(16),
  ]);
  const relevantMemories = (memories ?? [])
    .sort((a: { about_user_id: string | null }, b: { about_user_id: string | null }) => Number(b.about_user_id === user.id) - Number(a.about_user_id === user.id))
    .slice(0, 20);

  await db.from("chat_messages").insert({ creature_id: c.id, user_id: user.id, user_name: profile.display_name, role: "user", content: message });

  const result = await chatReply(
    {
      creatureName: c.name,
      species: c.species,
      persona: c.persona,
      mood: deriveMood(c),
      vitals: { satiety: c.satiety, energy: c.energy, happiness: c.happiness, hygiene: c.hygiene, health: c.health },
      level: c.level,
      ageDays: ageDays(c),
      memories: relevantMemories,
      history: (history ?? []).reverse().map((h: { role: string; user_name: string | null; content: string }) => ({ role: h.role === "creature" ? "creature" as const : "user" as const, name: h.user_name ?? undefined, content: h.content })),
      visitorName: profile.display_name,
      visitorIsOwner: c.owner_id === user.id,
      visitorLanguage: body.locale ?? profile.locale ?? "en",
      ownerHandle: c.content_profile?.handle ?? "creator",
    },
    message,
  );

  const { data: replyRow } = await db.from("chat_messages").insert({ creature_id: c.id, user_id: null, user_name: c.name, role: "creature", content: result.reply }).select("*").single();
  for (const m of result.newMemories) await addMemory(db, c.id, { ...m, about_user_id: user.id });

  // Learning: nudge traits a little, mood shifts, small xp.
  const traits = { ...c.persona.traits } as Persona["traits"];
  for (const [k, v] of Object.entries(result.traitNudges)) {
    if (k in traits && typeof v === "number") traits[k as keyof Persona["traits"]] = Math.round(clamp(traits[k as keyof Persona["traits"]] + v, 5, 95));
  }
  c = await saveCreature(db, c.id, {
    happiness: c.alive ? clamp(c.happiness + result.happinessDelta) : c.happiness,
    xp: c.xp + 1,
    persona: { ...c.persona, traits },
    last_interaction_at: new Date().toISOString(),
  });
  const completed = await recordQuestEvent(db, c, "chat");
  return json({ reply: replyRow, creature: publicCreature(c), completedQuests: completed });
});
