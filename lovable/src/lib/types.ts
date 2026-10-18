export type Profile = {
  id: string;
  username: string;
  display_name: string;
  planet_seed: number;
  planet_skin: string;
  stars: number;
  earned_stars: number;
  is_moderator: boolean;
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
};

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
  color: string;
  status: ContentStatus;
  moderation_note: string | null;
  report_count: number;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "planet_seed" | "planet_skin">;
  chains?: { title: string; daily_day?: string | null };
};

export type Reply = {
  id: number;
  link_id: number;
  chain_id: number;
  user_id: string;
  text: string;
  status: ContentStatus;
  moderation_note: string | null;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "planet_seed" | "planet_skin">;
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

export type NotificationParams = { key?: string; actor?: string; title?: string; stars?: number; share?: number; reason?: string };

export type Notification = {
  id: number;
  type: "neue_kette" | "spende" | "neuer_follower" | "glied" | "moderation" | "antwort";
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
