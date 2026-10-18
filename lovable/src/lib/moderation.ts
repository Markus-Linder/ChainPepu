/**
 * Client-Seite der Inhaltsprüfung: Videos werden vor dem Upload geprüft (Länge) und in
 * Standbilder zerlegt, damit der Server sie wie Fotos prüfen kann. Nach dem Absenden
 * wartet der Client kurz auf das Urteil, damit der Nutzer sofort Bescheid weiß.
 */
import { getLinkVerdict, getReplyVerdict, requestModeration } from "./api";
import type { Verdict } from "./types";

export const MAX_VIDEO_SECONDS = 180;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const FRAME_COUNT = 4;
const FRAME_WIDTH = 640;

/** Liest Dauer und einige Standbilder aus einem Video (läuft komplett im Browser). */
export function probeVideo(file: File): Promise<{ duration: number; frames: Blob[] }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true; video.playsInline = true; video.preload = "auto"; video.src = url;
    const canvas = document.createElement("canvas");
    const frames: Blob[] = [];
    const cleanup = () => { URL.revokeObjectURL(url); video.removeAttribute("src"); video.load(); };
    const fail = () => { cleanup(); reject(new Error("video_read")); };
    video.onerror = fail;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return fail();
      if (duration > MAX_VIDEO_SECONDS) { cleanup(); return reject(new Error("video_long")); }
      const scale = Math.min(1, FRAME_WIDTH / (video.videoWidth || FRAME_WIDTH));
      canvas.width = Math.round((video.videoWidth || FRAME_WIDTH) * scale);
      canvas.height = Math.round((video.videoHeight || FRAME_WIDTH) * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return fail();
      try {
        for (let i = 0; i < FRAME_COUNT; i++) {
          const t = duration * ((i + 0.5) / FRAME_COUNT);
          await new Promise<void>((ok, bad) => {
            const timer = setTimeout(() => bad(new Error("video_read")), 8000);
            video.onseeked = () => { clearTimeout(timer); ok(); };
            video.currentTime = Math.min(t, Math.max(0, duration - 0.1));
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.7));
          if (blob) frames.push(blob);
        }
      } catch { return fail(); }
      cleanup();
      if (frames.length === 0) return reject(new Error("video_read"));
      resolve({ duration, frames });
    };
  });
}

/** Stößt die Prüfung an und wartet bis zu `ms` Millisekunden auf ein Urteil. */
export async function awaitVerdict(kind: "link" | "reply", id: number, ms = 25000): Promise<Verdict> {
  const read = kind === "link" ? getLinkVerdict : getReplyVerdict;
  let current = await read(id);
  if (current.status !== "pruefung") return current;
  // Prüfung direkt anstoßen (unabhängig davon, ob zusätzlich ein Webhook läuft).
  requestModeration(kind === "link" ? { link_id: id } : { reply_id: id }).catch(() => {});
  const until = Date.now() + ms;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 1500));
    current = await read(id);
    if (current.status !== "pruefung") return current;
  }
  return current;
}
