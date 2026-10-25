import { useCallback, useEffect, useState } from "react";
import { TabBar, type View } from "@/components/TabBar";
import { HomeView } from "@/components/HomeView";
import { PlanView } from "@/components/PlanView";
import { ExercisesView } from "@/components/ExercisesView";
import { NutritionView } from "@/components/NutritionView";
import { ProgressView } from "@/components/ProgressView";
import { KnowledgeView } from "@/components/KnowledgeView";
import { Player } from "@/components/Player";
import { markDone, useAppState } from "@/lib/store";
import type { Workout } from "@/data/program";
import type { ExerciseId } from "@/data/exercises";

export default function App() {
  const [state, update] = useAppState();
  const [view, setView] = useState<View>("home");
  const [exercise, setExercise] = useState<ExerciseId | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2200); }, []);
  const go = (v: View) => { setView(v); setExercise(null); window.scrollTo({ top: 0 }); };
  const openExercise = (id: ExerciseId) => { setView("exercises"); setExercise(id); window.scrollTo({ top: 0 }); };
  const onFinish = useCallback((wo: Workout) => update((s) => markDone(s, wo.week, wo.day)), [update]);

  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !location.hostname.includes("localhost")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <main className="app" aria-live="polite">
        {view === "home" && <HomeView state={state} update={update} onStart={setWorkout} onOpenExercise={openExercise} toast={toast} />}
        {view === "plan" && <PlanView state={state} update={update} onStart={setWorkout} />}
        {view === "exercises" && <ExercisesView selected={exercise} onSelect={setExercise} />}
        {view === "nutrition" && <NutritionView state={state} update={update} />}
        {view === "progress" && <ProgressView state={state} update={update} toast={toast} />}
        {view === "knowledge" && <KnowledgeView />}
      </main>
      <TabBar view={view} onChange={go} />
      {workout && <Player wo={workout} settings={state.settings} onFinish={onFinish} onClose={() => { setWorkout(null); setView("home"); }} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );
}
