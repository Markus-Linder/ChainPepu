// Genesis: create a creator's unique creature from TikTok content, a text prompt or a photo.
import { analyzePhoto, analyzePrompt, generatePersona } from "../_shared/ai.ts";
import { generateDna, profileFromPrompt, speciesName, type ContentProfile, type DnaOverrides } from "../_shared/dna.ts";
import { ensureDailyQuests, getProfile, ledger } from "../_shared/game.ts";
import { CREATOR_PLAN } from "../_shared/economy.ts";
import { adminClient, HttpError, json, optionalEnv, readJson, requireUser, serve } from "../_shared/supabase.ts";
import { analyzeContent, fetchUser, fetchVideos, SANDBOX_PROFILES } from "../_shared/tiktok.ts";

type Body = {
  name: string;
  source: "tiktok" | "prompt" | "photo" | "sandbox";
  prompt?: string;
  sandboxProfile?: string;
  /** Storage path inside the `genesis-uploads` bucket (photo genesis). */
  photoPath?: string;
  locale?: string;
};

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "creature";

serve(async (req) => {
  const user = await requireUser(req);
  const body = await readJson<Body>(req);
  const db = adminClient();
  const profile = await getProfile(db, user.id);
  const name = (body.name ?? "").trim().slice(0, 24);
  if (name.length < 2) throw new HttpError(400, "Name must be 2-24 characters", "invalid_name");

  const { data: existing } = await db.from("creatures").select("slug").eq("owner_id", user.id).maybeSingle();
  if (existing) throw new HttpError(409, "You already have a creature", "already_exists");

  // Subscription gate (sandbox: ALLOW_FREE_HATCH=true lets anyone hatch for demos).
  const active = ["active", "trialing"].includes(profile.subscription_status) ||
    (profile.subscription_status === "canceled" && profile.subscription_ends_at && new Date(profile.subscription_ends_at) > new Date());
  if (!active && optionalEnv("ALLOW_FREE_HATCH") !== "true") throw new HttpError(402, "Creator subscription required", "subscription_required");

  const locale = body.locale ?? profile.locale ?? "en";
  let content: ContentProfile;
  let overrides: DnaOverrides = {};

  if (body.source === "tiktok") {
    const { data: conn } = await db.from("tiktok_connections").select("*").eq("user_id", user.id).maybeSingle();
    if (!conn) throw new HttpError(400, "Connect your TikTok account first", "tiktok_not_connected");
    const [ttUser, videos] = await Promise.all([fetchUser(conn.access_token), fetchVideos(conn.access_token, 40)]);
    content = analyzeContent(ttUser, videos, locale);
    content.source = "tiktok";
  } else if (body.source === "sandbox") {
    const sb = SANDBOX_PROFILES[body.sandboxProfile ?? ""] ?? SANDBOX_PROFILES.fitmax;
    content = analyzeContent(sb.user, sb.videos, locale);
    content.source = "sandbox";
    content.handle = profile.handle;
  } else if (body.source === "prompt") {
    const prompt = (body.prompt ?? "").trim();
    if (prompt.length < 8) throw new HttpError(400, "Describe your creature in at least 8 characters", "invalid_prompt");
    const analysis = await analyzePrompt(prompt);
    content = profileFromPrompt(profile.handle, profile.display_name, prompt, locale);
    if (analysis.categories.length) content.categories = analysis.categories;
    if (analysis.keywords.length) content.keywords = analysis.keywords;
    content.bio = analysis.description;
    overrides = analysis.overrides;
  } else if (body.source === "photo") {
    if (!body.photoPath || !body.photoPath.startsWith(`${user.id}/`)) throw new HttpError(400, "Upload a photo first", "invalid_photo");
    const { data: file, error } = await db.storage.from("genesis-uploads").download(body.photoPath);
    if (error || !file) throw new HttpError(400, "Photo not found", "invalid_photo");
    const mime = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const analysis = await analyzePhoto(btoa(bin), mime, body.prompt ?? "");
    content = profileFromPrompt(profile.handle, profile.display_name, analysis.description || body.prompt || "photo", locale);
    content.source = "photo";
    content.prompt = `${analysis.description} ${body.photoPath}`;
    if (analysis.categories.length) content.categories = analysis.categories;
    if (analysis.keywords.length) content.keywords = analysis.keywords;
    overrides = analysis.overrides;
    // Photo is only needed for analysis; remove it to minimise stored personal data.
    await db.storage.from("genesis-uploads").remove([body.photoPath]);
  } else {
    throw new HttpError(400, "Unknown genesis source", "bad_request");
  }

  // Guarantee global uniqueness of the genome.
  let dna = generateDna(content, 0, overrides);
  for (let nonce = 1; nonce < 50; nonce++) {
    const { data: clash } = await db.from("creatures").select("id").eq("dna_hash", dna.seed).maybeSingle();
    if (!clash) break;
    dna = generateDna(content, nonce, overrides);
  }
  const species = speciesName(dna);
  const persona = await generatePersona(content, dna, species);

  let slug = slugify(profile.handle || name);
  for (let i = 0; i < 20; i++) {
    const { data: taken } = await db.from("creatures").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${slugify(profile.handle || name)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: creature, error } = await db
    .from("creatures")
    .insert({ owner_id: user.id, slug, name, species, genesis_source: content.source, dna, dna_hash: dna.seed, persona, content_profile: content })
    .select("*")
    .single();
  if (error) throw new HttpError(500, error.message);

  await db.from("profiles").update({ role: profile.role === "admin" ? "admin" : "creator" }).eq("id", user.id);
  // Starter kit
  await db.from("inventory").upsert([
    { creature_id: creature.id, item_slug: "berry", qty: 5 },
    { creature_id: creature.id, item_slug: "soap", qty: 2 },
    { creature_id: creature.id, item_slug: "ball", qty: 2 },
  ]);
  await db.from("memories").insert([
    { creature_id: creature.id, kind: "episodic", content: `I was born on ${new Date().toDateString()} from ${content.source === "prompt" ? "a wish" : content.source === "photo" ? "a photo" : `@${content.handle}'s content`}. My creator named me ${name}.`, importance: 5, about_user_id: user.id },
    { creature_id: creature.id, kind: "relationship", content: `${profile.display_name} (@${profile.handle}) is my creator. I trust them completely.`, importance: 5, about_user_id: user.id },
  ]);
  await ensureDailyQuests(db, creature.id);
  if (profile.credits === 0 && optionalEnv("ALLOW_FREE_HATCH") === "true") {
    await db.rpc("adjust_credits", { p_user_id: user.id, p_delta: CREATOR_PLAN.includedCredits });
    await ledger(db, { type: "bonus", user_id: user.id, credits: CREATOR_PLAN.includedCredits, meta: { reason: "sandbox_welcome" } });
  }
  return json({ creature });
});
