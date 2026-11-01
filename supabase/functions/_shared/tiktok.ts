import type { ContentProfile } from "./dna.ts";

/**
 * TikTok Login Kit + Display API integration.
 * Docs: https://developers.tiktok.com/doc/login-kit-web
 * With no client key configured, the app offers a sandbox login that uses sample content.
 */

export const TIKTOK_SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"];

export type TikTokConfig = { clientKey: string; clientSecret: string; redirectUri: string };

export function authorizeUrl(cfg: TikTokConfig, state: string) {
  const params = new URLSearchParams({
    client_key: cfg.clientKey,
    scope: TIKTOK_SCOPES.join(","),
    response_type: "code",
    redirect_uri: cfg.redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export type TikTokTokens = { access_token: string; refresh_token: string; open_id: string; expires_in: number; scope: string };

export async function exchangeCode(cfg: TikTokConfig, code: string): Promise<TikTokTokens> {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: cfg.clientKey,
      client_secret: cfg.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status}`);
  return (await res.json()) as TikTokTokens;
}

export type TikTokUser = {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  display_name: string;
  username?: string;
  bio_description?: string;
  follower_count?: number;
  likes_count?: number;
  video_count?: number;
};

export async function fetchUser(accessToken: string): Promise<TikTokUser> {
  const fields = "open_id,union_id,avatar_url,display_name,username,bio_description,follower_count,likes_count,video_count";
  const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`TikTok user info failed: ${res.status}`);
  const json = (await res.json()) as { data: { user: TikTokUser } };
  return json.data.user;
}

export type TikTokVideo = {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
};

export async function fetchVideos(accessToken: string, max = 40): Promise<TikTokVideo[]> {
  const fields = "id,title,video_description,duration,like_count,comment_count,share_count,view_count";
  const videos: TikTokVideo[] = [];
  let cursor: number | undefined;
  let hasMore = true;
  while (hasMore && videos.length < max) {
    const res = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20, cursor }),
    });
    if (!res.ok) break;
    const json = (await res.json()) as { data: { videos: TikTokVideo[]; cursor: number; has_more: boolean } };
    videos.push(...(json.data?.videos ?? []));
    cursor = json.data?.cursor;
    hasMore = Boolean(json.data?.has_more);
  }
  return videos.slice(0, max);
}

/* ---------- Content analysis ---------- */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fitness: ["gym", "workout", "fitness", "training", "muscle", "lift", "cardio", "abs", "fit", "bodybuilding", "crossfit", "yoga", "pilates"],
  gaming: ["gaming", "gamer", "fortnite", "minecraft", "valorant", "lol", "ps5", "xbox", "twitch", "stream", "speedrun", "roblox"],
  cooking: ["recipe", "cooking", "food", "foodie", "kitchen", "bake", "baking", "chef", "meal", "snack", "rezept", "kochen", "essen"],
  comedy: ["funny", "comedy", "lol", "humor", "joke", "prank", "meme", "sketch", "lustig", "witz", "fail"],
  music: ["music", "song", "singer", "guitar", "piano", "rap", "cover", "beat", "producer", "musik", "band", "vocal"],
  dance: ["dance", "choreo", "choreography", "tanz", "dancer", "moves", "ballet", "hiphop"],
  beauty: ["makeup", "beauty", "skincare", "grwm", "hair", "nails", "lipstick", "glow", "schminke"],
  fashion: ["fashion", "outfit", "ootd", "style", "thrift", "haul", "mode", "streetwear", "sneaker"],
  tech: ["tech", "gadget", "iphone", "android", "coding", "programming", "ai", "software", "developer", "startup", "technik"],
  education: ["learn", "education", "study", "facts", "history", "science", "math", "lernen", "wissen", "explained", "tutorial"],
  travel: ["travel", "trip", "vacation", "reise", "urlaub", "wanderlust", "adventure", "backpacking", "hotel", "flight"],
  pets: ["dog", "cat", "puppy", "kitten", "pet", "hund", "katze", "tiere", "animal", "hamster"],
  art: ["art", "drawing", "painting", "illustration", "artist", "sketch", "kunst", "zeichnen", "digitalart"],
  finance: ["money", "finance", "invest", "crypto", "bitcoin", "stocks", "trading", "geld", "finanzen", "budget", "aktien"],
  sports: ["football", "soccer", "basketball", "tennis", "fußball", "nba", "goal", "skate", "surf", "boxing", "mma"],
  lifestyle: ["lifestyle", "vlog", "daily", "routine", "life", "alltag", "selfcare", "minimalism", "home", "family"],
  horror: ["horror", "scary", "creepy", "paranormal", "ghost", "mystery", "true crime", "grusel"],
  cars: ["car", "cars", "auto", "jdm", "drift", "supercar", "motorcycle", "bike", "tuning", "porsche", "bmw"],
  nature: ["nature", "hiking", "outdoor", "garden", "plants", "wildlife", "natur", "wandern", "camping", "ocean"],
};

const STOPWORDS = new Set(["the", "and", "for", "you", "with", "this", "that", "are", "was", "der", "die", "das", "und", "ich", "ist", "ein", "eine", "mit", "auf", "nicht", "fyp", "foryou", "foryoupage", "viral", "trending", "tiktok", "pov", "video", "like", "your", "from", "have", "just", "when"]);

export function analyzeContent(user: TikTokUser, videos: TikTokVideo[], language = "en"): ContentProfile {
  const texts = videos.map((v) => `${v.title ?? ""} ${v.video_description ?? ""}`);
  const all = `${user.bio_description ?? ""} ${texts.join(" ")}`.toLowerCase();
  const hashtags = new Map<string, number>();
  for (const tag of all.match(/#[\p{L}\p{N}_]+/gu) ?? []) hashtags.set(tag, (hashtags.get(tag) ?? 0) + 1);
  const words = new Map<string, number>();
  for (const w of all.replace(/#/g, " ").match(/[\p{L}]{3,}/gu) ?? []) {
    if (STOPWORDS.has(w)) continue;
    words.set(w, (words.get(w) ?? 0) + 1);
  }
  const scores = new Map<string, number>();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    let s = 0;
    for (const kw of kws) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
      s += (all.match(re) ?? []).length;
    }
    if (s > 0) scores.set(cat, s);
  }
  const categories = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  if (categories.length === 0) categories.push("lifestyle");
  const sum = (k: keyof TikTokVideo) => videos.reduce((acc, v) => acc + (Number(v[k]) || 0), 0);
  return {
    source: "tiktok",
    handle: user.username ?? user.display_name.replace(/\s+/g, "").toLowerCase(),
    displayName: user.display_name,
    bio: user.bio_description ?? "",
    followerCount: user.follower_count ?? 0,
    videoCount: videos.length,
    topHashtags: [...hashtags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t),
    keywords: [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w),
    categories,
    avgLikes: videos.length ? Math.round(sum("like_count") / videos.length) : 0,
    avgViews: videos.length ? Math.round(sum("view_count") / videos.length) : 0,
    sampleCaptions: texts.filter(Boolean).slice(0, 8).map((t) => t.slice(0, 160)),
    language,
  };
}

/* ---------- Sandbox profiles (used when TikTok keys are missing) ---------- */

export const SANDBOX_PROFILES: Record<string, { user: TikTokUser; videos: TikTokVideo[] }> = {
  fitmax: {
    user: { open_id: "sandbox_fitmax", display_name: "FitMax", username: "fitmax", bio_description: "Gym rat 🏋️ | daily workouts & bad jokes | #fitness #comedy", follower_count: 184000, video_count: 120 },
    videos: [
      { id: "1", video_description: "Leg day destroyed me 😂 #gym #fitness #legday #fyp", like_count: 42000, view_count: 510000 },
      { id: "2", video_description: "When the gym bro asks for a spot #funny #gymhumor #workout", like_count: 88000, view_count: 1200000 },
      { id: "3", video_description: "5 minute abs you can actually do #abs #training #fitness", like_count: 31000, view_count: 400000 },
      { id: "4", video_description: "Protein pancake recipe 🥞 #recipe #fitness #food", like_count: 25000, view_count: 300000 },
      { id: "5", video_description: "POV: your trainer is a comedian #comedy #gym", like_count: 60000, view_count: 900000 },
    ],
  },
  pixelnova: {
    user: { open_id: "sandbox_pixelnova", display_name: "PixelNova", username: "pixelnova", bio_description: "Gaming clips, tech reviews & cozy streams ✨ #gaming #tech", follower_count: 92000, video_count: 300 },
    videos: [
      { id: "1", video_description: "This Valorant clutch broke my chat #gaming #valorant #clutch", like_count: 12000, view_count: 220000 },
      { id: "2", video_description: "Unboxing the new handheld 🎮 #tech #gadget #gaming", like_count: 18000, view_count: 310000 },
      { id: "3", video_description: "Minecraft base tour 2026 #minecraft #gaming #build", like_count: 9000, view_count: 150000 },
      { id: "4", video_description: "Why I switched to Linux for coding #tech #programming #developer", like_count: 7000, view_count: 120000 },
    ],
  },
  chefluna: {
    user: { open_id: "sandbox_chefluna", display_name: "Chef Luna", username: "chefluna", bio_description: "15-minute recipes from my tiny kitchen 🍜 travel foodie", follower_count: 410000, video_count: 540 },
    videos: [
      { id: "1", video_description: "Creamy garlic ramen in 15 minutes #recipe #cooking #ramen #food", like_count: 150000, view_count: 2400000 },
      { id: "2", video_description: "Street food tour in Bangkok 🇹🇭 #travel #food #streetfood", like_count: 98000, view_count: 1500000 },
      { id: "3", video_description: "Baking sourdough for the first time #baking #bread #kitchen", like_count: 40000, view_count: 600000 },
      { id: "4", video_description: "What I eat in a day as a chef #foodie #cooking #meal", like_count: 71000, view_count: 980000 },
    ],
  },
  melodymay: {
    user: { open_id: "sandbox_melodymay", display_name: "Melody May", username: "melodymay", bio_description: "singer-songwriter 🎸 covers every Friday | dance breaks in between", follower_count: 56000, video_count: 210 },
    videos: [
      { id: "1", video_description: "Acoustic cover of your favorite song 🎶 #music #cover #guitar #singer", like_count: 20000, view_count: 300000 },
      { id: "2", video_description: "Writing a song from your comments #songwriter #music #original", like_count: 15000, view_count: 210000 },
      { id: "3", video_description: "Dance break between takes 💃 #dance #choreo #music", like_count: 33000, view_count: 500000 },
    ],
  },
};
