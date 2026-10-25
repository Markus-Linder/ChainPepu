import { useState } from "react";
import { buildWorkout, DAY_NAMES, WEEKS, type Workout } from "@/data/program";
import { EXERCISES } from "@/data/exercises";
import { currentWeek, isDone, type AppState } from "@/lib/store";
import { dayKey, fmtDate, weekdayIdx } from "@/lib/utils";
import { Goals } from "./Goals";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onStart: (wo: Workout) => void;
}

export function PlanView({ state, update, onStart }: Props) {
  const cw = currentWeek(state);
  const [week, setWeek] = useState(cw);
  const [day, setDay] = useState<number | null>(null);
  const td = weekdayIdx(new Date());
  const wk = WEEKS[week];

  if (day !== null) {
    const wo = buildWorkout(week, day);
    const done = isDone(state, week, day);
    let phase = "";
    return (
      <section className="view">
        <button className="btn ghost" onClick={() => setDay(null)}>← Zurück zum Plan</button>
        <header className="hero">
          <p className="eyebrow">Woche {week + 1} · {DAY_NAMES[day]}</p>
          <h1>{wo.title}</h1>
          <p className="muted">{wo.intro}</p>
        </header>
        {wo.kind === "rest" ? (
          <div className="card">
            <h3>Vorschläge für heute</h3>
            <ul className="plain">
              <li>20 bis 30 Minuten lockerer Spaziergang</li>
              <li>5 Minuten Dehnen: Hüftbeuger, Rückseite der Oberschenkel, Brust</li>
              <li>Viel trinken, früh ins Bett</li>
            </ul>
          </div>
        ) : (
          <>
            <div className="card accent">
              <p className="muted small">{wo.minutes} Minuten · {wo.blocks.length} Blöcke</p>
              <button className="btn primary block" onClick={() => onStart(wo)}>Training starten</button>
              {done && <p className="small">✓ Erledigt am {fmtDate(state.completed[dayKey(week, day)])}</p>}
            </div>
            <div className="card">
              <p className="eyebrow">Ablauf</p>
              <div className="log">
                {wo.blocks.map((b, i) => {
                  const header = b.phase !== phase ? (phase = b.phase) : null;
                  return (
                    <div key={i}>
                      {header && <p className="eyebrow" style={{ marginTop: 8 }}>{header}</p>}
                      <div className="log-item">
                        <span>{EXERCISES[b.ex].name}{b.side ? ` (${b.side})` : ""}</span>
                        <span className="muted">{b.work} s{b.rest ? ` + ${b.rest} s Pause` : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {done && (
              <button className="btn ghost" onClick={() => update((s) => { const c = { ...s.completed }; delete c[dayKey(week, day)]; return { ...s, completed: c }; })}>
                Als nicht erledigt markieren
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="view">
      <header className="hero">
        <p className="eyebrow">4-Wochen-Programm</p>
        <h1>Dein Plan</h1>
        <p className="muted">Drei Zirkel, zwei Aktiv-Tage, ein kurzes Intervall, ein Ruhetag. Jede Woche wird etwas anspruchsvoller.</p>
      </header>
      <div className="week-nav" role="tablist">
        {WEEKS.map((w, i) => (
          <button key={i} className="chip" role="tab" aria-pressed={i === week} onClick={() => setWeek(i)}>Woche {i + 1} · {w.label}</button>
        ))}
      </div>
      <div className="card">
        <p className="eyebrow">Woche {week + 1}: {wk.label}</p>
        <p className="small">{wk.work} Sekunden Belastung, {wk.rest} Sekunden Pause, {wk.rounds} Runden pro Zirkel.</p>
        <p className="small"><strong>Training:</strong> {wk.focus}</p>
        <p className="small"><strong>Ernährung:</strong> {wk.nutritionFocus}</p>
      </div>
      <div className="days">
        {DAY_NAMES.map((name, d) => {
          const wo = buildWorkout(week, d);
          const done = isDone(state, week, d);
          return (
            <button key={d} className={`day ${done ? "done" : ""} ${week === cw && d === td ? "today" : ""}`} onClick={() => setDay(d)}>
              <span className="dn">{name.slice(0, 2)}</span>
              <span className="stack">
                <span className="dt">{wo.title}</span>
                <span className="dm">{wo.kind === "rest" ? "Erholung" : `${wo.minutes} Min · ${wo.blocks.length} Blöcke`}</span>
              </span>
              <span className="mark">{done ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <Goals week={week} state={state} update={update} />
    </section>
  );
}
