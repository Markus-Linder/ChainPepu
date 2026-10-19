export type Profile = {
  id: string;
  username: string;
  display_name: string;
  planet_seed: number;
  planet_skin: string;
  stars: number;
  earned_stars: number;
  is_moderator: boolean;
  is_admin: boolean;
  duel_wins: number;
  xp: number;
  level: number;
  streak_days: number;
  last_active_day: string | null;
  invited_by: string | null;
  accepted_rules_at: string | null;
  created_at: string;
};

export type ChainStats = {
  id: number;
  title: string;
  description: string | null;
  is_topic: boolean;
  ends_at: string | null;
  origin_user_id: string | null;
  boost: number;
  donated_stars: number;
  daily_day: string | null;
  created_at: string;
  link_count: number;
  user_count: number;
  reply_count: number;
  origin_username: string | null;
  origin_display_name: string | null;
  last_activity: string;
  crowns: number;
  active_duel_id: number | null;
  branched_from_link: number | null;
  is_jackpot?: boolean;
};

export type InviteLeader = { id: string; username: string; display_name: string; planet_seed: number; planet_skin: string; invited_count: number };

export type ContentStatus = "sichtbar" | "gemeldet" | "gesperrt" | "pruefung";

export type LinkRow = {
  id: number;
  chain_id: number;
  user_id: string;
  position: number;
  text: string;
  image_url: string | null;
  video_url: string | null;
  video_frames: string[] | null;
  embed_url: string | null;
  color: string;
  status: ContentStatus;
  moderation_note: string | null;
  report_count: number;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "planet_seed" | "planet_skin"> & { level?: number };
  chains?: { title: string; daily_day?: string | null; origin_user_id?: string | null; origin_display_name?: string | null; donated_stars?: number; is_topic?: boolean };
};

export type WeekLeader = ChainStats & { week_points: number };

export type CreatorBoard = { id: string; username: string; display_name: string; planet_seed: number; planet_skin: string; level: number; duel_wins: number; created_at: string; stars_received: number; follower_count: number; crowns: number; chains_started: number; reach: number };

export type Tournament = { id: number; title: string; size: 4 | 8; round_minutes: number; status: "offen" | "laeuft" | "beendet"; round: number; created_by: string; winner_chain: number | null; created_at: string };
export type TournamentEntry = { tournament_id: number; chain_id: number; user_id: string; eliminated: boolean; chain?: ChainStats };
export type TournamentDuel = { tournament_id: number; round: number; duel_id: number };

export type Jackpot = {
  id: number; round: number; chain_id: number; pot_stars: number; started_at: string; ends_at: string; status: "laeuft" | "beendet";
  last_link_id: number | null; last_user_id: string | null; winner_user: string | null; winner_stars: number | null; alerted: boolean; settled_at: string | null;
  last_username: string | null; last_display_name: string | null; last_seed: number | null; last_skin: string | null; last_level: number | null;
  link_count: number; user_count: number;
};

export type AdminStats = Record<string, number> & { new_users_14d: { day: string; n: number }[]; stars_14d: { day: string; n: number }[] };
export type PayoutRow = Payout & { user_id: string; username: string; display_name: string };
export type WeeklyChallenge = { week_start: string; pool_stars: number; winner_chain: number | null; winner_user: string | null; settled_at: string };

export type Reply = {
  id: number;
  link_id: number;
  chain_id: number;
  user_id: string;
  text: string;
  status: ContentStatus;
  moderation_note: string | null;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "planet_seed" | "planet_skin"> & { level?: number };
};

export type Invite = {
  token: string;
  chain_id: number;
  inviter_id: string;
  used_by: string | null;
  profiles: { display_name: string };
  chains: { title: string };
};

export type MapEdge = { chain_id: number; from_user: string; to_user: string };

export type NotificationParams = { key?: string; actor?: string; title?: string; stars?: number; share?: number; reason?: string; duel?: number };

export type Notification = {
  id: number;
  type: "neue_kette" | "spende" | "neuer_follower" | "glied" | "moderation" | "antwort" | "duell" | "zeitkette";
  actor_id: string | null;
  chain_id: number | null;
  message: string;
  params: NotificationParams | null;
  read: boolean;
  created_at: string;
};

export type Donation = {
  id: number;
  chain_id: number;
  from_user: string;
  stars: number;
  message: string | null;
  created_at: string;
  profiles: { username: string; display_name: string };
};

export type CreatorStats = { follower_count: number; donated_total: number };

export type Payout = { id: number; stars: number; cents: number; status: string; created_at: string };

export type ReportedLink = LinkRow & { reports: { reason: string; created_at: string }[] };

export type Verdict = { status: ContentStatus; note: string | null };

export type DuelStatus = "offen" | "laeuft" | "beendet" | "abgelehnt";

export type Duel = {
  id: number;
  chain_a: number;
  chain_b: number;
  challenger_id: string;
  opponent_id: string;
  status: DuelStatus;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  score_a: number;
  score_b: number;
  winner_chain: number | null;
  created_at: string;
};

export type DuelEvent = {
  id: number;
  duel_id: number;
  side: "a" | "b";
  kind: "glied" | "antwort" | "stern";
  points: number;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
};

/** A duel together with both chains, ready for display. */
export type DuelView = Duel & { a: ChainStats; b: ChainStats };
