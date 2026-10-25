import { buildWorkout, DAY_NAMES, WEEKS, WEEK_PLAN, type Workout } from "@/data/program";
import { EXERCISES, type ExerciseId } from "@/data/exercises";
import { KNOWLEDGE } from "@/data/knowledge";
import { completedCount, currentWeek, isDone, streak, type AppState } from "@/lib/store";
import { todayISO, weekdayIdx } from "@/lib/utils";
import { ExerciseCard } from "./ExerciseCard";
import { Goals } from "./Goals";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onStart: (wo: Workout) => void;
  onOpenExercise: (id: ExerciseId) => void;
  toast: (msg: string) => void;
}

export function HomeView({ state, update, onStart, onOpenExercise, toast }: Props) {
  const w = currentWeek(state);
  const d = weekdayIdx(new Date());
  const wo = buildWorkout(w, d);
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";
  const done = isDone(state, w, d);
  const weekDone = WEEK_PLAN.filter((k, i) => k !== "rest" && isDone(state, w, i)).length;
  const weekTotal = WEEK_PLAN.filter((k) => k !== "rest").length;
  const exIds = [...new Set(wo.blocks.map((b) => b.ex))];
  const tip = KNOWLEDGE[new Date().getDate() % KNOWLEDGE.length];

  return (
    <section className="view">
      <header className="hero">
        <p className="eyebrow">{DAY_NAMES[d]} · Woche {w + 1} von {WEEKS.length} · {WEEKS[w].label}</p>
        <h1>{greet}! {wo.kind === "rest" ? "Heute ist Ruhetag." : "Bereit für heute?"}</h1>
      </header>

      {!state.startDate && (
        <div className="card accent">
          <p className="eyebrow">Los geht's</p>
          <h2>4 Wochen, 5 Einheiten pro Woche, 15 bis 25 Minuten</h2>
          <p>Kein Gerät nötig, nur eine Matte. Jede Übung hat ein Video und eine Sprachanleitung. Starte das Programm, dann zählt die Woche ab heute.</p>
          <button className="btn primary" onClick={() => { update((s) => ({ ...s, startDate: todayISO() })); toast("Programm gestartet"); }}>Programm starten</button>
        </div>
      )}

      <div className={`card ${wo.kind === "rest" ? "" : "accent"}`}>
        <p className="eyebrow">Heutige Einheit</p>
        <h2>{wo.title}</h2>
        <p>{wo.intro}</p>
        {wo.kind !== "rest" && <p className="muted small">{wo.minutes} Minuten · {wo.blocks.length} Blöcke · {exIds.length} Übungen</p>}
        {wo.kind !== "rest" && <button className="btn primary block" onClick={() => onStart(wo)}>{done ? "Nochmal trainieren" : "Training starten"}</button>}
        {done && <p className="small">✓ Heute bereits erledigt. Stark!</p>}
      </div>

      <div className="stats">
        <div className="stat"><div className="num">{weekDone}/{weekTotal}</div><div className="lbl">diese Woche</div></div>
        <div className="stat"><div className="num">{streak(state)}</div><div className="lbl">Tage in Folge</div></div>
        <div className="stat"><div className="num">{completedCount(state)}</div><div className="lbl">Einheiten gesamt</div></div>
      </div>

      <div className="card">
        <p className="eyebrow">Schwerpunkt dieser Woche</p>
        <h3>{WEEKS[w].label}</h3>
        <p className="small"><strong>Training:</strong> {WEEKS[w].focus}</p>
        <p className="small"><strong>Ernährung:</strong> {WEEKS[w].nutritionFocus}</p>
      </div>

      <Goals week={w} state={state} update={update} compact />

      {wo.kind !== "rest" && (
        <div className="card">
          <p className="eyebrow">Übungen heute</p>
          <div className="ex-grid">
            {exIds.map((id) => <ExerciseCard key={id} ex={EXERCISES[id]} onOpen={onOpenExercise} />)}
          </div>
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Tipp des Tages</p>
        <h3>{tip.title}</h3>
        <p className="small">{tip.text}</p>
      </div>
    </section>
  );
}
