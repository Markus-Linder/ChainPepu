import { WEEK_GOALS } from "@/data/program";
import type { AppState } from "@/lib/store";

export function Goals({ week, state, update, compact }: { week: number; state: AppState; update: (fn: (s: AppState) => AppState) => void; compact?: boolean }) {
  const goals = WEEK_GOALS[week] ?? [];
  const done = goals.filter((_, i) => state.goals[`${week}-${i}`]).length;
  return (
    <div className="card">
      <div className="row spread">
        <p className="eyebrow">Wochenziele · Woche {week + 1}</p>
        <span className="pill">{done}/{goals.length}</span>
      </div>
      <div>
        {goals.map((g, i) => {
          const key = `${week}-${i}`;
          const checked = !!state.goals[key];
          return (
            <label key={key} className={`goal ${checked ? "done" : ""}`}>
              <input type="checkbox" id={`goal-${key}`} checked={checked} onChange={(e) => update((s) => ({ ...s, goals: { ...s.goals, [key]: e.target.checked } }))} />
              <span>{g}</span>
            </label>
          );
        })}
      </div>
      {!compact && done === goals.length && goals.length > 0 && <p className="small">Alle Ziele der Woche geschafft. Stark!</p>}
    </div>
  );
}
