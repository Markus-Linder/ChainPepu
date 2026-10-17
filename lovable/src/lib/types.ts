export type Profile = {
  id: string;
  username: string;
  display_name: string;
  planet_seed: number;
  planet_skin: string;
  stars: number;
  invited_by: string | null;
  created_at: string;
};

export type ChainStats = {
  id: number;
  title: string;
  origin_user_id: string | null;
  boost: number;
  daily_day: string | null;
  created_at: string;
  link_count: number;
  user_count: number;
  origin_username: string | null;
  origin_display_name: string | null;
  last_activity: string;
};

export type LinkRow = {
  id: number;
  chain_id: number;
  user_id: string;
  position: number;
  text: string;
  image_url: string | null;
  color: string;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "planet_seed" | "planet_skin">;
  chains?: { title: string };
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
