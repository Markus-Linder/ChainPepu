import { useCallback, useEffect, useState } from "react";
import { WEEKS, WEEK_PLAN } from "@/data/program";
import { todayISO, weekdayIdx, dayKey } from "./utils";
import type { Profile } from "@/data/nutrition";

export interface Measurement { date: string; waist: number | null; weight: number | null; note: string; }

export interface AppState {
  startDate: string | null;
  completed: Record<string, string>;   // "woche-tag" → ISO-Datum
  goals: Record<string, boolean>;      // "woche-index" → erledigt
  measurements: Measurement[];
  profile: Profile | null;
  settings: { voice: boolean; sound: boolean };
}

const KEY = "bauchfit-v2";

const DEFAULT: AppState = {
  startDate: null,
  completed: {},
  goals: {},
  measurements: [],
  profile: null,
  settings: { voice: true, sound: true },
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* privater Modus oder gesperrter Speicher */ }
  return DEFAULT;
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorieren */ }
  }, [state]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  return [state, update] as const;
}

/* Abgeleitete Werte */
export function currentWeek(state: AppState): number {
  if (!state.startDate) return 0;
  const start = new Date(state.startDate + "T12:00:00");
  const monday = new Date(start);
  monday.setDate(start.getDate() - weekdayIdx(start));
  const diff = Math.floor((Date.now() - monday.getTime()) / (7 * 24 * 3600 * 1000));
  return Math.max(0, Math.min(WEEKS.length - 1, diff));
}

export const isDone = (state: AppState, w: number, d: number) => !!state.completed[dayKey(w, d)];
export const completedCount = (state: AppState) => Object.keys(state.completed).length;

export function streak(state: AppState): number {
  const dates = new Set(Object.values(state.completed));
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rest = WEEK_PLAN[weekdayIdx(d)] === "rest";
    if (dates.has(iso)) n++;
    else if (!(rest && i > 0) && i !== 0) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function markDone(state: AppState, w: number, d: number): AppState {
  return { ...state, completed: { ...state.completed, [dayKey(w, d)]: todayISO() }, startDate: state.startDate ?? todayISO() };
}
