import type { Dna, ContentProfile } from "./dna.ts";
import type { Persona } from "./persona.ts";

/** Row shape of public.creatures as returned by supabase-js. */
export type CreatureRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  species: string;
  genesis_source: "tiktok" | "prompt" | "photo" | "sandbox";
  dna: Dna;
  dna_hash: string;
  persona: Persona;
  content_profile: ContentProfile;
  cosmetics: string[];
  satiety: number;
  energy: number;
  happiness: number;
  hygiene: number;
  health: number;
  alive: boolean;
  sleeping: boolean;
  xp: number;
  level: number;
  elo: number;
  wins: number;
  losses: number;
  battle_boost: number;
  accepts_battles: boolean;
  lifetime_gross_cents: number;
  visit_count: number;
  born_at: string;
  died_at: string | null;
  last_tick_at: string;
  last_interaction_at: string;
  last_battle_at: string | null;
  last_free_play_at: string | null;
};

export type ProfileRow = {
  id: string;
  role: "visitor" | "creator" | "admin";
  handle: string;
  display_name: string;
  avatar_url: string | null;
  locale: string;
  credits: number;
  subscription_status: "none" | "trialing" | "active" | "past_due" | "canceled";
  subscription_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tiktok_open_id: string | null;
  tiktok_username: string | null;
  payout_details: Record<string, unknown> | null;
  created_at: string;
  last_seen_at: string;
};

export type PublicProfile = Pick<ProfileRow, "id" | "handle" | "display_name" | "avatar_url" | "role" | "tiktok_username" | "created_at">;

export type GiftRow = {
  id: string;
  creature_id: string;
  item_slug: string;
  sender_id: string | null;
  sender_name: string;
  price_credits: number;
  message: string | null;
  created_at: string;
};

export type ChatRow = {
  id: string;
  creature_id: string;
  user_id: string | null;
  user_name: string | null;
  role: "user" | "creature" | "system";
  content: string;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  creature_id: string;
  kind: "episodic" | "fact" | "relationship" | "lesson" | "preference";
  content: string;
  importance: number;
  about_user_id: string | null;
  about_creature_id: string | null;
  created_at: string;
};

export type QuestRow = {
  id: string;
  creature_id: string;
  audience: "creator" | "community";
  template_key: string;
  event_type: string;
  goal: number;
  progress: number;
  reward_credits: number;
  reward_xp: number;
  day_key: string;
  expires_at: string;
  completed_at: string | null;
};

export type BattleRow = {
  id: string;
  challenger_id: string;
  defender_id: string;
  winner_id: string | null;
  stake_credits: number;
  log: import("./battle.ts").BattleResult & { challengerName: string; defenderName: string };
  challenger_elo_delta: number;
  defender_elo_delta: number;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  creature_a_id: string;
  creature_b_id: string;
  topic: string;
  transcript: { speaker: string; text: string }[];
  summary: string;
  relationship: string | null;
  created_at: string;
};

export type TransactionRow = {
  id: string;
  type: string;
  user_id: string | null;
  creature_id: string | null;
  credits: number;
  gross_cents: number;
  creator_cents: number;
  platform_cents: number;
  status: "completed" | "pending" | "failed";
  stripe_ref: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type InventoryRow = { creature_id: string; item_slug: string; qty: number };
