import { useCallback, useEffect, useRef, useState } from "react";
import { EXERCISES, posterUrl, videoUrl, type ExerciseId } from "@/data/exercises";
import { nextWorkoutTitle, type Workout } from "@/data/program";
import { beep, CLIPS, exClip, say, stopVoice, type Clip } from "@/lib/audio";
import { fmtTime } from "@/lib/utils";

interface Step { kind: "prep" | "work" | "rest"; secs: number; ex: ExerciseId; side?: "rechts" | "links"; nextSide?: "rechts" | "links"; phase?: string; idx: number; }

interface Props { wo: Workout; settings: { voice: boolean; sound: boolean }; onFinish: (wo: Workout) => void; onClose: () => void; }

function buildSteps(wo: Workout): Step[] {
  const steps: Step[] = [{ kind: "prep", secs: 8, ex: wo.blocks[0].ex, idx: -1 }];
  wo.blocks.forEach((b, i) => {
    steps.push({ kind: "work", secs: b.work, ex: b.ex, side: b.side, phase: b.phase, idx: i });
    if (b.rest) {
      const nxt = wo.blocks[i + 1] ?? b;
      steps.push({ kind: "rest", secs: b.rest, ex: nxt.ex, nextSide: nxt.side, phase: b.phase, idx: i });
    }
  });
  return steps;
}

export function Player({ wo, settings, onFinish, onClose }: Props) {
  const steps = useRef(buildSteps(wo)).current;
  const total = useRef(steps.reduce((s, x) => s + x.secs, 0)).current;
  const [i, setI] = useState(0);
  const [remaining, setRemaining] = useState(steps[0].secs);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [cue, setCue] = useState("");
  const [armed, setArmed] = useState(false);
  const cueIdx = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const st = steps[i];
  const ex = EXERCISES[st.ex];
  const workSteps = steps.filter((s) => s.kind === "work");
  const workNo = steps.slice(0, i + 1).filter((s) => s.kind === "work").length;
  const voice = useCallback((clips: Clip[]) => { if (settings.voice) say(clips); }, [settings.voice]);
  const tone = useCallback((f: number, ms: number, v?: number) => { if (settings.sound) beep(f, ms, v); }, [settings.sound]);

  /* Bildschirm wach halten, Scrollen der Seite sperren */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { wakeLock.current = l; }).catch(() => {});
    tone(660, 120);
    return () => { document.body.style.overflow = ""; wakeLock.current?.release().catch(() => {}); stopVoice(); };
  }, [tone]);

  /* Ansage beim Schrittwechsel */
  useEffect(() => {
    if (finished) return;
    const prev = steps[i - 1];
    const clips: Clip[] = [];
    if (st.kind === "work") {
      const blocks = wo.blocks;
      const lastPhase = blocks[blocks.length - 1].phase;
      const lastRoundStart = st.phase === lastPhase && st.idx === blocks.findIndex((b) => b.phase === st.phase) && blocks.some((b) => /^Runde/.test(b.phase) && b.phase !== lastPhase);
      const half = workNo === Math.floor(workSteps.length / 2) + 1 && workSteps.length >= 8;
      const previewed = prev?.kind === "rest" && prev.ex === st.ex;
      const sideSwitch = st.side === "links" && prev?.kind === "rest" && prev.nextSide === "links" && prev.ex === st.ex;
      if (lastRoundStart) clips.push(CLIPS.lastround); else if (half) clips.push(CLIPS.half);
      if (!previewed && !sideSwitch) clips.push(exClip(st.ex, "kurz"));
      setCue(ex.steps[0]);
    } else if (st.kind === "rest") {
      const sideSwitch = st.nextSide === "links" && prev?.ex === st.ex;
      if (sideSwitch) clips.push(CLIPS.switch); else clips.push(CLIPS.pause, CLIPS.next, exClip(st.ex, "kurz"));
      setCue(ex.summary);
    } else {
      clips.push(CLIPS.ready, CLIPS.next, exClip(st.ex, "kurz"));
      setCue(ex.summary);
    }
    cueIdx.current = 0;
    voice(clips);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  /* Sekundentakt */
  useEffect(() => {
    if (paused || finished) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        setElapsed((e) => e + 1);
        if (next > 0 && next <= 3) tone(880, 90, 0.12);
        if (st.kind === "work" && next > 0 && next % 10 === 0 && st.secs - next >= 10) {
          setCue(ex.steps[(++cueIdx.current) % ex.steps.length]);
          if (next === 10 && st.secs >= 25) voice([CLIPS.ten]);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paused, finished, st, ex, tone, voice]);

  /* Schrittende */
  useEffect(() => {
    if (remaining > 0 || finished) return;
    if (i + 1 >= steps.length) {
      setFinished(true);
      tone(880, 150); setTimeout(() => tone(1175, 300, 0.2), 180);
      voice([CLIPS.done]);
      onFinish(wo);
      return;
    }
    const nxt = steps[i + 1];
    tone(nxt.kind === "work" ? 990 : 520, 220, 0.2);
    setI(i + 1); setRemaining(nxt.secs);
  }, [remaining, finished, i, steps, tone, voice, onFinish, wo]);

  function skip() { setElapsed((e) => e + remaining); setRemaining(0); }
  function back() {
    if (remaining < st.secs - 2) { setElapsed((e) => e - (st.secs - remaining)); setRemaining(st.secs); return; }
    if (i === 0) return;
    const p = steps[i - 1];
    setElapsed((e) => e - (st.secs - remaining) - p.secs);
    setI(i - 1); setRemaining(p.secs);
  }
  function togglePause() {
    setPaused((p) => { const v = videoRef.current; if (!p) v?.pause(); else v?.play().catch(() => {}); return !p; });
  }
  function close() {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    onClose();
  }

  if (finished) {
    return (
      <div className="player">
        <div className="player-inner">
          <div className="finish">
            <p className="eyebrow">Einheit abgeschlossen</p>
            <div className="big">Geschafft!</div>
            <p>{wo.title} · {wo.minutes} Minuten · Woche {wo.week + 1}</p>
            <p className="muted small">Jetzt ein Glas Wasser und etwas Eiweiß. Nächste Einheit: {nextWorkoutTitle(wo)}.</p>
            <button className="btn primary" onClick={onClose}>Fertig</button>
          </div>
        </div>
      </div>
    );
  }

  const title = st.kind === "work" ? ex.name + (st.side ? ` · ${st.side}` : "") : st.kind === "rest" ? "Pause" : "Gleich geht es los";
  const sub = st.kind === "work" ? st.phase ?? "" : `Als Nächstes: ${ex.name}${st.nextSide ? ` · ${st.nextSide}` : ""}`;
  const nxt = steps[i + 1];

  return (
    <div className={`player ${st.kind !== "work" ? "resting" : ""}`} role="dialog" aria-label="Training">
      <div className="player-inner">
        <div className="player-top">
          <button className={`btn ghost ${armed ? "warm" : ""}`} onClick={close}>{armed ? "Wirklich beenden?" : "✕ Beenden"}</button>
          <span className="small muted">{workNo}/{workSteps.length} · noch {fmtTime(Math.max(0, total - elapsed))}</span>
        </div>
        <div className="progress"><div style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} /></div>
        <div className="video-box">
          <video ref={videoRef} key={st.ex} src={videoUrl(st.ex)} poster={posterUrl(st.ex)} autoPlay muted loop playsInline preload="auto" />
          <span className="badge">{st.kind === "work" ? "Jetzt" : "Vorschau"}</span>
        </div>
        <p className="phase">{st.kind === "work" ? "Belastung" : st.kind === "rest" ? "Pause" : "Vorbereitung"}{sub ? ` · ${sub}` : ""}</p>
        <h2 style={{ textAlign: "center" }}>{title}</h2>
        <div className="timer">{fmtTime(remaining)}</div>
        <div className="cue">{cue}</div>
        <div className="player-controls">
          <button className="btn" onClick={back} aria-label="Zurück">⟲</button>
          <button className="btn primary" onClick={togglePause}>{paused ? "Weiter" : "Pause"}</button>
          <button className="btn" onClick={skip} aria-label="Überspringen">⟶</button>
        </div>
        <p className="next">{nxt ? `Danach: ${nxt.kind === "rest" ? `Pause ${nxt.secs} s` : `${EXERCISES[nxt.ex].name} ${nxt.secs} s`}` : "Letzter Block"}</p>
      </div>
    </div>
  );
}
