import { EXERCISES, type ExerciseId } from "./exercises";

export interface WeekConfig { work: number; rest: number; rounds: number; roundRest: number; label: string; focus: string; nutritionFocus: string; }

/* Vier Wochen: Belastung steigt, Pausen werden kürzer. Jede Woche hat einen Trainings- und einen Ernährungsschwerpunkt. */
export const WEEKS: WeekConfig[] = [
  { work: 30, rest: 20, rounds: 2, roundRest: 60, label: "Einstieg",
    focus: "Technik lernen. Lieber sauber und langsam als schnell und schlampig. Höre bei jeder Übung einmal die Anleitung an.",
    nutritionFocus: "Getränke umstellen: Wasser, ungesüßter Tee und Kaffee statt Säfte, Softdrinks und Alkohol." },
  { work: 35, rest: 20, rounds: 2, roundRest: 60, label: "Aufbau",
    focus: "Spannung halten. Bauch bleibt in jeder Übung fest, auch in den Pausen zwischen Wiederholungen.",
    nutritionFocus: "Eiweiß zu jeder Hauptmahlzeit: Quark, Eier, Fisch, Geflügel, Hülsenfrüchte oder Tofu." },
  { work: 40, rest: 15, rounds: 3, roundRest: 60, label: "Steigerung",
    focus: "Dritte Runde durchziehen. Wenn die Form leidet, nimm die leichtere Variante statt abzubrechen.",
    nutritionFocus: "Halber Teller Gemüse bei Mittag- und Abendessen. Sättigt viel bei wenig Kalorien." },
  { work: 45, rest: 15, rounds: 3, roundRest: 45, label: "Festigen",
    focus: "Intensität hoch. Probiere bei zwei Übungen pro Einheit die schwerere Variante.",
    nutritionFocus: "Abends leichter essen und spätes Snacken streichen. Messwerte mit Woche 1 vergleichen." },
];

/* Wochenziele: werden in der App abgehakt und gespeichert. */
export const WEEK_GOALS: string[][] = [
  ["Alle 5 Einheiten dieser Woche absolvieren", "An 5 Tagen mindestens 7.000 Schritte gehen", "Jeden Tag 2 Liter Wasser trinken", "Plank 30 Sekunden am Stück halten", "Startwerte eintragen: Taille und Gewicht"],
  ["Alle 5 Einheiten absolvieren", "An 5 Tagen mindestens 8.000 Schritte", "Keine zuckerhaltigen Getränke die ganze Woche", "Plank 45 Sekunden halten", "Eiweiß zu jeder Hauptmahlzeit"],
  ["5 Einheiten, davon alle Zirkel mit 3 Runden", "An 5 Tagen mindestens 9.000 Schritte", "Halber Teller Gemüse bei Mittag und Abend", "Plank 60 Sekunden halten", "Höchstens einmal Alkohol"],
  ["Alle 5 Einheiten absolvieren", "An 5 Tagen mindestens 10.000 Schritte", "Abendessen bis 20 Uhr, danach nichts mehr", "Plank 75 Sekunden halten", "Messwerte vergleichen und die nächsten 4 Wochen planen"],
];

export type DayKind = "core" | "full" | "hiit" | "active" | "rest";

interface DayTemplate { title: string; intro: string; exs: ExerciseId[]; light?: boolean; }

export const DAY_TEMPLATES: Record<DayKind, DayTemplate> = {
  core: { title: "Bauch & Rumpf", intro: "Dein Kernprogramm. Sauber ausführen, nicht hetzen.", exs: ["plank", "deadbug", "bicycle", "sideplank", "legraise", "birddog"] },
  full: { title: "Ganzkörper & Fettverbrennung", intro: "Große Muskeln, hoher Puls: hier verbrennst du am meisten.", exs: ["squat", "mountain", "lunge", "bridge", "twist", "plank"] },
  hiit: { title: "Kurz & intensiv", intro: "Ein kurzer Intervallblock. Gib in den Arbeitsphasen alles.", exs: ["jacks", "mountain", "squat", "bicycle"] },
  active: { title: "Aktive Erholung", intro: "Heute kein Zirkel. 30 bis 45 Minuten zügig spazieren gehen, dazu ein kurzer Rumpf-Block.", exs: ["deadbug", "bridge", "birddog"], light: true },
  rest: { title: "Ruhetag", intro: "Muskeln wachsen in der Pause. Heute nur Dehnen oder ein lockerer Spaziergang.", exs: [] },
};

export const WEEK_PLAN: DayKind[] = ["core", "active", "full", "active", "core", "hiit", "rest"];
export const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const WARMUP: Block[] = [
  { ex: "jacks", work: 40, rest: 15, phase: "Aufwärmen" },
  { ex: "squat", work: 40, rest: 15, phase: "Aufwärmen" },
  { ex: "birddog", work: 40, rest: 15, phase: "Aufwärmen" },
];

export interface Block { ex: ExerciseId; work: number; rest: number; phase: string; side?: "rechts" | "links"; }

export interface Workout {
  title: string; intro: string; kind: DayKind; blocks: Block[]; minutes: number; week: number; day: number; weekLabel: string;
}

export function buildWorkout(weekIdx: number, dayIdx: number): Workout {
  const w = WEEKS[Math.min(weekIdx, WEEKS.length - 1)];
  const kind = WEEK_PLAN[dayIdx];
  const tpl = DAY_TEMPLATES[kind];
  const blocks: Block[] = [];
  if (tpl.exs.length === 0) {
    return { title: tpl.title, intro: tpl.intro, kind, blocks, minutes: 0, week: weekIdx, day: dayIdx, weekLabel: w.label };
  }
  if (!tpl.light) WARMUP.forEach((b) => blocks.push({ ...b }));
  const rounds = tpl.light ? 2 : kind === "hiit" ? w.rounds + 1 : w.rounds;
  const work = kind === "hiit" ? 30 : w.work;
  const rest = kind === "hiit" ? 15 : w.rest;
  for (let r = 0; r < rounds; r++) {
    const phase = `Runde ${r + 1}`;
    tpl.exs.forEach((id, i) => {
      const last = i === tpl.exs.length - 1;
      if (EXERCISES[id].sides) {
        blocks.push({ ex: id, work: Math.round(work / 2), rest: 5, phase, side: "rechts" });
        blocks.push({ ex: id, work: Math.round(work / 2), rest: last ? 0 : rest, phase, side: "links" });
      } else {
        blocks.push({ ex: id, work, rest: last ? 0 : rest, phase });
      }
    });
    if (r < rounds - 1) blocks[blocks.length - 1].rest = w.roundRest;
  }
  const seconds = blocks.reduce((s, b) => s + b.work + b.rest, 0);
  return { title: tpl.title, intro: tpl.intro, kind, blocks, minutes: Math.round(seconds / 60), week: weekIdx, day: dayIdx, weekLabel: w.label };
}

export function nextWorkoutTitle(wo: Workout): string {
  for (let i = 1; i <= 7; i++) {
    const d = (wo.day + i) % 7;
    const w = Math.min(wo.week + (wo.day + i >= 7 ? 1 : 0), WEEKS.length - 1);
    const t = buildWorkout(w, d);
    if (t.kind !== "rest" && t.kind !== "active") return `${DAY_NAMES[d]}, ${t.title}`;
  }
  return "siehe Plan";
}
