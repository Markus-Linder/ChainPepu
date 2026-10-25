import { useState } from "react";
import { ACTIVITY_LEVELS, MEAL_LABELS, MEAL_PLAN, NUTRITION_RULES, PLAN_BASE_KCAL, SHOPPING_LIST, calcTargets, type DayMeals, type Profile } from "@/data/nutrition";
import { DAY_NAMES, WEEKS } from "@/data/program";
import { currentWeek, type AppState } from "@/lib/store";
import { weekdayIdx } from "@/lib/utils";

interface Props { state: AppState; update: (fn: (s: AppState) => AppState) => void; }

const MEAL_KEYS: (keyof DayMeals)[] = ["breakfast", "lunch", "snack", "dinner"];

export function NutritionView({ state, update }: Props) {
  const week = currentWeek(state);
  const [day, setDay] = useState(weekdayIdx(new Date()));
  const [form, setForm] = useState<Profile>(state.profile ?? { weight: 70, height: 168, age: 35, activity: 1.45 });
  const targets = state.profile ? calcTargets(state.profile) : null;
  const factor = targets ? targets.target / PLAN_BASE_KCAL : 1;
  const meals = MEAL_PLAN[day];
  const dayKcal = MEAL_KEYS.reduce((s, k) => s + meals[k].kcal, 0);
  const dayProtein = MEAL_KEYS.reduce((s, k) => s + meals[k].protein, 0);
  const scale = (v: number) => Math.round(v * factor / 10) * 10;

  return (
    <section className="view">
      <header className="hero">
        <p className="eyebrow">Ernährungsplan</p>
        <h1>So isst du den Bauch weg</h1>
        <p className="muted">Ein moderates Defizit, viel Eiweiß, viel Gemüse. Kein Verzicht auf ganze Lebensmittelgruppen.</p>
      </header>

      <div className="card accent">
        <p className="eyebrow">Fokus Woche {week + 1}</p>
        <h3>{WEEKS[week].nutritionFocus}</h3>
      </div>

      <div className="card">
        <p className="eyebrow">Dein Kalorienziel</p>
        {targets ? (
          <>
            <div className="stats">
              <div className="stat"><div className="num">{targets.target}</div><div className="lbl">kcal pro Tag</div></div>
              <div className="stat"><div className="num">{targets.protein} g</div><div className="lbl">Eiweiß pro Tag</div></div>
              <div className="stat"><div className="num">{targets.water} l</div><div className="lbl">Wasser pro Tag</div></div>
            </div>
            <p className="small muted">Grundumsatz {targets.bmr} kcal, Verbrauch etwa {targets.tdee} kcal. Das Ziel liegt 400 kcal darunter, das entspricht rund 0,4 kg pro Woche. Der Plan unten ist auf dein Ziel skaliert.</p>
            <button className="btn ghost" onClick={() => update((s) => ({ ...s, profile: null }))}>Werte ändern</button>
          </>
        ) : (
          <form className="measure" onSubmit={(e) => { e.preventDefault(); update((s) => ({ ...s, profile: form })); }}>
            <label>Gewicht (kg)<input type="number" id="p-weight" min={35} max={250} value={form.weight} onChange={(e) => setForm({ ...form, weight: +e.target.value })} required /></label>
            <label>Größe (cm)<input type="number" id="p-height" min={130} max={220} value={form.height} onChange={(e) => setForm({ ...form, height: +e.target.value })} required /></label>
            <label>Alter<input type="number" id="p-age" min={16} max={90} value={form.age} onChange={(e) => setForm({ ...form, age: +e.target.value })} required /></label>
            <label className="field">Alltag
              <select id="p-activity" value={form.activity} onChange={(e) => setForm({ ...form, activity: +e.target.value })}>
                {ACTIVITY_LEVELS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            <button className="btn primary" type="submit">Ziel berechnen</button>
          </form>
        )}
      </div>

      <div className="week-nav" role="tablist">
        {DAY_NAMES.map((n, i) => <button key={i} className="chip" role="tab" aria-pressed={i === day} onClick={() => setDay(i)}>{n.slice(0, 2)}</button>)}
      </div>
      <div className="card">
        <div className="row spread">
          <p className="eyebrow">{DAY_NAMES[day]}</p>
          <span className="pill">{scale(dayKcal)} kcal · {Math.round(dayProtein * factor)} g Eiweiß</span>
        </div>
        <div>
          {MEAL_KEYS.map((k) => (
            <div className="meal" key={k}>
              <span className="ml">{MEAL_LABELS[k]}</span>
              <span>
                <span className="mn">{meals[k].name}</span>
                <br /><span className="md">{meals[k].detail}</span>
              </span>
              <span className="mk">{scale(meals[k].kcal)} kcal<br />{Math.round(meals[k].protein * factor)} g EW</span>
            </div>
          ))}
        </div>
        {factor !== 1 && <p className="small muted">Mengen um {Math.round((factor - 1) * 100)} % {factor > 1 ? "erhöhen" : "verringern"}, vor allem bei Beilagen und Fetten. Eiweißportionen bleiben gleich.</p>}
      </div>

      <div className="card">
        <p className="eyebrow">Die 6 Grundregeln</p>
        {NUTRITION_RULES.map((r) => <div className="stack" key={r.title}><strong>{r.title}</strong><p className="small muted">{r.text}</p></div>)}
      </div>

      <details className="faq">
        <summary>Einkaufsliste für die Woche</summary>
        {SHOPPING_LIST.map((g) => (
          <div className="stack" key={g.group} style={{ marginBottom: 10 }}>
            <span className="pill">{g.group}</span>
            <ul className="plain small">{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </details>
    </section>
  );
}
