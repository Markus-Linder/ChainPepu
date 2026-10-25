/* Sprachansagen: vorab aufgenommene Clips (ElevenLabs-Stimme), nacheinander abgespielt.
   Fällt ein Clip aus, spricht die Browser-Sprachausgabe den Ersatztext. */
import { EXERCISES, audioUrl, type ExerciseId } from "@/data/exercises";

export type Clip = [src: string, fallback: string];

export const CLIPS = {
  ready: ["/media/audio/ansage_bereit.mp3", "Bereit machen. Gleich geht es los."],
  pause: ["/media/audio/ansage_pause.mp3", "Pause. Kurz durchatmen."],
  next: ["/media/audio/ansage_naechstes.mp3", "Als Nächstes:"],
  ten: ["/media/audio/ansage_zehn.mp3", "Noch zehn Sekunden."],
  switch: ["/media/audio/ansage_seite.mp3", "Seite wechseln."],
  done: ["/media/audio/ansage_geschafft.mp3", "Geschafft! Super gemacht."],
  lastround: ["/media/audio/ansage_letzte_runde.mp3", "Letzte Runde."],
  half: ["/media/audio/ansage_haelfte.mp3", "Die Hälfte ist geschafft."],
} satisfies Record<string, Clip>;

export const exClip = (id: ExerciseId, kind: "kurz" | "anleitung"): Clip => [
  audioUrl(id, kind),
  kind === "kurz" ? `${EXERCISES[id].name}. ${EXERCISES[id].steps[0]}` : EXERCISES[id].steps.join(" "),
];

let el: HTMLAudioElement | null = null;
let queue: Clip[] = [];
let busy = false;
const listeners = new Set<(busy: boolean) => void>();

function notify() { listeners.forEach((l) => l(busy)); }
export function onVoiceState(l: (busy: boolean) => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export const isSpeaking = () => busy;

function speakFallback(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE"; u.rate = 1.05;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.startsWith("de"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* keine Sprachausgabe */ }
}

export function stopVoice() {
  queue = []; busy = false;
  if (el) { try { el.pause(); el.removeAttribute("src"); el.load(); } catch { /* */ } }
  try { window.speechSynthesis?.cancel(); } catch { /* */ }
  notify();
}

function playNext() {
  if (!queue.length) { busy = false; notify(); return; }
  busy = true; notify();
  const [src, text] = queue.shift()!;
  el = el ?? new Audio();
  el.onended = playNext;
  el.onerror = () => { speakFallback(text); setTimeout(playNext, 1500); };
  el.src = src;
  el.play().catch(() => { speakFallback(text); setTimeout(playNext, 1500); });
}

export function say(clips: Clip[]) {
  stopVoice();
  queue = clips.slice();
  playNext();
}

/* Signaltöne über Web Audio */
let ctx: AudioContext | null = null;
export function beep(freq: number, ms: number, vol = 0.15) {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + ms / 1000);
  } catch { /* kein Audio */ }
}
