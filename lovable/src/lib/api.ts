/**
 * Alle Zugriffe auf Supabase. Lesen geht direkt auf Tabellen und Sichten,
 * Schreiben läuft über Datenbank-Funktionen (RPC), die selbst prüfen.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AdminStats, ChainStats, CreatorBoard, CreatorStats, Donation, Duel, DuelEvent, DuelView, Invite, InviteLeader, LinkRow, MapEdge, Notification, Payout, PayoutRow, Profile, Reply, ReportedLink, Tournament, TournamentDuel, TournamentEntry, Verdict, WeekLeader, WeeklyChallenge } from "./types";
import { themeForDay, todayKey } from "./events";
import { DEMO, DEMO_CHAINS, DEMO_DUEL_EVENTS, DEMO_DUELS, DEMO_EDGES, DEMO_LEADERS, DEMO_LINKS, DEMO_ORBITS, DEMO_PROFILES, DEMO_REPLIES, DEMO_STATS, DEMO_WEEK } from "./demo";

function fail(error: { message: string } | null): never {
  throw new Error(error?.message || "err_unknown");
}

/* ---------- Profile ---------- */
export async function getProfile(id: string): Promise<Profile | null> {
  if (DEMO) return DEMO_PROFILES.find((p) => p.id === id) ?? null;
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  if (DEMO) return DEMO_PROFILES.find((p) => p.username === username.toLowerCase()) ?? null;
  const { data } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return (data as Profile) ?? null;
}
export async function listProfiles(): Promise<Profile[]> {
  if (DEMO) return DEMO_PROFILES;
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) fail(error);
  return data as Profile[];
}

/* ---------- Ketten ---------- */
export async function listChains(order: "hot" | "new" = "hot", limit = 60): Promise<ChainStats[]> {
  if (DEMO) return [...DEMO_CHAINS].sort((a, b) => (order === "new" ? b.created_at.localeCompare(a.created_at) : heat(b) - heat(a))).slice(0, limit);
  let q = supabase.from("chain_stats").select("*").limit(limit);
  q = order === "new" ? q.order("created_at", { ascending: false }) : q.order("last_activity", { ascending: false });
  const { data, error } = await q;
  if (error) fail(error);
  const rows = data as ChainStats[];
  if (order === "hot") rows.sort((a, b) => heat(b) - heat(a));
  return rows;
}
export const heat = (c: ChainStats) => c.link_count + c.boost * 3 + c.donated_stars / 10 + c.reply_count / 2;

export async function listTopics(limit = 12): Promise<ChainStats[]> {
  if (DEMO) return DEMO_CHAINS.filter((c) => c.is_topic).slice(0, limit);
  const { data, error } = await supabase.from("chain_stats").select("*").eq("is_topic", true)
    .gt("ends_at", new Date().toISOString()).order("ends_at").limit(limit);
  if (error) fail(error);
  return data as ChainStats[];
}
export async function getChain(id: number): Promise<ChainStats | null> {
  if (DEMO) return DEMO_CHAINS.find((c) => c.id === id) ?? null;
  const { data } = await supabase.from("chain_stats").select("*").eq("id", id).maybeSingle();
  return (data as ChainStats) ?? null;
}
export async function listChainsByOrigin(userId: string): Promise<ChainStats[]> {
  if (DEMO) return DEMO_CHAINS.filter((c) => c.origin_user_id === userId);
  const { data, error } = await supabase.from("chain_stats").select("*").eq("origin_user_id", userId).order("created_at", { ascending: false });
  if (error) fail(error);
  return data as ChainStats[];
}
export async function listChainsJoined(userId: string): Promise<ChainStats[]> {
  if (DEMO) return DEMO_CHAINS.filter((c) => c.origin_user_id !== userId && DEMO_LINKS.some((l) => l.chain_id === c.id && l.user_id === userId));
  const { data: ids } = await supabase.from("links").select("chain_id").eq("user_id", userId);
  const unique = [...new Set((ids ?? []).map((r: { chain_id: number }) => r.chain_id))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from("chain_stats").select("*").in("id", unique).order("last_activity", { ascending: false });
  if (error) fail(error);
  return (data as ChainStats[]).filter((c) => c.origin_user_id !== userId);
}
export async function boostChain(chainId: number) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("boost_chain", { p_chain_id: chainId });
  if (error) fail(error);
}
/** Die Tages-Kette wird mit dem englischen Thema gespeichert; angezeigt wird sie in der Sprache des Nutzers. */
export async function ensureDailyChain(): Promise<number> {
  if (DEMO) return 11;
  const { data, error } = await supabase.rpc("ensure_daily_chain", { p_title: themeForDay(todayKey(), "en") });
  if (error) fail(error);
  return data as number;
}

export type MediaFields = { image_url: string | null; video_url: string | null; video_frames: string[] | null; embed_url?: string | null };

export async function startChain(input: MediaFields & { title: string; text: string; color: string; description?: string; is_topic?: boolean; days?: number; from_link?: number | null }): Promise<{ chainId: number; linkId: number }> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("start_chain", {
    p_title: input.title, p_text: input.text, p_image_url: input.image_url ?? "", p_color: input.color,
    p_video_url: input.video_url ?? "", p_video_frames: input.video_frames, p_description: input.description ?? "",
    p_is_topic: Boolean(input.is_topic), p_days: input.days ?? 3, p_embed_url: input.embed_url ?? "", p_from_link: input.from_link ?? null,
  });
  if (error) fail(error);
  const chainId = data as number;
  const { data: first } = await supabase.from("links").select("id").eq("chain_id", chainId).eq("position", 1).maybeSingle();
  return { chainId, linkId: (first as { id: number } | null)?.id ?? 0 };
}

/* ---------- Glieder ---------- */
const PROFILE_SELECT = "profiles(username, display_name, planet_seed, planet_skin, level)";
const LINK_SELECT = `*, ${PROFILE_SELECT}`;
export async function getLinks(chainId: number): Promise<LinkRow[]> {
  if (DEMO) return DEMO_LINKS.filter((l) => l.chain_id === chainId);
  const { data, error } = await supabase.from("links").select(LINK_SELECT).eq("chain_id", chainId).order("position");
  if (error) fail(error);
  return data as unknown as LinkRow[];
}
export async function listLinksByUser(userId: string, limit = 10): Promise<LinkRow[]> {
  if (DEMO) return DEMO_LINKS.filter((l) => l.user_id === userId).slice(0, limit).map((l) => ({ ...l, chains: { title: DEMO_CHAINS.find((c) => c.id === l.chain_id)?.title ?? "", daily_day: DEMO_CHAINS.find((c) => c.id === l.chain_id)?.daily_day ?? null } }));
  const { data, error } = await supabase.from("links").select(`${LINK_SELECT}, chains(title, daily_day)`).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as unknown as LinkRow[];
}
export async function addLink(input: MediaFields & { chain_id: number; text: string; color: string }): Promise<number> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("add_link", {
    p_chain_id: input.chain_id, p_text: input.text, p_image_url: input.image_url ?? "", p_color: input.color,
    p_video_url: input.video_url ?? "", p_video_frames: input.video_frames, p_embed_url: input.embed_url ?? "",
  });
  if (error) fail(error);
  return data as number;
}
/** The stream: newest visible links across the universe, one screen each. */
export async function listStream(before: string | null, limit = 10): Promise<LinkRow[]> {
  if (DEMO) return [...DEMO_LINKS].sort((a, b) => b.created_at.localeCompare(a.created_at)).filter((l) => !before || l.created_at < before).slice(0, limit).map((l) => { const c = DEMO_CHAINS.find((x) => x.id === l.chain_id)!; return { ...l, chains: { title: c.title, daily_day: c.daily_day, origin_user_id: c.origin_user_id, donated_stars: c.donated_stars, is_topic: c.is_topic } }; });
  let q = supabase.from("links").select(`${LINK_SELECT}, chains(title, daily_day, origin_user_id, donated_stars, is_topic)`)
    .eq("status", "sichtbar").order("created_at", { ascending: false }).limit(limit);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) fail(error);
  return data as unknown as LinkRow[];
}
export async function getLink(id: number): Promise<LinkRow | null> {
  if (DEMO) return DEMO_LINKS.find((l) => l.id === id) ?? null;
  const { data } = await supabase.from("links").select(`${LINK_SELECT}, chains(title, daily_day)`).eq("id", id).maybeSingle();
  return (data as unknown as LinkRow) ?? null;
}
export async function listBranches(chainId: number): Promise<ChainStats[]> {
  if (DEMO) return [];
  const { data: ids } = await supabase.from("links").select("id").eq("chain_id", chainId);
  const linkIds = (ids ?? []).map((r: { id: number }) => r.id);
  if (linkIds.length === 0) return [];
  const { data, error } = await supabase.from("chain_stats").select("*").in("branched_from_link", linkIds).order("created_at", { ascending: false });
  if (error) fail(error);
  return data as ChainStats[];
}

/* ---------- Nutzername, Konstellation ---------- */
export async function setUsername(username: string, displayName: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("set_username", { p_username: username, p_display_name: displayName });
  if (error) fail(error);
}
export async function listInviteLeaders(limit = 10): Promise<InviteLeader[]> {
  if (DEMO) return DEMO_LEADERS.slice(0, limit);
  const { data, error } = await supabase.from("invite_stats").select("*").gt("invited_count", 0).order("invited_count", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as InviteLeader[];
}
export async function getConstellationEdges(): Promise<{ from_user: string; to_user: string }[]> {
  if (DEMO) return DEMO_ORBITS;
  const { data } = await supabase.from("constellation_edges").select("*");
  return (data ?? []) as { from_user: string; to_user: string }[];
}

/* ---------- Antworten ---------- */
export async function listReplies(chainId: number): Promise<Reply[]> {
  if (DEMO) return DEMO_REPLIES.filter((r) => r.chain_id === chainId);
  const { data, error } = await supabase.from("replies").select(`*, ${PROFILE_SELECT}`).eq("chain_id", chainId).order("created_at");
  if (error) fail(error);
  return data as unknown as Reply[];
}
export async function addReply(linkId: number, text: string): Promise<number> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("add_reply", { p_link_id: linkId, p_text: text });
  if (error) fail(error);
  return data as number;
}
export async function moderateReply(replyId: number, status: "sichtbar" | "gesperrt") {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("moderate_reply", { p_reply_id: replyId, p_status: status });
  if (error) fail(error);
}
export async function listPendingReplies(): Promise<(Reply & { chains?: { title: string } })[]> {
  if (DEMO) return [];
  const { data, error } = await supabase.from("replies").select(`*, ${PROFILE_SELECT}, chains(title)`)
    .in("status", ["pruefung", "gesperrt"]).order("created_at", { ascending: false }).limit(100);
  if (error) fail(error);
  return data as unknown as (Reply & { chains?: { title: string } })[];
}

/* ---------- Prüfung ---------- */
export async function getLinkVerdict(id: number): Promise<Verdict> {
  if (DEMO) return { status: "sichtbar", note: null };
  const { data } = await supabase.from("links").select("status, moderation_note").eq("id", id).maybeSingle();
  return { status: (data?.status as Verdict["status"]) ?? "pruefung", note: data?.moderation_note ?? null };
}
export async function getReplyVerdict(id: number): Promise<Verdict> {
  if (DEMO) return { status: "sichtbar", note: null };
  const { data } = await supabase.from("replies").select("status, moderation_note").eq("id", id).maybeSingle();
  return { status: (data?.status as Verdict["status"]) ?? "pruefung", note: data?.moderation_note ?? null };
}
export async function requestModeration(body: { link_id: number } | { reply_id: number }) {
  if (DEMO) return;
  const { error } = await supabase.functions.invoke("moderate-content", { body });
  if (error) fail(error);
}

/* ---------- Medien ---------- */
function mediaPath(userId: string, ext: string, folder = "") {
  return `${userId}/${folder}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}
export async function uploadImage(userId: string, file: File): Promise<string> {
  if (DEMO) throw new Error("demo_readonly");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = mediaPath(userId, ext);
  const { error } = await supabase.storage.from("bilder").upload(path, file, { contentType: file.type, upsert: false });
  if (error) fail(error);
  return supabase.storage.from("bilder").getPublicUrl(path).data.publicUrl;
}
export async function uploadVideo(userId: string, file: File): Promise<string> {
  if (DEMO) throw new Error("demo_readonly");
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = mediaPath(userId, ext);
  const { error } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) fail(error);
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}
/** Standbilder eines Videos (für die Prüfung) in den Bilder-Speicher laden. */
export async function uploadFrames(userId: string, frames: Blob[]): Promise<string[]> {
  if (DEMO) throw new Error("demo_readonly");
  const urls: string[] = [];
  for (const f of frames) {
    const path = mediaPath(userId, "jpg", "frames/");
    const { error } = await supabase.storage.from("bilder").upload(path, f, { contentType: "image/jpeg", upsert: false });
    if (error) fail(error);
    urls.push(supabase.storage.from("bilder").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

/* ---------- Einladungen ---------- */
export async function createInvite(chainId: number, inviterId: string): Promise<string> {
  if (DEMO) throw new Error("demo_readonly");
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { error } = await supabase.from("invites").insert({ token, chain_id: chainId, inviter_id: inviterId });
  if (error) fail(error);
  return token;
}
export async function getInvite(token: string): Promise<Invite | null> {
  if (DEMO) return null;
  const { data } = await supabase.from("invites").select("*, profiles!invites_inviter_id_fkey(display_name), chains(title)").eq("token", token).maybeSingle();
  return (data as unknown as Invite) ?? null;
}
export async function useInvite(token: string): Promise<number> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("use_invite", { p_token: token });
  if (error) fail(error);
  return data as number;
}

/* ---------- Shop ---------- */
export async function buySkin(skin: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("buy_skin", { p_skin: skin });
  if (error) fail(error);
}
export async function isDemoMode(): Promise<boolean> {
  if (DEMO) return true;
  const { data } = await supabase.from("app_settings").select("value").eq("key", "demo_mode").maybeSingle();
  return data?.value === "true";
}
export async function demoAddStars(pack: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("demo_add_stars", { p_pack: pack });
  if (error) fail(error);
}
export async function createCheckout(pack: string): Promise<string> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.functions.invoke("create-checkout", { body: { pack, origin: window.location.origin } });
  if (error) fail(error);
  if (!data?.url) throw new Error("err_unknown");
  return data.url as string;
}

/* ---------- Karte und Zahlen ---------- */
export async function getMapEdges(): Promise<MapEdge[]> {
  if (DEMO) return DEMO_EDGES;
  const { data, error } = await supabase.from("map_edges").select("*");
  if (error) fail(error);
  return data as MapEdge[];
}
export async function getStats() {
  if (DEMO) return DEMO_STATS;
  const [u, c, l, d] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("chains").select("*", { count: "exact", head: true }),
    supabase.from("links").select("*", { count: "exact", head: true }).eq("status", "sichtbar"),
    supabase.from("donations").select("stars"),
  ]);
  const stars = ((d.data ?? []) as { stars: number }[]).reduce((s, r) => s + r.stars, 0);
  return { users: u.count ?? 0, chains: c.count ?? 0, links: l.count ?? 0, stars };
}

/* ---------- Folgen ---------- */
export async function followCreator(creatorId: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("follow_creator", { p_creator: creatorId });
  if (error) fail(error);
}
export async function unfollowCreator(creatorId: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("unfollow_creator", { p_creator: creatorId });
  if (error) fail(error);
}
export async function isFollowing(followerId: string, creatorId: string): Promise<boolean> {
  if (DEMO) return false;
  const { data } = await supabase.from("follows").select("creator_id").eq("follower_id", followerId).eq("creator_id", creatorId).maybeSingle();
  return Boolean(data);
}
export async function getCreatorStats(userId: string): Promise<CreatorStats> {
  if (DEMO) return { follower_count: 40 + (DEMO_PROFILES.findIndex((p) => p.id === userId) + 1) * 13, donated_total: DEMO_CHAINS.filter((c) => c.origin_user_id === userId).reduce((s, c) => s + c.donated_stars, 0) };
  const { data } = await supabase.from("creator_stats").select("follower_count, donated_total").eq("id", userId).maybeSingle();
  return (data as CreatorStats) ?? { follower_count: 0, donated_total: 0 };
}

/* ---------- Spenden ---------- */
export async function donateStars(chainId: number, stars: number, message: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("donate_stars", { p_chain_id: chainId, p_stars: stars, p_message: message });
  if (error) fail(error);
}
export async function listDonations(chainId: number, limit = 20): Promise<Donation[]> {
  if (DEMO) return DEMO_LINKS.filter((l) => l.chain_id === chainId).slice(1, 6).map((l, i) => ({ id: chainId * 10 + i, chain_id: chainId, from_user: l.user_id, stars: [25, 50, 10, 100, 25][i % 5], message: i === 0 ? "Keep going!" : null, created_at: l.created_at, profiles: { username: l.profiles.username, display_name: l.profiles.display_name } })).slice(0, limit);
  const { data, error } = await supabase.from("donations").select("*, profiles!donations_from_user_fkey(username, display_name)")
    .eq("chain_id", chainId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as unknown as Donation[];
}

/* ---------- Mitteilungen ---------- */
export async function listNotifications(limit = 50): Promise<Notification[]> {
  if (DEMO) return [];
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as Notification[];
}
export async function countUnread(): Promise<number> {
  if (DEMO) return 0;
  const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false);
  return count ?? 0;
}
export async function markNotificationsRead() {
  if (DEMO) return;
  const { error } = await supabase.rpc("mark_notifications_read");
  if (error) fail(error);
}

/* ---------- Auszahlung ---------- */
export async function requestPayout(): Promise<number> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("request_payout");
  if (error) fail(error);
  return data as number;
}
export async function convertEarnings(stars: number) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("convert_earnings", { p_stars: stars });
  if (error) fail(error);
}
export async function listPayouts(): Promise<Payout[]> {
  if (DEMO) return [];
  const { data, error } = await supabase.from("payouts").select("*").order("created_at", { ascending: false });
  if (error) fail(error);
  return data as Payout[];
}
export type PayoutSettings = { min: number; cents: number; share: number };
export async function getPayoutSettings(): Promise<PayoutSettings> {
  if (DEMO) return { min: 1000, cents: 1, share: 80 };
  const { data } = await supabase.from("app_settings").select("key, value").in("key", ["payout_min_stars", "star_cents", "creator_share_percent"]);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, Number(r.value)]));
  return { min: m.payout_min_stars ?? 1000, cents: m.star_cents ?? 1, share: m.creator_share_percent ?? 80 };
}

/* ---------- Meldungen und Moderation ---------- */
export async function reportLink(linkId: number, reason: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("report_link", { p_link_id: linkId, p_reason: reason });
  if (error) fail(error);
}
export async function listReportedLinks(): Promise<ReportedLink[]> {
  if (DEMO) return [];
  const { data, error } = await supabase.from("links").select(`${LINK_SELECT}, chains(title), reports(reason, created_at)`)
    .in("status", ["pruefung", "gemeldet", "gesperrt"]).order("created_at", { ascending: false }).limit(100);
  if (error) fail(error);
  return data as unknown as ReportedLink[];
}
export async function moderateLink(linkId: number, status: "sichtbar" | "gesperrt") {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("moderate_link", { p_link_id: linkId, p_status: status });
  if (error) fail(error);
}
export async function acceptRules() {
  if (DEMO) return;
  const { error } = await supabase.rpc("accept_rules");
  if (error) fail(error);
}

/* ---------- Wochen-Challenge ---------- */
export async function listWeekLeaders(limit = 5): Promise<WeekLeader[]> {
  if (DEMO) return DEMO_WEEK.slice(0, limit);
  const { data, error } = await supabase.from("week_leaderboard").select("*").order("week_points", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as WeekLeader[];
}
export async function getWeekPool(): Promise<number> {
  if (DEMO) return 420;
  const { data } = await supabase.rpc("week_pool");
  return Number(data ?? 0);
}
export async function settleWeek() {
  if (DEMO) return;
  await supabase.rpc("settle_week");
}
export async function listWeeklyWinners(limit = 5): Promise<WeeklyChallenge[]> {
  if (DEMO) return [];
  const { data } = await supabase.from("weekly_challenges").select("*").order("week_start", { ascending: false }).limit(limit);
  return (data ?? []) as WeeklyChallenge[];
}
/** Seconds until the current week (UTC, Monday start) ends. */
export function secondsUntilWeekEnd(now = new Date()): number {
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 7);
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

/* ---------- Ranglisten ---------- */
export async function listCreatorBoard(order: "stars_received" | "crowns" | "follower_count" | "reach" | "level", limit = 20): Promise<CreatorBoard[]> {
  if (DEMO) return DEMO_PROFILES.map((p) => ({ id: p.id, username: p.username, display_name: p.display_name, planet_seed: p.planet_seed, planet_skin: p.planet_skin, level: p.level, duel_wins: p.duel_wins, created_at: p.created_at, stars_received: DEMO_CHAINS.filter((c) => c.origin_user_id === p.id).reduce((s, c) => s + c.donated_stars, 0), follower_count: 40 + p.level * 13, crowns: DEMO_CHAINS.filter((c) => c.origin_user_id === p.id).reduce((s, c) => s + c.crowns, 0), chains_started: DEMO_CHAINS.filter((c) => c.origin_user_id === p.id).length, reach: DEMO_CHAINS.filter((c) => c.origin_user_id === p.id).reduce((s, c) => s + c.link_count, 0) })).filter((x) => x[order] > 0).sort((a, b) => b[order] - a[order]).slice(0, limit);
  const { data, error } = await supabase.from("creator_board").select("*").gt(order, 0).order(order, { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as CreatorBoard[];
}
export async function listChainBoard(order: "link_count" | "donated_stars" | "crowns" | "reply_count", limit = 20): Promise<ChainStats[]> {
  if (DEMO) return DEMO_CHAINS.filter((c) => c[order] > 0).sort((a, b) => b[order] - a[order]).slice(0, limit);
  const { data, error } = await supabase.from("chain_stats").select("*").gt(order, 0).order(order, { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as ChainStats[];
}

/* ---------- Creator-Dashboard ---------- */
export async function listMyDonations(userId: string, days = 30): Promise<Donation[]> {
  if (DEMO) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase.from("donations").select("*, profiles!donations_from_user_fkey(username, display_name)").eq("to_user", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
  if (error) fail(error);
  return data as unknown as Donation[];
}
export async function listReachLinks(chainIds: number[], days = 30): Promise<{ chain_id: number; created_at: string; user_id: string }[]> {
  if (DEMO) return [];
  if (chainIds.length === 0) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase.from("links").select("chain_id, created_at, user_id").in("chain_id", chainIds).eq("status", "sichtbar").gte("created_at", since).limit(2000);
  return (data ?? []) as { chain_id: number; created_at: string; user_id: string }[];
}

/* ---------- Turniere ---------- */
export async function listTournaments(limit = 30): Promise<Tournament[]> {
  if (DEMO) return [];
  const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as Tournament[];
}
export async function getTournament(id: number): Promise<{ t: Tournament; entries: TournamentEntry[]; duels: (TournamentDuel & { duel: DuelView })[] } | null> {
  if (DEMO) return null;
  const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!t) return null;
  const [{ data: entries }, { data: tds }] = await Promise.all([
    supabase.from("tournament_entries").select("*").eq("tournament_id", id).order("created_at"),
    supabase.from("tournament_duels").select("*").eq("tournament_id", id).order("round"),
  ]);
  const chainIds = (entries ?? []).map((e: TournamentEntry) => e.chain_id);
  const { data: chains } = chainIds.length ? await supabase.from("chain_stats").select("*").in("id", chainIds) : { data: [] };
  const byId = new Map((chains as ChainStats[] | null ?? []).map((c) => [c.id, c]));
  const duelIds = (tds ?? []).map((d: TournamentDuel) => d.duel_id);
  const { data: duels } = duelIds.length ? await supabase.from("duels").select("*").in("id", duelIds) : { data: [] };
  const views = await withChains((duels as Duel[] | null) ?? []);
  const viewById = new Map(views.map((v) => [v.id, v]));
  return {
    t: t as Tournament,
    entries: ((entries ?? []) as TournamentEntry[]).map((e) => ({ ...e, chain: byId.get(e.chain_id) })),
    duels: ((tds ?? []) as TournamentDuel[]).filter((d) => viewById.has(d.duel_id)).map((d) => ({ ...d, duel: viewById.get(d.duel_id)! })),
  };
}
export async function createTournament(title: string, size: 4 | 8, roundMinutes: number): Promise<number> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("create_tournament", { p_title: title, p_size: size, p_round_minutes: roundMinutes });
  if (error) fail(error);
  return data as number;
}
export async function joinTournament(id: number, chainId: number) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("join_tournament", { p_id: id, p_chain: chainId });
  if (error) fail(error);
}
export async function advanceTournament(id: number) {
  if (DEMO) return;
  await supabase.rpc("advance_tournament", { p_id: id });
}

/* ---------- Admin ---------- */
export async function getAdminStats(): Promise<AdminStats> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) fail(error);
  return data as AdminStats;
}
export async function listPayoutQueue(): Promise<PayoutRow[]> {
  if (DEMO) return [];
  const { data, error } = await supabase.from("payout_queue").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) fail(error);
  return data as PayoutRow[];
}
export async function adminSetPayout(id: number, status: "bezahlt" | "abgelehnt") {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("admin_set_payout", { p_id: id, p_status: status });
  if (error) fail(error);
}
export async function listSettings(): Promise<{ key: string; value: string }[]> {
  if (DEMO) return [];
  const { data } = await supabase.from("app_settings").select("key, value").order("key");
  return (data ?? []) as { key: string; value: string }[];
}
export async function adminSetSetting(key: string, value: string) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("admin_set_setting", { p_key: key, p_value: value });
  if (error) fail(error);
}
export async function adminSetRole(userId: string, moderator: boolean, admin: boolean) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_moderator: moderator, p_admin: admin });
  if (error) fail(error);
}
export async function listStaff(): Promise<Profile[]> {
  if (DEMO) return [];
  const { data } = await supabase.from("profiles").select("*").or("is_moderator.eq.true,is_admin.eq.true").order("username");
  return (data ?? []) as Profile[];
}

/* ---------- Ketten-Duell ---------- */
async function withChains(duels: Duel[]): Promise<DuelView[]> {
  const ids = [...new Set(duels.flatMap((d) => [d.chain_a, d.chain_b]))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("chain_stats").select("*").in("id", ids);
  if (error) fail(error);
  const byId = new Map((data as ChainStats[]).map((c) => [c.id, c]));
  return duels.filter((d) => byId.has(d.chain_a) && byId.has(d.chain_b)).map((d) => ({ ...d, a: byId.get(d.chain_a)!, b: byId.get(d.chain_b)! }));
}
export async function listLiveDuels(limit = 6): Promise<DuelView[]> {
  if (DEMO) return DEMO_DUELS.filter((d) => d.status === "laeuft").slice(0, limit);
  const { data, error } = await supabase.from("duels").select("*").eq("status", "laeuft").order("ends_at").limit(limit);
  if (error) fail(error);
  return withChains(data as Duel[]);
}
export async function getDuel(id: number): Promise<DuelView | null> {
  if (DEMO) return DEMO_DUELS.find((d) => d.id === id) ?? null;
  const { data } = await supabase.from("duels").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return (await withChains([data as Duel]))[0] ?? null;
}
export async function listDuelsForChain(chainId: number): Promise<DuelView[]> {
  if (DEMO) return DEMO_DUELS.filter((d) => d.chain_a === chainId || d.chain_b === chainId);
  const { data, error } = await supabase.from("duels").select("*").or(`chain_a.eq.${chainId},chain_b.eq.${chainId}`).order("created_at", { ascending: false }).limit(20);
  if (error) fail(error);
  return withChains(data as Duel[]);
}
export async function listDuelsForUser(userId: string): Promise<DuelView[]> {
  if (DEMO) return DEMO_DUELS.filter((d) => d.challenger_id === userId || d.opponent_id === userId);
  const { data, error } = await supabase.from("duels").select("*").or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`).order("created_at", { ascending: false }).limit(30);
  if (error) fail(error);
  return withChains(data as Duel[]);
}
export async function listDuelEvents(duelId: number, limit = 40): Promise<DuelEvent[]> {
  if (DEMO) return DEMO_DUEL_EVENTS.filter((e) => e.duel_id === duelId).slice(0, limit);
  const { data, error } = await supabase.from("duel_events").select("*").eq("duel_id", duelId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as DuelEvent[];
}
export async function createDuel(chainA: number, chainB: number, minutes: number): Promise<number> {
  if (DEMO) throw new Error("demo_readonly");
  const { data, error } = await supabase.rpc("create_duel", { p_chain_a: chainA, p_chain_b: chainB, p_minutes: minutes });
  if (error) fail(error);
  return data as number;
}
export async function respondDuel(duelId: number, accept: boolean) {
  if (DEMO) throw new Error("demo_readonly");
  const { error } = await supabase.rpc("respond_duel", { p_duel_id: duelId, p_accept: accept });
  if (error) fail(error);
}
export async function finishDuel(duelId: number) {
  if (DEMO) return;
  const { error } = await supabase.rpc("finish_duel", { p_duel_id: duelId });
  if (error) fail(error);
}
export async function getDuelSettings(): Promise<{ mult: number; link: number; reply: number }> {
  if (DEMO) return { mult: 2, link: 5, reply: 2 };
  const { data } = await supabase.from("app_settings").select("key, value").in("key", ["duel_star_multiplier", "duel_link_points", "duel_reply_points"]);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, Number(r.value)]));
  return { mult: m.duel_star_multiplier ?? 2, link: m.duel_link_points ?? 5, reply: m.duel_reply_points ?? 2 };
}
/** Live updates for one duel (score and ticker). Returns an unsubscribe function. */
export function subscribeDuel(duelId: number, onChange: () => void): () => void {
  if (DEMO) return () => {};
  const channel = supabase.channel(`duel-${duelId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "duels", filter: `id=eq.${duelId}` }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "duel_events", filter: `duel_id=eq.${duelId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
