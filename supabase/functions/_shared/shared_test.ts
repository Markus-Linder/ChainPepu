import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { generateDna, hashContentProfile, parsePromptOverrides, speciesName, type ContentProfile } from "./dna.ts";
import { simulateBattle } from "./battle.ts";
import { careScore, deriveMood, levelForXp, tick } from "./lifecycle.ts";
import { splitGift } from "./economy.ts";
import { sha256Hex } from "./hash.ts";
import { pickDailyQuests } from "./quests.ts";

const profile: ContentProfile = {
  source: "sandbox", handle: "fitmax", displayName: "FitMax", bio: "gym", followerCount: 1000, videoCount: 5,
  topHashtags: ["#gym", "#fitness"], keywords: ["gym", "workout"], categories: ["fitness", "comedy"], avgLikes: 100, avgViews: 1000, sampleCaptions: [], language: "en",
};

Deno.test("sha256 matches a known vector", () => {
  assertEquals(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assertEquals(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

Deno.test("DNA is deterministic and unique per nonce", () => {
  const a = generateDna(profile);
  const b = generateDna(profile);
  assertEquals(a, b);
  assertNotEquals(generateDna(profile, 1).seed, a.seed);
  assertEquals(a.seed, hashContentProfile(profile));
  assert(a.stats.power >= 20 && a.stats.power <= 90);
  assert(speciesName(a).length > 3);
});

Deno.test("prompt overrides are respected", () => {
  const o = parsePromptOverrides("a tiny purple dragon with golden horns and stripes");
  assertEquals(o.body, "dragonling");
  assertEquals(o.pattern, "stripes");
  assertEquals(o.size, 0.85);
  const dna = generateDna({ ...profile, source: "prompt", prompt: "purple dragon" }, 0, o);
  assertEquals(dna.body, "dragonling");
  assertEquals(dna.primary[0], 275);
});

Deno.test("lifecycle decays, kills and derives mood", () => {
  const base = { satiety: 80, energy: 80, happiness: 70, hygiene: 80, health: 100, alive: true, sleeping: false, lastTickAt: 0, diedAt: null as number | null };
  const after12h = tick(base, 12 * 3_600_000);
  assert(after12h.satiety < 80 && after12h.alive);
  const starved = tick({ ...base, satiety: 5, hygiene: 5, happiness: 5, health: 10, lastTickAt: 0 }, 5 * 3_600_000);
  assertEquals(starved.alive, false);
  assertEquals(deriveMood(starved), "dead");
  assertEquals(deriveMood({ ...base, satiety: 10 }), "hungry");
  assertEquals(careScore(base), Math.round((80 + 80 + 70 + 80 + 200) / 6));
  assertEquals(levelForXp(0), 1);
  assertEquals(levelForXp(240), 3);
});

Deno.test("battle is deterministic and damages the loser more", () => {
  const dnaA = generateDna(profile);
  const dnaB = generateDna({ ...profile, handle: "other", categories: ["gaming"] });
  const a = { id: "a", name: "A", level: 3, health: 100, happiness: 80, energy: 90, dna: dnaA, boost: 0, elo: 1000 };
  const b = { id: "b", name: "B", level: 3, health: 100, happiness: 80, energy: 90, dna: dnaB, boost: 0, elo: 1000 };
  const r1 = simulateBattle(a, b, "seed");
  const r2 = simulateBattle(a, b, "seed");
  assertEquals(r1, r2);
  assert(r1.healthDamage[r1.loserId] > r1.healthDamage[r1.winnerId]);
  assertEquals(r1.eloDelta[r1.winnerId] + r1.eloDelta[r1.loserId], 0);
  assert(r1.turns.length > 0);
});

Deno.test("gift split is 80/20", () => {
  assertEquals(splitGift(100), { grossCents: 100, platformCents: 20, creatorCents: 80 });
  assertEquals(splitGift(5), { grossCents: 5, platformCents: 1, creatorCents: 4 });
});

Deno.test("daily quests are deterministic per creature and day", () => {
  const q1 = pickDailyQuests("c1", "2026-11-01");
  const q2 = pickDailyQuests("c1", "2026-11-01");
  assertEquals(q1, q2);
  assertEquals(q1.length, 5);
});
