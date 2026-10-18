/** Embedded videos from TikTok, YouTube and Instagram: turn a share link into an iframe source. */
export type Embed = { provider: "tiktok" | "youtube" | "instagram"; src: string; ratio: string };

export const EMBED_PATTERN = /^https:\/\/(www\.|m\.|vm\.)?(tiktok\.com|youtube\.com|youtu\.be|instagram\.com)\//;

export function parseEmbed(url: string | null | undefined): Embed | null {
  if (!url || !EMBED_PATTERN.test(url)) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("tiktok.com")) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return { provider: "tiktok", src: `https://www.tiktok.com/embed/v2/${m[1]}`, ratio: "9 / 16" };
      return null; // short vm.tiktok.com links carry no video id; the user pastes the full link
    }
    if (u.hostname.includes("youtu")) {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") || u.pathname.match(/\/(shorts|embed)\/([\w-]+)/)?.[2];
      if (id) return { provider: "youtube", src: `https://www.youtube.com/embed/${id}`, ratio: u.pathname.includes("/shorts/") ? "9 / 16" : "16 / 9" };
      return null;
    }
    if (u.hostname.includes("instagram.com")) {
      const m = u.pathname.match(/\/(reel|p)\/([\w-]+)/);
      if (m) return { provider: "instagram", src: `https://www.instagram.com/${m[1]}/${m[2]}/embed`, ratio: "9 / 16" };
    }
  } catch {}
  return null;
}
