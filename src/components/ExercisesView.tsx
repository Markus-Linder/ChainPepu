import { useEffect, useState } from "react";
import { EXERCISES, EXERCISE_LIST, posterUrl, videoUrl, type ExerciseId } from "@/data/exercises";
import { exClip, isSpeaking, onVoiceState, say, stopVoice } from "@/lib/audio";
import { ExerciseCard } from "./ExerciseCard";

export function ExercisesView({ selected, onSelect }: { selected: ExerciseId | null; onSelect: (id: ExerciseId | null) => void }) {
  if (selected) return <ExerciseDetail id={selected} onBack={() => onSelect(null)} />;
  return (
    <section className="view">
      <header className="hero">
        <p className="eyebrow">Bibliothek</p>
        <h1>Alle Übungen</h1>
        <p className="muted">Tippe eine Übung an, um das Video, die Sprachanleitung und die Ausführung zu sehen.</p>
      </header>
      <div className="ex-grid">
        {EXERCISE_LIST.map((ex) => <ExerciseCard key={ex.id} ex={ex} onOpen={onSelect} />)}
      </div>
    </section>
  );
}

function ExerciseDetail({ id, onBack }: { id: ExerciseId; onBack: () => void }) {
  const ex = EXERCISES[id];
  const [speaking, setSpeaking] = useState(isSpeaking());
  useEffect(() => { const off = onVoiceState(setSpeaking); return () => { off(); stopVoice(); }; }, []);
  return (
    <section className="view">
      <button className="btn ghost" onClick={onBack}>← Alle Übungen</button>
      <header className="hero">
        <p className="eyebrow">{ex.muscles}</p>
        <h1>{ex.name}</h1>
        <p className="muted">{ex.summary}</p>
      </header>
      <div className="video-box">
        <video src={videoUrl(ex.id)} poster={posterUrl(ex.id)} autoPlay muted loop playsInline preload="metadata" />
        <span className="badge">Video-Anleitung</span>
      </div>
      <button className="btn primary block" onClick={() => (speaking ? stopVoice() : say([exClip(ex.id, "anleitung")]))}>
        {speaking ? "■ Stopp" : "▶ Anleitung anhören"}
      </button>
      <div className="card">
        <p className="eyebrow">So geht's</p>
        <ol className="steps">{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>
      <div className="card">
        <p className="eyebrow">Häufige Fehler</p>
        <ul className="plain">{ex.mistakes.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
      <div className="card">
        <div className="stack"><span className="pill">Leichter</span><p className="small">{ex.easier}</p></div>
        <div className="stack"><span className="pill warm">Schwerer</span><p className="small">{ex.harder}</p></div>
      </div>
    </section>
  );
}
