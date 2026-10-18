/**
 * Alle Zugriffe auf Supabase. Lesen geht direkt auf Tabellen und Sichten,
 * Schreiben läuft über Datenbank-Funktionen (RPC), die selbst prüfen.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ChainStats, CreatorStats, Donation, Invite, LinkRow, MapEdge, Notification, Payout, Profile, ReportedLink } from "./types";
import { themeForDay, todayKey } from "./events";

function fail(error: { message: string } | null): never {
  throw new Error(error?.message || "Unbekannter Fehler");
}

/* ---------- Profile ---------- */
export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return (data as Profile) ?? null;
}
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) fail(error);
  return data as Profile[];
}

/* ---------- Ketten ---------- */
export async function listChains(order: "hot" | "new" = "hot", limit = 60): Promise<ChainStats[]> {
  let q = supabase.from("chain_stats").select("*").limit(limit);
  q = order === "new" ? q.order("created_at", { ascending: false }) : q.order("last_activity", { ascending: false });
  const { data, error } = await q;
  if (error) fail(error);
  const rows = data as ChainStats[];
  if (order === "hot") rows.sort((a, b) => b.link_count + b.boost * 3 - (a.link_count + a.boost * 3));
  return rows;
}
export async function getChain(id: number): Promise<ChainStats | null> {
  const { data } = await supabase.from("chain_stats").select("*").eq("id", id).maybeSingle();
  return (data as ChainStats) ?? null;
}
export async function listChainsByOrigin(userId: string): Promise<ChainStats[]> {
  const { data, error } = await supabase.from("chain_stats").select("*").eq("origin_user_id", userId).order("created_at", { ascending: false });
  if (error) fail(error);
  return data as ChainStats[];
}
export async function listChainsJoined(userId: string): Promise<ChainStats[]> {
  const { data: ids } = await supabase.from("links").select("chain_id").eq("user_id", userId);
  const unique = [...new Set((ids ?? []).map((r: { chain_id: number }) => r.chain_id))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from("chain_stats").select("*").in("id", unique).order("last_activity", { ascending: false });
  if (error) fail(error);
  return (data as ChainStats[]).filter((c) => c.origin_user_id !== userId);
}
export async function startChain(input: { title: string; text: string; image_url: string | null; color: string }): Promise<number> {
  return startChainWithMedia({ ...input, video_url: null });
}
export async function boostChain(chainId: number) {
  const { error } = await supabase.rpc("boost_chain", { p_chain_id: chainId });
  if (error) fail(error);
}
export async function ensureDailyChain(): Promise<number> {
  const { data, error } = await supabase.rpc("ensure_daily_chain", { p_title: themeForDay(todayKey()) });
  if (error) fail(error);
  return data as number;
}

/* ---------- Glieder ---------- */
const LINK_SELECT = "*, profiles(username, display_name, planet_seed, planet_skin)";
export async function getLinks(chainId: number): Promise<LinkRow[]> {
  const { data, error } = await supabase.from("links").select(LINK_SELECT).eq("chain_id", chainId).order("position");
  if (error) fail(error);
  return data as unknown as LinkRow[];
}
export async function listLinksByUser(userId: string, limit = 10): Promise<LinkRow[]> {
  const { data, error } = await supabase.from("links").select(`${LINK_SELECT}, chains(title)`).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as unknown as LinkRow[];
}
export async function addLink(input: { chain_id: number; text: string; image_url: string | null; color: string }): Promise<number> {
  return addLinkWithMedia({ ...input, video_url: null });
}

/* ---------- Bilder ---------- */
export async function uploadImage(userId: string, file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Das Bild darf höchstens 8 MB groß sein.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("bilder").upload(path, file, { contentType: file.type, upsert: false });
  if (error) fail(error);
  return supabase.storage.from("bilder").getPublicUrl(path).data.publicUrl;
}

/* ---------- Einladungen ---------- */
export async function createInvite(chainId: number, inviterId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { error } = await supabase.from("invites").insert({ token, chain_id: chainId, inviter_id: inviterId });
  if (error) fail(error);
  return token;
}
export async function getInvite(token: string): Promise<Invite | null> {
  const { data } = await supabase.from("invites").select("*, profiles!invites_inviter_id_fkey(display_name), chains(title)").eq("token", token).maybeSingle();
  return (data as unknown as Invite) ?? null;
}
export async function useInvite(token: string): Promise<number> {
  const { data, error } = await supabase.rpc("use_invite", { p_token: token });
  if (error) fail(error);
  return data as number;
}

/* ---------- Shop ---------- */
export async function buySkin(skin: string) {
  const { error } = await supabase.rpc("buy_skin", { p_skin: skin });
  if (error) fail(error);
}
export async function isDemoMode(): Promise<boolean> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "demo_mode").maybeSingle();
  return data?.value === "true";
}
export async function demoAddStars(pack: string) {
  const { error } = await supabase.rpc("demo_add_stars", { p_pack: pack });
  if (error) fail(error);
}
export async function createCheckout(pack: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout", { body: { pack, origin: window.location.origin } });
  if (error) fail(error);
  if (!data?.url) throw new Error("Keine Zahlungsseite erhalten.");
  return data.url as string;
}

/* ---------- Karte ---------- */
export async function getMapEdges(): Promise<MapEdge[]> {
  const { data, error } = await supabase.from("map_edges").select("*");
  if (error) fail(error);
  return data as MapEdge[];
}
export async function getStats() {
  const [u, c, l] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("chains").select("*", { count: "exact", head: true }),
    supabase.from("links").select("*", { count: "exact", head: true }),
  ]);
  return { users: u.count ?? 0, chains: c.count ?? 0, links: l.count ?? 0 };
}

/* ======================================================================
 * Teil 2: Videos, Folgen, Mitteilungen, Spenden, Auszahlung, Moderation
 * ====================================================================== */

export async function uploadVideo(userId: string, file: File): Promise<string> {
  if (file.size > 100 * 1024 * 1024) throw new Error("Das Video darf höchstens 100 MB groß sein.");
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) fail(error);
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

/** Lädt ein Bild oder ein Video und gibt die passenden Felder für ein Glied zurück. */
export async function uploadMedia(userId: string, file: File | null): Promise<{ image_url: string | null; video_url: string | null }> {
  if (!file) return { image_url: null, video_url: null };
  if (file.type.startsWith("video/")) return { image_url: null, video_url: await uploadVideo(userId, file) };
  return { image_url: await uploadImage(userId, file), video_url: null };
}

export async function startChainWithMedia(input: { title: string; text: string; image_url: string | null; video_url: string | null; color: string }): Promise<number> {
  const { data, error } = await supabase.rpc("start_chain", {
    p_title: input.title, p_text: input.text, p_image_url: input.image_url ?? "", p_color: input.color, p_video_url: input.video_url ?? "",
  });
  if (error) fail(error);
  return data as number;
}

export async function addLinkWithMedia(input: { chain_id: number; text: string; image_url: string | null; video_url: string | null; color: string }): Promise<number> {
  const { data, error } = await supabase.rpc("add_link", {
    p_chain_id: input.chain_id, p_text: input.text, p_image_url: input.image_url ?? "", p_color: input.color, p_video_url: input.video_url ?? "",
  });
  if (error) fail(error);
  return data as number;
}

/* ---------- Folgen ---------- */
export async function followCreator(creatorId: string) {
  const { error } = await supabase.rpc("follow_creator", { p_creator: creatorId });
  if (error) fail(error);
}
export async function unfollowCreator(creatorId: string) {
  const { error } = await supabase.rpc("unfollow_creator", { p_creator: creatorId });
  if (error) fail(error);
}
export async function isFollowing(followerId: string, creatorId: string): Promise<boolean> {
  const { data } = await supabase.from("follows").select("creator_id").eq("follower_id", followerId).eq("creator_id", creatorId).maybeSingle();
  return Boolean(data);
}
export async function getCreatorStats(userId: string): Promise<CreatorStats> {
  const { data } = await supabase.from("creator_stats").select("follower_count, donated_total").eq("id", userId).maybeSingle();
  return (data as CreatorStats) ?? { follower_count: 0, donated_total: 0 };
}

/* ---------- Spenden ---------- */
export async function donateStars(chainId: number, stars: number, message: string) {
  const { error } = await supabase.rpc("donate_stars", { p_chain_id: chainId, p_stars: stars, p_message: message });
  if (error) fail(error);
}
export async function listDonations(chainId: number, limit = 20): Promise<Donation[]> {
  const { data, error } = await supabase.from("donations").select("*, profiles!donations_from_user_fkey(username, display_name)")
    .eq("chain_id", chainId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as unknown as Donation[];
}

/* ---------- Mitteilungen ---------- */
export async function listNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as Notification[];
}
export async function countUnread(): Promise<number> {
  const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false);
  return count ?? 0;
}
export async function markNotificationsRead() {
  const { error } = await supabase.rpc("mark_notifications_read");
  if (error) fail(error);
}

/* ---------- Auszahlung ---------- */
export async function requestPayout(): Promise<number> {
  const { data, error } = await supabase.rpc("request_payout");
  if (error) fail(error);
  return data as number;
}
export async function convertEarnings(stars: number) {
  const { error } = await supabase.rpc("convert_earnings", { p_stars: stars });
  if (error) fail(error);
}
export async function listPayouts(): Promise<Payout[]> {
  const { data, error } = await supabase.from("payouts").select("*").order("created_at", { ascending: false });
  if (error) fail(error);
  return data as Payout[];
}
export async function getPayoutSettings(): Promise<{ min: number; cents: number; share: number }> {
  const { data } = await supabase.from("app_settings").select("key, value").in("key", ["payout_min_stars", "star_cents", "creator_share_percent"]);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, Number(r.value)]));
  return { min: m.payout_min_stars ?? 1000, cents: m.star_cents ?? 1, share: m.creator_share_percent ?? 80 };
}

/* ---------- Meldungen und Moderation ---------- */
export async function reportLink(linkId: number, reason: string) {
  const { error } = await supabase.rpc("report_link", { p_link_id: linkId, p_reason: reason });
  if (error) fail(error);
}
export async function listReportedLinks(): Promise<ReportedLink[]> {
  const { data, error } = await supabase.from("links").select(`${LINK_SELECT}, chains(title), reports(reason, created_at)`)
    .in("status", ["gemeldet", "gesperrt"]).order("report_count", { ascending: false }).limit(100);
  if (error) fail(error);
  return data as unknown as ReportedLink[];
}
export async function moderateLink(linkId: number, status: "sichtbar" | "gesperrt") {
  const { error } = await supabase.rpc("moderate_link", { p_link_id: linkId, p_status: status });
  if (error) fail(error);
}
export async function acceptRules() {
  const { error } = await supabase.rpc("accept_rules");
  if (error) fail(error);
}
