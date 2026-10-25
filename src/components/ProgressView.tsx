import { useState, type FormEvent } from "react";
import { buildWorkout } from "@/data/program";
import { completedCount, type AppState } from "@/lib/store";
import { fmtDate, todayISO } from "@/lib/utils";
import { ChartCard } from "./Chart";

interface Props { state: AppState; update: (fn: (s: AppState) => AppState) => void; toast: (m: string) => void; }

export function ProgressView({ state, update, toast }: Props) {
  const [date, setDate] = useState(todayISO());
  const [waist, setWaist] = useState("");
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const wa = parseFloat(waist.replace(",", ".")), we = parseFloat(weight.replace(",", "."));
    if (isNaN(wa) && isNaN(we)) { toast("Bitte Taille oder Gewicht eintragen"); return; }
    update((s) => {
      const list = s.measurements.filter((m) => m.date !== date);
      list.push({ date, waist: isNaN(wa) ? null : wa, weight: isNaN(we) ? null : we, note: note.trim() });
      list.sort((a, b) => a.date.localeCompare(b.date));
      return { ...s, measurements: list };
    });
    setWaist(""); setWeight(""); setNote("");
    toast("Gespeichert");
  }

  const ms = state.measurements;
  const waistPts = ms.filter((m) => m.waist != null).map((m) => ({ x: m.date, y: m.waist as number }));
  const weightPts = ms.filter((m) => m.weight != null).map((m) => ({ x: m.date, y: m.weight as number }));
  const first = ms[0], last = ms[ms.length - 1];
  const dw = first?.waist != null && last?.waist != null ? last.waist - first.waist : null;
  const dg = first?.weight != null && last?.weight != null ? last.weight - first.weight : null;
  const fmtDelta = (v: number | null) => (v == null ? "–" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`);
  const history = Object.entries(state.completed).sort((a, b) => b[1].localeCompare(a[1]));

  return (
    <section className="view">
      <header className="hero">
        <p className="eyebrow">Messen statt raten</p>
        <h1>Fortschritt</h1>
        <p className="muted">Einmal pro Woche morgens vor dem Frühstück messen. Der Taillenumfang sagt mehr als die Waage.</p>
      </header>

      <form className="measure card" onSubmit={submit}>
        <label>Datum<input type="date" id="m-date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label>Taille (cm)<input type="text" inputMode="decimal" id="m-waist" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="z. B. 84" /></label>
        <label>Gewicht (kg)<input type="text" inputMode="decimal" id="m-weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="z. B. 68,5" /></label>
        <label>Notiz<input type="text" id="m-note" maxLength={60} value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" /></label>
        <button className="btn primary" type="submit">Eintragen</button>
      </form>

      {waistPts.length >= 2 && <ChartCard title="Taillenumfang" pts={waistPts} unit="cm" />}
      {weightPts.length >= 2 && <ChartCard title="Gewicht" pts={weightPts} unit="kg" />}

      {ms.length ? (
        <>
          <div className="stats">
            <div className="stat"><div className="num">{fmtDelta(dw)}</div><div className="lbl">cm Taille seit Start</div></div>
            <div className="stat"><div className="num">{fmtDelta(dg)}</div><div className="lbl">kg seit Start</div></div>
            <div className="stat"><div className="num">{completedCount(state)}</div><div className="lbl">Einheiten</div></div>
          </div>
          <div className="card">
            <p className="eyebrow">Einträge</p>
            <div className="log">
              {[...ms].reverse().map((m) => (
                <div className="log-item" key={m.date}>
                  <span>{fmtDate(m.date)} {m.note && <span className="muted">· {m.note}</span>}</span>
                  <span>
                    {m.waist != null ? `${m.waist} cm` : ""}{m.waist != null && m.weight != null ? " · " : ""}{m.weight != null ? `${m.weight} kg` : ""}
                    {" "}
                    <button className="btn ghost small" style={{ minHeight: 0, padding: "2px 8px" }} aria-label="Eintrag löschen" onClick={() => update((s) => ({ ...s, measurements: s.measurements.filter((x) => x.date !== m.date) }))}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card"><p className="muted">Noch keine Einträge. Trag heute deinen ersten Messwert ein, dann siehst du hier die Entwicklung.</p></div>
      )}

      <div className="card">
        <p className="eyebrow">Trainingsverlauf</p>
        <div className="log">
          {!history.length && <p className="muted small">Noch kein Training abgeschlossen.</p>}
          {history.slice(0, 20).map(([k, date]) => {
            const [w, d] = k.split("-").map(Number);
            return <div className="log-item" key={k}><span>{buildWorkout(w, d).title}</span><span className="muted">Woche {w + 1} · {fmtDate(date)}</span></div>;
          })}
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Einstellungen</p>
        <label className="row"><input type="checkbox" id="s-voice" checked={state.settings.voice} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, voice: e.target.checked } }))} /> Sprachansagen der Trainerin</label>
        <label className="row"><input type="checkbox" id="s-sound" checked={state.settings.sound} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, sound: e.target.checked } }))} /> Signaltöne</label>
        <button className={`btn ghost ${armed ? "warm" : ""}`} onClick={() => {
          if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
          update((s) => ({ ...s, startDate: null, completed: {}, goals: {} })); setArmed(false); toast("Zurückgesetzt");
        }}>{armed ? "Wirklich zurücksetzen? Nochmal tippen" : "Programm zurücksetzen"}</button>
      </div>
    </section>
  );
}
