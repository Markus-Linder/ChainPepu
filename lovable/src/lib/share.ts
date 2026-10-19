/**
 * Share clip: renders a chain as a 9:16 story image (1080×1920) with planet, title, numbers and QR code,
 * ready to post on TikTok, Instagram or WhatsApp. Runs completely in the browser.
 */
import QRCode from "qrcode";
import { planetLook, skinColors } from "./planet";
import type { ChainStats } from "./types";

const W = 1080, H = 1920;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…");
  return lines;
}

function drawPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, skin: string) {
  const look = planetLook(seed, skin);
  const { a, b } = skinColors(look);
  ctx.save();
  ctx.shadowColor = look.glow; ctx.shadowBlur = r * 0.9;
  if (look.rings) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((look.ringTilt * Math.PI) / 180);
    ctx.strokeStyle = a; ctx.globalAlpha = 0.7; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.7, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export type ClipInput = {
  chain: ChainStats;
  title: string;
  url: string;
  labels: { links: string; planets: string; stars: string; cta: string; by: string };
  seed?: number;
  skin?: string;
  excerpt?: string;
};

export async function renderChainClip(input: ClipInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background: obsidian with nebula glow and stars
  ctx.fillStyle = "#06050d"; ctx.fillRect(0, 0, W, H);
  const n1 = ctx.createRadialGradient(200, 300, 0, 200, 300, 900); n1.addColorStop(0, "rgba(123,97,255,.45)"); n1.addColorStop(1, "rgba(123,97,255,0)");
  ctx.fillStyle = n1; ctx.fillRect(0, 0, W, H);
  const n2 = ctx.createRadialGradient(950, 1500, 0, 950, 1500, 800); n2.addColorStop(0, "rgba(255,61,154,.35)"); n2.addColorStop(1, "rgba(255,61,154,0)");
  ctx.fillStyle = n2; ctx.fillRect(0, 0, W, H);
  let s = input.chain.id * 7919 + 13;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.7})`; const r = rnd() * 2.2 + 0.4; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2); ctx.fill(); }

  // Logo
  ctx.strokeStyle = "#a08cff"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(96, 120, 30, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#ff3d9a"; ctx.beginPath(); ctx.arc(136, 120, 30, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#f2c46d"; ctx.beginPath(); ctx.arc(116, 120, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f1efff"; ctx.font = "bold 54px 'Space Grotesk', Inter, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("ChainPepu", 190, 120);

  // Planet of the origin
  drawPlanet(ctx, W / 2, 560, 170, input.seed ?? input.chain.id, input.skin ?? "standard");

  // Title
  ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = "bold 84px 'Space Grotesk', Inter, sans-serif";
  const lines = wrap(ctx, input.title, 900, 3);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 860 + i * 100));
  const afterTitle = 860 + lines.length * 100;

  if (input.chain.origin_display_name) {
    ctx.fillStyle = "#9b97c4"; ctx.font = "500 40px Inter, sans-serif";
    ctx.fillText(`${input.labels.by} ${input.chain.origin_display_name}`, W / 2, afterTitle + 10);
  }

  // Excerpt
  if (input.excerpt) {
    ctx.fillStyle = "rgba(241,239,255,.9)"; ctx.font = "italic 44px Inter, sans-serif";
    wrap(ctx, `“${input.excerpt}”`, 880, 3).forEach((l, i) => ctx.fillText(l, W / 2, afterTitle + 120 + i * 58));
  }

  // Numbers
  const stats: [string, string, string][] = [
    [String(input.chain.link_count), input.labels.links, "#a08cff"],
    [String(input.chain.user_count), input.labels.planets, "#ff7cc0"],
    [`★ ${input.chain.donated_stars}`, input.labels.stars, "#f2c46d"],
  ];
  stats.forEach(([n, label, color], i) => {
    const x = 200 + i * 340;
    ctx.fillStyle = color; ctx.font = "bold 76px 'Space Grotesk', Inter, sans-serif"; ctx.fillText(n, x, 1330);
    ctx.fillStyle = "#9b97c4"; ctx.font = "500 34px Inter, sans-serif"; ctx.fillText(label, x, 1395);
  });

  // QR + CTA
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, input.url, { width: 300, margin: 1, color: { dark: "#06050d", light: "#ffffff" } });
  ctx.fillStyle = "#ffffff"; roundRect(ctx, 390, 1500, 300, 300, 28); ctx.fill();
  ctx.drawImage(qr, 390, 1500, 300, 300);
  ctx.fillStyle = "#ffffff"; ctx.font = "600 42px Inter, sans-serif"; ctx.fillText(input.labels.cta, W / 2, 1860);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** Time chain clip: countdown and pot, big, with QR. */
export async function renderJackpotClip(input: { pot: number; remaining: number; round: number; lastName: string; url: string; labels: { title: string; pot: string; last: string; cta: string; ends: string } }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#06050d"; ctx.fillRect(0, 0, W, H);
  const n1 = ctx.createRadialGradient(540, 700, 0, 540, 700, 900); n1.addColorStop(0, "rgba(242,196,109,.35)"); n1.addColorStop(1, "rgba(242,196,109,0)");
  ctx.fillStyle = n1; ctx.fillRect(0, 0, W, H);
  const n2 = ctx.createRadialGradient(150, 1600, 0, 150, 1600, 800); n2.addColorStop(0, "rgba(255,61,154,.3)"); n2.addColorStop(1, "rgba(255,61,154,0)");
  ctx.fillStyle = n2; ctx.fillRect(0, 0, W, H);
  let s = input.round * 104729 + 7;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.7})`; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 2.2 + 0.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = "#a08cff"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(96, 120, 30, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#ff3d9a"; ctx.beginPath(); ctx.arc(136, 120, 30, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#f2c46d"; ctx.beginPath(); ctx.arc(116, 120, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f1efff"; ctx.font = "bold 54px 'Space Grotesk', Inter, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("ChainPepu", 190, 120);
  ctx.textAlign = "center";
  ctx.fillStyle = "#9b97c4"; ctx.font = "600 40px Inter, sans-serif"; ctx.fillText(`${input.labels.title.toUpperCase()}  ·  #${input.round}`, W / 2, 420);
  // Ring + countdown
  ctx.lineWidth = 26; ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.arc(W / 2, 760, 250, 0, Math.PI * 2); ctx.stroke();
  const frac = Math.min(1, input.remaining / (24 * 3600));
  ctx.strokeStyle = input.remaining < 900 ? "#ff5a5a" : "#f2c46d"; ctx.lineCap = "round"; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(W / 2, 760, 250, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke(); ctx.shadowBlur = 0;
  const h = Math.floor(input.remaining / 3600), m = Math.floor((input.remaining % 3600) / 60);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 150px 'Space Grotesk', Inter, sans-serif"; ctx.fillText(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, W / 2, 745);
  ctx.fillStyle = "#9b97c4"; ctx.font = "500 36px Inter, sans-serif"; ctx.fillText(input.labels.ends, W / 2, 850);
  // Pot
  ctx.fillStyle = "#f2c46d"; ctx.font = "bold 120px 'Space Grotesk', Inter, sans-serif"; ctx.fillText(`★ ${input.pot}`, W / 2, 1150);
  ctx.fillStyle = "#9b97c4"; ctx.font = "500 40px Inter, sans-serif"; ctx.fillText(input.labels.pot, W / 2, 1235);
  if (input.lastName) { ctx.fillStyle = "#f1efff"; ctx.font = "600 44px Inter, sans-serif"; ctx.fillText(`${input.labels.last}: ${input.lastName}`, W / 2, 1340); }
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, input.url, { width: 300, margin: 1, color: { dark: "#06050d", light: "#ffffff" } });
  ctx.fillStyle = "#ffffff"; roundRect(ctx, 390, 1440, 300, 300, 28); ctx.fill();
  ctx.drawImage(qr, 390, 1440, 300, 300);
  ctx.fillStyle = "#ffffff"; ctx.font = "600 44px Inter, sans-serif"; wrap(ctx, input.labels.cta, 900, 2).forEach((l, i) => ctx.fillText(l, W / 2, 1810 + i * 54));
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Share through the phone's share sheet (TikTok, Instagram, WhatsApp …) or download. */
export async function shareBlob(blob: Blob, filename: string, title: string, url: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title, text: url }); return "shared"; } catch {}
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}
