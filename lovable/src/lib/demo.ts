/**
 * Demo universe. Active when no real Supabase project is configured (placeholder URL) or VITE_DEMO=1.
 * Shows a living universe with clearly fictional sample planets so the design can be judged.
 * Nothing here is real: names, numbers and texts are invented for the demo and marked as such in the UI.
 */
import type { ChainStats, DuelEvent, DuelView, InviteLeader, LinkRow, Profile, Reply, WeekLeader } from "./types";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
export const DEMO = import.meta.env.VITE_DEMO === "1" || !url || url.includes("placeholder");

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600000).toISOString();
const ahead = (h: number) => new Date(now + h * 3600000).toISOString();

const P = (i: number, username: string, display_name: string, seed: number, skin: string, level: number, extra: Partial<Profile> = {}): Profile => ({
  id: `demo-${i}`, username, display_name, planet_seed: seed, planet_skin: skin, stars: 120 + i * 7, earned_stars: 40 * i,
  is_moderator: false, is_admin: false, duel_wins: i % 3, xp: level * level * 50 + 10, level, streak_days: (i * 3) % 9, last_active_day: null,
  invited_by: i > 3 ? `demo-${(i % 3) + 1}` : null, accepted_rules_at: null, created_at: ago(24 * (30 - i)), ...extra,
});

export const DEMO_PROFILES: Profile[] = [
  P(1, "nova", "Nova", 482913, "gold", 9), P(2, "kiran", "Kiran", 77121, "neon", 7), P(3, "mila", "Mila", 913004, "standard", 6),
  P(4, "leo", "Leo", 55019, "lava", 5), P(5, "aya", "Aya", 230771, "eis", 4), P(6, "tomas", "Tomás", 660912, "standard", 3),
  P(7, "sora", "Sora", 318801, "void", 8), P(8, "jules", "Jules", 741110, "standard", 2), P(9, "nadia", "Nadia", 101993, "neon", 5),
  P(10, "ben", "Ben", 887212, "standard", 2), P(11, "yuki", "Yuki", 412002, "eis", 3), P(12, "amara", "Amara", 599331, "gold", 6),
  P(13, "diego", "Diego", 150772, "standard", 1), P(14, "lina", "Lina", 923011, "lava", 4), P(15, "omar", "Omar", 338800, "standard", 2),
  P(16, "zoe", "Zoe", 712230, "neon", 3), P(17, "finn", "Finn", 204411, "standard", 1), P(18, "hana", "Hana", 865520, "eis", 2),
];
const by = (i: number) => DEMO_PROFILES[i - 1];

const C = (id: number, title: string, origin: number, link_count: number, user_count: number, donated: number, extra: Partial<ChainStats> = {}): ChainStats => ({
  id, title, description: null, is_topic: false, ends_at: null, origin_user_id: by(origin).id, boost: 0, donated_stars: donated, daily_day: null,
  created_at: ago(24 * (id % 9) + 5), link_count, user_count, reply_count: Math.floor(link_count / 2), origin_username: by(origin).username,
  origin_display_name: by(origin).display_name, last_activity: ago(id % 7), crowns: 0, active_duel_id: null, branched_from_link: null, ...extra,
});

export const DEMO_CHAINS: ChainStats[] = [
  C(1, "Show the view from your window right now", 1, 48, 31, 620, { crowns: 2, boost: 2 }),
  C(2, "One sentence you'd tell your 15-year-old self", 2, 36, 29, 410, { crowns: 1 }),
  C(3, "Your morning coffee, no filter", 3, 27, 22, 150),
  C(4, "The last song you played on repeat", 7, 22, 19, 290, { active_duel_id: 1 }),
  C(5, "Street food from your city", 12, 19, 17, 230, { active_duel_id: 1 }),
  C(6, "Draw something in 10 seconds", 4, 15, 14, 60),
  C(7, "Pets doing absolutely nothing", 5, 31, 25, 180, { boost: 1 }),
  C(8, "Your workspace at 2 am", 9, 12, 11, 40),
  C(9, "Sunsets only", 14, 41, 33, 510, { crowns: 1 }),
  C(10, "Best thing you cooked this week", 6, 9, 8, 20),
  C(11, "Your drink, right now", 1, 57, 40, 0, { daily_day: new Date().toISOString().slice(0, 10), origin_user_id: null, origin_username: null, origin_display_name: null }),
  C(12, "7 days, 7 small wins", 1, 23, 20, 330, { is_topic: true, description: "Post one tiny win every day for a week. A finished task, a good walk, a call you finally made. Small counts.", ends_at: ahead(96) }),
  C(13, "Hometown in three photos", 12, 14, 13, 120, { is_topic: true, description: "Three photos that explain where you come from. No tourist shots.", ends_at: ahead(40) }),
  C(14, "Night rides", 7, 8, 7, 90, { is_topic: true, description: "Bikes, boards, scooters after dark. Lights on.", ends_at: ahead(150) }),
];

const COLORS = ["#7b61ff", "#ff3d9a", "#f2c46d", "#50ffb4", "#5cc8ff", "#ff6b4a"];
const TEXTS = [
  "Grey sky, warm tea, deadline tomorrow. Still a good morning.", "Rooftops and one very loud seagull.", "I can see the sea if I lean out far enough.",
  "Snow came early this year.", "Construction site. Been like that for two years.", "A tiny balcony garden that refuses to die.",
  "Neon signs and rain, classic.", "My cat is the view.", "Mountains. I will never get used to it.", "The bakery across the street just opened.",
  "Desert light at 7 am hits different.", "Trains every four minutes. I count them when I can't sleep.",
];

const L = (id: number, chain_id: number, user: number, position: number, text: string, extra: Partial<LinkRow> = {}): LinkRow => ({
  id, chain_id, user_id: by(user).id, position, text, image_url: null, video_url: null, video_frames: null, embed_url: null,
  color: COLORS[(id + position) % COLORS.length], status: "sichtbar", moderation_note: null, report_count: 0, created_at: ago(chain_id * 3 + position * 1.3),
  profiles: { username: by(user).username, display_name: by(user).display_name, planet_seed: by(user).planet_seed, planet_skin: by(user).planet_skin, level: by(user).level }, ...extra,
});

export const DEMO_LINKS: LinkRow[] = [];
DEMO_CHAINS.forEach((c) => {
  const n = Math.min(c.link_count, 12);
  const origin = c.origin_user_id ? DEMO_PROFILES.findIndex((p) => p.id === c.origin_user_id) + 1 : 1;
  for (let i = 1; i <= n; i++) {
    const user = i === 1 ? origin : ((c.id * 7 + i * 5) % DEMO_PROFILES.length) + 1;
    const text = i === 1 && c.description ? c.description : TEXTS[(c.id + i) % TEXTS.length];
    DEMO_LINKS.push(L(c.id * 100 + i, c.id, user, i, text));
  }
});

export const DEMO_REPLIES: Reply[] = DEMO_LINKS.filter((l) => l.position % 3 === 1).map((l, i) => ({
  id: 9000 + i, link_id: l.id, chain_id: l.chain_id, user_id: by((i % DEMO_PROFILES.length) + 1).id,
  text: ["Love this.", "Where is that?", "Same here, honestly.", "Adding mine tonight.", "This made my day."][i % 5], status: "sichtbar", moderation_note: null,
  created_at: ago(i % 20), profiles: { username: by((i % DEMO_PROFILES.length) + 1).username, display_name: by((i % DEMO_PROFILES.length) + 1).display_name, planet_seed: by((i % DEMO_PROFILES.length) + 1).planet_seed, planet_skin: by((i % DEMO_PROFILES.length) + 1).planet_skin, level: by((i % DEMO_PROFILES.length) + 1).level },
}));

export const DEMO_EDGES = DEMO_LINKS.flatMap((l) => {
  const next = DEMO_LINKS.find((x) => x.chain_id === l.chain_id && x.position === l.position + 1);
  return next && next.user_id !== l.user_id ? [{ chain_id: l.chain_id, from_user: l.user_id, to_user: next.user_id }] : [];
});
export const DEMO_ORBITS = DEMO_PROFILES.filter((p) => p.invited_by).map((p) => ({ from_user: p.invited_by!, to_user: p.id }));

export const DEMO_DUELS: DuelView[] = [
  { id: 1, chain_a: 4, chain_b: 5, challenger_id: by(7).id, opponent_id: by(12).id, status: "laeuft", duration_minutes: 180, starts_at: ago(1.2), ends_at: ahead(1.8), score_a: 212, score_b: 187, winner_chain: null, created_at: ago(2), a: DEMO_CHAINS[3], b: DEMO_CHAINS[4] },
  { id: 2, chain_a: 1, chain_b: 9, challenger_id: by(1).id, opponent_id: by(14).id, status: "beendet", duration_minutes: 720, starts_at: ago(30), ends_at: ago(18), score_a: 540, score_b: 498, winner_chain: 1, created_at: ago(31), a: DEMO_CHAINS[0], b: DEMO_CHAINS[8] },
];
export const DEMO_DUEL_EVENTS: DuelEvent[] = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1, duel_id: 1, side: i % 2 ? "b" : "a", kind: (["glied", "stern", "antwort"] as const)[i % 3], points: [5, 20, 2][i % 3],
  actor_id: by((i % 9) + 1).id, actor_name: by((i % 9) + 1).display_name, created_at: ago(i * 0.08),
}));

export const DEMO_LEADERS: InviteLeader[] = [1, 2, 3, 7, 12].map((i, k) => ({ id: by(i).id, username: by(i).username, display_name: by(i).display_name, planet_seed: by(i).planet_seed, planet_skin: by(i).planet_skin, invited_count: [23, 17, 11, 9, 6][k] }));
export const DEMO_WEEK: WeekLeader[] = [DEMO_CHAINS[0], DEMO_CHAINS[8], DEMO_CHAINS[1]].map((c, i) => ({ ...c, week_points: [860, 715, 640][i] }));
export const DEMO_STATS = { users: 18, chains: 14, links: DEMO_LINKS.length, stars: DEMO_CHAINS.reduce((s, c) => s + c.donated_stars, 0) };
