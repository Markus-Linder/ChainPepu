/* Stamina Coach – alles lokal, keine Server, keine Tracker. */
(() => {
  'use strict';

  // ---------- Storage ----------
  const KEY = 'staminaCoach.v1';
  const defaults = {
    adult: false,
    settings: { vibrate: true, sound: true, wakelock: true, pauseSec: 30,
                kegelHold: 5, kegelRest: 5, kegelReps: 10, kegelSets: 3 },
    sessions: [],   // {ts, active, total, edges, pauses, finished}
    kegels: [],     // {ts, reps}
  };
  let db = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return deepMerge(structuredClone(defaults), JSON.parse(raw)); } catch (e) {}
    return structuredClone(defaults);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = deepMerge(a[k] || {}, b[k]); else a[k] = b[k]; } return a; }

  // ---------- Levels ----------
  // Ziel = aktive Zeit (Sekunden) in einer Session, mind. Stopps.
  const LEVELS = [
    { name: 'Level 1 · Einstieg',   time: 5 * 60,  edges: 2 },
    { name: 'Level 2 · Basis',      time: 8 * 60,  edges: 3 },
    { name: 'Level 3 · Aufbau',     time: 10 * 60, edges: 4 },
    { name: 'Level 4 · Kontrolle',  time: 15 * 60, edges: 5 },
    { name: 'Level 5 · Ausdauer',   time: 20 * 60, edges: 6 },
    { name: 'Level 6 · Fortgeschritten', time: 25 * 60, edges: 7 },
    { name: 'Level 7 · Meister',    time: 30 * 60, edges: 8 },
  ];
  function levelIndex() {
    // Level steigt, wenn das Ziel in 2 Sessions erreicht wurde.
    let lvl = 0;
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const hits = db.sessions.filter(s => s.active >= LEVELS[i].time && s.edges >= LEVELS[i].edges).length;
      if (hits >= 2) lvl = i + 1; else break;
    }
    return lvl;
  }
  function levelHits(i) { return Math.min(2, db.sessions.filter(s => s.active >= LEVELS[i].time && s.edges >= LEVELS[i].edges).length); }

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const k = (name, root) => root.querySelector(`[data-k="${name}"]`);
  const fmt = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return `${m}:${r.toString().padStart(2, '0')}`; };
  const today = ts => new Date(ts).toDateString();

  function streak() {
    const days = new Set(db.sessions.map(s => today(s.ts)).concat(db.kegels.map(s => today(s.ts))));
    let n = 0; const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // Signale
  let audioCtx = null;
  function beep(freq = 660, ms = 120, vol = 0.08) {
    if (!db.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'sine'; g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + ms / 1000);
    } catch (e) {}
  }
  function buzz(p = 60) { if (db.settings.vibrate && navigator.vibrate) navigator.vibrate(p); }
  function signal(kind) {
    if (kind === 'edge') { beep(440, 200); buzz([80, 60, 80]); }
    else if (kind === 'go') { beep(880, 120); buzz(50); }
    else if (kind === 'tick') { beep(520, 60, 0.04); }
    else if (kind === 'done') { beep(660, 120); setTimeout(() => beep(990, 200), 140); buzz([60, 40, 120]); }
  }

  // Wake Lock
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && db.settings.wakelock && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }

  // ---------- Router ----------
  const view = $('#view');
  let current = 'home';
  const timers = { cleanup: null };
  function go(tab) {
    if (timers.cleanup) { timers.cleanup(); timers.cleanup = null; }
    current = tab;
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    view.innerHTML = '';
    view.appendChild($(`#tpl-${tab}`).content.cloneNode(true));
    ({ home: renderHome, train: renderTrain, kegel: renderKegel, breath: renderBreath, stats: renderStats })[tab]();
    $('#level-badge').textContent = `Level ${levelIndex() + 1}`;
    window.scrollTo(0, 0);
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.tab)));
  view.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

  // ---------- Home ----------
  function renderHome() {
    const r = view;
    k('streak', r).textContent = streak();
    k('best', r).textContent = fmt(Math.max(0, ...db.sessions.map(s => s.active)));
    k('sessions', r).textContent = db.sessions.length;

    const L = LEVELS[levelIndex()];
    const didTrain = db.sessions.some(s => today(s.ts) === today(Date.now()));
    const didKegel = db.kegels.some(s => today(s.ts) === today(Date.now()));
    k('plan', r).innerHTML = [
      [`Stop-Start-Session · Ziel ${fmt(L.time)}, ${L.edges} Stopps`, didTrain],
      [`Beckenboden · ${db.settings.kegelSets} Sätze × ${db.settings.kegelReps}`, didKegel],
      ['Atemübung · 2 Minuten', false],
    ].map(([t, d]) => `<li class="${d ? 'done' : ''}"><span>${t}</span><span>${d ? '✓' : ''}</span></li>`).join('');

    $$('[data-set]', r).forEach(inp => {
      const key = inp.dataset.set;
      if (inp.type === 'checkbox') inp.checked = !!db.settings[key]; else inp.value = db.settings[key];
      inp.addEventListener('change', () => {
        db.settings[key] = inp.type === 'checkbox' ? inp.checked : Number(inp.value) || db.settings[key];
        save();
      });
    });
    $('[data-action="reset"]', r).addEventListener('click', () => {
      if (confirm('Wirklich alle Sessions, Statistiken und Einstellungen löschen?')) {
        db = structuredClone(defaults); db.adult = true; save(); go('home');
      }
    });
  }

  // ---------- Trainer (Stop-Start) ----------
  function renderTrain() {
    const r = view, card = $('.trainer', r);
    const L = LEVELS[levelIndex()];
    k('goalTime', r).textContent = fmt(L.time);
    k('goalEdges', r).textContent = L.edges;

    const S = { state: 'idle', active: 0, total: 0, edges: 0, pauses: 0, pauseLeft: 0, last: 0, raf: 0, arousal: 0 };
    const btn = a => $(`[data-action="${a}"]`, r);
    const ringLen = 553;

    function show(...actions) {
      ['start', 'edge', 'resume', 'finish', 'abort'].forEach(a => btn(a).classList.toggle('hidden', !actions.includes(a)));
    }
    function paint() {
      card.dataset.state = S.state;
      k('time', r).textContent = S.state === 'paused' ? fmt(S.pauseLeft) : fmt(S.active);
      k('sub', r).textContent = S.state === 'paused' ? 'Pause – runterkommen' : 'Aktive Zeit';
      k('phase', r).textContent = { idle: 'Bereit', active: 'Aktiv', paused: 'Pause' }[S.state];
      k('edges', r).textContent = S.edges;
      k('pauses', r).textContent = S.pauses;
      k('total', r).textContent = fmt(S.total);
      const p = S.state === 'paused' ? 1 - S.pauseLeft / db.settings.pauseSec : Math.min(1, S.active / L.time);
      k('ringFg', r).style.strokeDashoffset = ringLen * (1 - p);
    }
    function loop(now) {
      const dt = (now - S.last) / 1000; S.last = now;
      if (S.state === 'active') { S.active += dt; S.total += dt;
        if (Math.floor(S.active) % 60 === 0 && Math.floor(S.active) !== S._lastMin && S.active >= 60) { S._lastMin = Math.floor(S.active); signal('tick'); }
      }
      else if (S.state === 'paused') { S.total += dt; S.pauseLeft -= dt;
        if (S.pauseLeft <= 0) { S.pauseLeft = 0; signal('go'); hint('Pause vorbei. Wenn die Erregung unter 4 ist: weiter.'); }
      }
      paint();
      if (S.state !== 'idle' && S.state !== 'done') S.raf = requestAnimationFrame(loop);
    }
    function hint(t, hot = false) { const h = k('hint', r); h.textContent = t; h.classList.toggle('hot', hot); }

    const slider = k('arousalSlider', r);
    slider.addEventListener('input', () => {
      S.arousal = Number(slider.value); k('arousal', r).textContent = S.arousal;
      if (S.state === 'active') {
        if (S.arousal >= 8) { hint('Jetzt stoppen! Nicht weiter.', true); buzz(40); }
        else if (S.arousal >= 6) hint('Gute Zone. Langsamer werden, Atmung kontrollieren.');
        else if (S.arousal >= 3) hint('Entspannt steigern.');
        else hint('Du kannst das Tempo erhöhen.');
      } else if (S.state === 'paused') {
        hint(S.arousal <= 3 ? 'Erregung gesunken – du kannst weitermachen.' : 'Weiter atmen, bis du unter 4 bist.');
      }
    });

    btn('start').addEventListener('click', () => {
      S.state = 'active'; S.last = performance.now(); S.raf = requestAnimationFrame(loop);
      show('edge', 'finish', 'abort'); keepAwake(true); signal('go'); hint('Langsam anfangen. Beobachte deine Erregung ehrlich.');
    });
    btn('edge').addEventListener('click', () => {
      S.state = 'paused'; S.edges++; S.pauses++; S.pauseLeft = db.settings.pauseSec;
      show('resume', 'finish', 'abort'); signal('edge');
      hint('Alles loslassen. Beckenboden lockern, tief in den Bauch atmen.');
      if (slider.value > 5) { slider.value = 5; S.arousal = 5; k('arousal', r).textContent = 5; }
    });
    btn('resume').addEventListener('click', () => {
      S.state = 'active'; show('edge', 'finish', 'abort'); signal('go'); hint('Weiter. Ruhig und kontrolliert.');
    });
    btn('abort').addEventListener('click', () => { if (S.total < 30 || confirm('Session abbrechen? Sie wird nicht gespeichert.')) stop(false); });
    btn('finish').addEventListener('click', () => stop(true));
    btn('again').addEventListener('click', () => go('train'));

    function stop(saveIt) {
      cancelAnimationFrame(S.raf); S.state = 'done'; keepAwake(false);
      if (saveIt && S.total >= 20) {
        const rec = { ts: Date.now(), active: Math.round(S.active), total: Math.round(S.total), edges: S.edges, pauses: S.pauses };
        db.sessions.push(rec); save(); signal('done');
        const hitTime = rec.active >= L.time, hitEdges = rec.edges >= L.edges;
        const oldLvl = LEVELS.indexOf(L), newLvl = levelIndex();
        k('resultGrid', r).innerHTML = [
          [fmt(rec.active), 'Aktive Zeit'], [fmt(rec.total), 'Gesamt'], [rec.edges, 'Stopps'], [`Level ${newLvl + 1}`, 'Dein Level'],
        ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
        k('resultMsg', r).textContent = hitTime && hitEdges
          ? `Ziel erreicht! ${newLvl > oldLvl ? 'Nächstes Level freigeschaltet.' : oldLvl === LEVELS.length - 1 ? 'Du bist auf dem höchsten Level – stark.' : 'Noch einmal schaffen, dann geht es ins nächste Level.'}`
          : !hitTime ? `Noch ${fmt(L.time - rec.active)} bis zum Zeitziel – stopp früher, dann hältst du länger durch.`
          : `Zeit geschafft, aber nur ${rec.edges} von ${L.edges} Stopps. Nächstes Mal früher pausieren.`;
        card.classList.add('hidden'); k('result', r).classList.remove('hidden');
        $('#level-badge').textContent = `Level ${newLvl + 1}`;
      } else {
        go('train');
      }
    }
    timers.cleanup = () => { cancelAnimationFrame(S.raf); keepAwake(false); };
    show('start'); paint();
  }

  // ---------- Kegel ----------
  function renderKegel() {
    const r = view, card = $('.kegel', r);
    $$('[data-set]', r).forEach(inp => {
      inp.value = db.settings[inp.dataset.set];
      inp.addEventListener('change', () => { db.settings[inp.dataset.set] = Number(inp.value) || db.settings[inp.dataset.set]; save(); paintOpts(); });
    });
    function paintOpts() { k('reps', r).textContent = db.settings.kegelReps; k('sets', r).textContent = db.settings.kegelSets; }
    paintOpts();

    let t = null, rep = 0, set = 1, phase = 'idle', left = 0, totalReps = 0;
    const start = $('[data-action="kstart"]', r), stop = $('[data-action="kstop"]', r);
    function paint() {
      card.dataset.state = phase;
      k('phase', r).textContent = { idle: 'Bereit', prep: 'Gleich geht\'s los', hold: 'ANSPANNEN', rest: 'Lockern', setrest: 'Satzpause', done: 'Fertig ✅' }[phase];
      k('count', r).textContent = phase === 'idle' || phase === 'done' ? '–' : left;
      k('rep', r).textContent = rep; k('set', r).textContent = set;
    }
    function next() {
      const s = db.settings;
      if (phase === 'prep' || phase === 'rest' || phase === 'setrest') {
        if (phase === 'rest' && rep >= s.kegelReps) {
          if (set >= s.kegelSets) return finish();
          set++; rep = 0; phase = 'setrest'; left = 20; signal('go'); return;
        }
        rep++; totalReps++; phase = 'hold'; left = s.kegelHold; signal('edge');
      } else if (phase === 'hold') { phase = 'rest'; left = s.kegelRest; signal('go'); }
    }
    function tick() {
      left--;
      if (left <= 0) next();
      paint();
    }
    function finish() {
      clearInterval(t); t = null; phase = 'done'; paint(); signal('done'); keepAwake(false);
      db.kegels.push({ ts: Date.now(), reps: totalReps }); save();
      start.classList.remove('hidden'); stop.classList.add('hidden');
    }
    start.addEventListener('click', () => {
      rep = 0; set = 1; totalReps = 0; phase = 'prep'; left = 3; paint();
      start.classList.add('hidden'); stop.classList.remove('hidden'); keepAwake(true);
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      t = setInterval(tick, 1000);
    });
    stop.addEventListener('click', () => { clearInterval(t); t = null; phase = 'idle'; paint(); keepAwake(false); start.classList.remove('hidden'); stop.classList.add('hidden'); });
    timers.cleanup = () => { clearInterval(t); keepAwake(false); };
    paint();
  }

  // ---------- Atmung ----------
  function renderBreath() {
    const r = view, card = $('.breath', r);
    const MODES = {
      '478': [['in', 4, 'Einatmen'], ['hold', 7, 'Halten'], ['out', 8, 'Ausatmen']],
      'box': [['in', 4, 'Einatmen'], ['hold', 4, 'Halten'], ['out', 4, 'Ausatmen'], ['hold2', 4, 'Halten']],
      'slow': [['in', 5, 'Einatmen'], ['out', 5, 'Ausatmen']],
    };
    let mode = '478', t = null, i = 0, left = 0, cycles = 0;
    $$('.chip', r).forEach(c => c.addEventListener('click', () => { if (t) return; $$('.chip', r).forEach(x => x.classList.remove('active')); c.classList.add('active'); mode = c.dataset.mode; }));
    const start = $('[data-action="bstart"]', r), stop = $('[data-action="bstop"]', r);
    function setPhase() {
      const [ph, sec, label] = MODES[mode][i];
      card.dataset.phase = ph; left = sec;
      k('label', r).textContent = label; k('count', r).textContent = left;
      $('.breath-circle', r).style.transitionDuration = sec + 's';
      signal('tick');
    }
    function tick() {
      left--; k('count', r).textContent = left;
      if (left <= 0) { i = (i + 1) % MODES[mode].length; if (i === 0) cycles++; setPhase(); }
    }
    start.addEventListener('click', () => {
      i = 0; cycles = 0; setPhase(); t = setInterval(tick, 1000);
      start.classList.add('hidden'); stop.classList.remove('hidden'); keepAwake(true);
    });
    stop.addEventListener('click', () => {
      clearInterval(t); t = null; card.dataset.phase = 'idle'; k('label', r).textContent = cycles ? `${cycles} Zyklen` : 'Bereit'; k('count', r).textContent = '';
      start.classList.remove('hidden'); stop.classList.add('hidden'); keepAwake(false);
    });
    timers.cleanup = () => { clearInterval(t); keepAwake(false); };
  }

  // ---------- Statistik ----------
  function renderStats() {
    const r = view, S = db.sessions;
    const avg = S.length ? S.reduce((a, s) => a + s.active, 0) / S.length : 0;
    k('avg', r).textContent = fmt(avg);
    k('best', r).textContent = fmt(Math.max(0, ...S.map(s => s.active)));
    k('edgesTotal', r).textContent = S.reduce((a, s) => a + s.edges, 0);

    const li = levelIndex(), L = LEVELS[li], hits = levelHits(li);
    k('levelName', r).textContent = L.name;
    const isMax = li === LEVELS.length - 1;
    k('levelPct', r).textContent = isMax ? 'Max' : `${hits}/2 Ziele`;
    k('levelBar', r).style.width = (isMax ? 100 : hits * 50) + '%';
    k('levelNext', r).textContent = isMax ? 'Du hast das höchste Level erreicht. Halte das Niveau mit 2–3 Sessions pro Woche.'
      : `Für das nächste Level: ${fmt(L.time)} aktive Zeit mit mind. ${L.edges} Stopps – zweimal schaffen.`;

    const last = S.slice(-14), best = Math.max(1, ...last.map(s => s.active));
    k('chart', r).innerHTML = last.length ? last.map(s =>
      `<div class="bar-col ${s.active === best ? 'best' : ''}" style="height:${Math.max(3, s.active / best * 100)}%" title="${fmt(s.active)}"><i>${fmt(s.active)}</i></div>`).join('')
      : '<div class="empty">Noch keine Sessions.</div>';

    k('history', r).innerHTML = S.length ? [...S].reverse().slice(0, 30).map(s =>
      `<li><span>${new Date(s.ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · ${fmt(s.active)} aktiv</span><span>${s.edges} Stopps · ${fmt(s.total)} gesamt</span></li>`).join('')
      : '<li class="empty">Noch keine Einträge.</li>';
  }

  // ---------- Init ----------
  function init() {
    if (db.adult) { $('#gate').classList.add('hidden'); $('#app').classList.remove('hidden'); go('home'); }
    $('#gate-yes').addEventListener('click', () => { db.adult = true; save(); $('#gate').classList.add('hidden'); $('#app').classList.remove('hidden'); go('home'); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeLock === null && current !== 'home') keepAwake(true); });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
