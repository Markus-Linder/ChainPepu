// ChainPepu – begehbare 3D-Suche.
// Aufbau: Eine WebGL-Szene (fotorealistische Straße, Himmel, Gebäude) liegt ÜBER einer
// CSS3D-Ebene mit echten Webseiten. An den Stellen der Bildschirme stanzt WebGL
// durchsichtige „Löcher“, sodass man die echten Seiten sieht – korrekt verdeckt von
// Laternen etc. davor.
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// ---------- Konstanten ----------
const SCREEN_PX = { w: 1280, h: 800 };
const SCREEN_M = { w: 8, h: 5 };                    // Bildschirmgröße in Metern
const PX_TO_M = SCREEN_M.w / SCREEN_PX.w;
const STREET_HALF = 11;                             // Abstand Straßenmitte -> Fassade
const SLOT_LEN = 18;                                // Länge eines Grundstücks
const FIRST_Z = -14;
const EYE = 1.7;
const LIVE_DIST = 26;                               // ab dieser Nähe wird die Seite live geladen
const MAX_LIVE = 4;
const INFO_DIST = 15;

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const glLayer = $('#gl-layer');
const cssLayer = $('#css-layer');
const searchbar = $('#searchbar');
const form = $('#search-form');
const input = $('#q');
const info = $('#info');
const help = $('#help');
const touchUi = $('#touch');
const crosshair = $('#crosshair');
const statusEl = $('#status');
const viewer = $('#viewer');
const isTouch = matchMedia('(pointer: coarse)').matches;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
glLayer.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(innerWidth, innerHeight);
cssLayer.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
const cssScene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9b48f, 60, 320);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, EYE, 8);

// ---------- Licht ----------
const hemi = new THREE.HemisphereLight(0xffe2c4, 0x3a3229, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc48a, 3.2);
sun.position.set(-40, 30, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// ---------- Texturen (mit Higgsfield erzeugt, siehe public/assets) ----------
const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function tex(url, repeat) {
  return new Promise((resolve) => {
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      resolve(t);
    }, undefined, () => resolve(null));
  });
}

const pmrem = new THREE.PMREMGenerator(renderer);
const [skyTex, pavingTex, facadeTex] = await Promise.all([
  tex('assets/sky.jpg'),
  tex('assets/paving.jpg', true),
  tex('assets/facade.jpg', true),
]);
if (skyTex) {
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTex;
  scene.environment = pmrem.fromEquirectangular(skyTex).texture;
  scene.environmentIntensity = 0.8;
} else {
  scene.background = new THREE.Color(0xc9a27e);
}

// ---------- Boden ----------
const groundGroup = new THREE.Group();
scene.add(groundGroup);
function buildGround(length) {
  groundGroup.clear();
  const len = length + 120;
  const pave = pavingTex ? pavingTex.clone() : null;
  if (pave) { pave.needsUpdate = true; pave.repeat.set(60 / 6, len / 6); }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, len),
    new THREE.MeshStandardMaterial({ map: pave, color: pave ? 0xffffff : 0x8d8780, roughness: 0.82, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 30 - len / 2;
  ground.receiveShadow = true;
  groundGroup.add(ground);

  // Bordsteine
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x9a948c, roughness: 0.7 });
  for (const x of [-STREET_HALF + 1.2, STREET_HALF - 1.2]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, len), curbMat);
    curb.position.set(x, 0.08, 30 - len / 2);
    curb.receiveShadow = curb.castShadow = true;
    groundGroup.add(curb);
  }
}

// ---------- Hilfen ----------
function makeLabelTexture(lines, { w = 1024, h = 256, bg = 'rgba(14,16,22,0.92)' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  let y = 0;
  for (const l of lines) {
    g.font = `${l.weight || 600} ${l.size}px Inter, system-ui, sans-serif`;
    g.fillStyle = l.color || '#f4f1ec';
    y += l.size * 1.25;
    let text = l.text;
    while (g.measureText(text).width > w - 64 && text.length > 3) text = text.slice(0, -2);
    if (text !== l.text) text = text.slice(0, -1) + '…';
    g.fillText(text, 32, y + (l.offset || 0));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true, blending: THREE.NoBlending, side: THREE.DoubleSide });
const bezelMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.35, metalness: 0.8 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.5, metalness: 0.7 });
const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 4 });
const facadeTints = [0xffffff, 0xe8ddd0, 0xd4dbe2, 0xf2e6d6, 0xcfc8c0];

// ---------- Straße ----------
const street = new THREE.Group();
scene.add(street);
let slots = [];      // { result, side, screenPos, normal, css, el, live, rank }
let streetEnd = -60;

function clearStreet() {
  for (const s of slots) if (s.css) cssScene.remove(s.css);
  street.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      const m = o.material;
      if (m && m !== holeMat && m !== bezelMat && m !== poleMat && m !== bulbMat) {
        if (m.map && m.map !== facadeTex && m.map.isCanvasTexture) m.map.dispose();
        if (m.emissiveMap?.isCanvasTexture) m.emissiveMap.dispose();
        m.dispose();
      }
    }
  });
  street.clear();
  slots = [];
}

function buildStreet(results, query) {
  clearStreet();
  const count = Math.max(results.length, 10) + 2;   // ein paar Füllgebäude am Ende
  streetEnd = FIRST_Z - Math.ceil(count / 2) * SLOT_LEN;
  buildGround(-streetEnd);

  for (let i = 0; i < count; i++) {
    const result = results[i] || null;
    const side = i % 2 === 0 ? -1 : 1;                 // links / rechts abwechselnd
    const z = FIRST_Z - Math.floor(i / 2) * SLOT_LEN - (side > 0 ? SLOT_LEN / 2 : 0);
    const height = 14 + ((i * 7919) % 23);
    const depth = 14;
    const width = SLOT_LEN - 1.2;

    // Gebäudekörper mit Fassadentextur
    let ft = null;
    if (facadeTex) {
      ft = facadeTex.clone();
      ft.needsUpdate = true;
      ft.repeat.set(width / 16, height / 16);
      ft.offset.set((i * 0.37) % 1, 0);
    }
    const bmat = new THREE.MeshStandardMaterial({ map: ft, color: facadeTints[i % facadeTints.length], roughness: 0.75, metalness: 0.05 });
    const building = new THREE.Mesh(new THREE.BoxGeometry(depth, height, width), bmat);
    building.position.set(side * (STREET_HALF + depth / 2), height / 2, z);
    building.castShadow = building.receiveShadow = true;
    street.add(building);

    // Sockel / Erdgeschoss in dunklem Stein
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.2, 1.0, width + 0.2), new THREE.MeshStandardMaterial({ color: 0x3b3833, roughness: 0.6 }));
    plinth.position.set(building.position.x, 0.5, z);
    plinth.castShadow = plinth.receiveShadow = true;
    street.add(plinth);

    // Laterne zwischen den Grundstücken
    addLamp(side * (STREET_HALF - 1.8), z + SLOT_LEN / 2);

    if (!result) continue;

    // Bildschirm an der Fassade (zeigt zur Straßenmitte)
    const faceX = side * STREET_HALF;
    const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const screenY = 1.6 + SCREEN_M.h / 2;
    const screenPos = new THREE.Vector3(faceX - side * 0.06, screenY, z);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_M.w + 0.4, SCREEN_M.h + 0.4, 0.25), bezelMat);
    bezel.position.set(faceX - side * 0.0, screenY, z);
    bezel.rotation.y = rotY;
    bezel.castShadow = true;
    street.add(bezel);

    const hole = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_M.w, SCREEN_M.h), holeMat);
    hole.position.copy(screenPos).x -= side * 0.08;
    hole.rotation.y = rotY;
    hole.renderOrder = 10;
    street.add(hole);

    // Schild über dem Bildschirm: Rang, Titel, Domain
    const host = safeHost(result.url);
    const signTex = makeLabelTexture([
      { text: `#${i + 1}  ·  ${host}`, size: 44, color: '#ffb35c', weight: 700 },
      { text: result.title, size: 72, weight: 700, offset: 18 },
    ]);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_M.w + 0.4, (SCREEN_M.w + 0.4) / 4),
      new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.9, roughness: 0.4 })
    );
    sign.position.set(faceX - side * 0.14, screenY + SCREEN_M.h / 2 + 1.5, z);
    sign.rotation.y = rotY;
    street.add(sign);

    // Echte Webseite (CSS3D)
    const el = document.createElement('div');
    el.className = 'site-screen';
    const css = new CSS3DObject(el);
    css.position.copy(hole.position);
    css.rotation.y = rotY;
    css.scale.setScalar(PX_TO_M);
    cssScene.add(css);

    const slot = { result, rank: i + 1, side, screenPos: hole.position.clone(), css, el, live: false, frameable: null };
    showPreview(slot);
    slots.push(slot);
  }

  // Eingangstor mit der Suchanfrage
  if (query) {
    const t = makeLabelTexture([
      { text: `„${query}“`, size: 96, weight: 800 },
      { text: `${results.length} Ergebnisse – geh einfach los`, size: 44, color: '#ffb35c', offset: 20 },
    ], { w: 2048, h: 320 });
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.5), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 }));
    gate.position.set(0, 7.2, FIRST_Z + 6);
    street.add(gate);
    for (const x of [-8.3, 8.3]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.6, 0.6), poleMat);
      p.position.set(x, 4.3, FIRST_Z + 6);
      p.castShadow = true;
      street.add(p);
    }
  }
}

function addLamp(x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 6, 12), poleMat);
  pole.position.set(x, 3, z);
  pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), poleMat);
  arm.position.set(x - Math.sign(x) * 0.55, 5.95, z);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bulbMat);
  bulb.position.set(x - Math.sign(x) * 1.1, 5.8, z);
  street.add(pole, arm, bulb);
}

function safeHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
const shotUrl = (u) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(u)}?w=${SCREEN_PX.w}&h=${SCREEN_PX.h}`;

// Vorschaubild (immer verfügbar) …
function showPreview(slot) {
  slot.live = false;
  slot.el.replaceChildren();
  const img = new Image();
  img.alt = slot.result.title;
  img.referrerPolicy = 'no-referrer';
  img.src = shotUrl(slot.result.url);
  // mshots liefert beim ersten Abruf oft einen Platzhalter – danach erneut laden
  let tries = 0;
  const retry = () => {
    if (slot.live || !img.isConnected || ++tries > 3) return;
    img.src = shotUrl(slot.result.url) + `&r=${Date.now()}`;
    setTimeout(retry, 8000);
  };
  setTimeout(retry, 6000);
  slot.el.appendChild(img);
}
// … und live geladene Seite, sobald man näher kommt
function showLive(slot) {
  slot.live = true;
  const f = document.createElement('iframe');
  f.src = slot.result.url;
  f.loading = 'eager';
  f.referrerPolicy = 'no-referrer';
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
  slot.el.replaceChildren(f);
}

let hasServer = true;
async function checkFrameable(url) {
  if (hasServer) {
    try {
      const r = await fetch(`/api/frameable?url=${encodeURIComponent(url)}`);
      if (r.ok) return (await r.json()).frameable;
      hasServer = false;
    } catch { hasServer = false; }
  }
  return /wikipedia\.org$/.test(safeHost(url));   // ohne Server: nur bekannte, einbettbare Quellen
}

// ---------- Suche ----------
async function search(q) {
  if (hasServer) {
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=de`);
      if (r.ok) return (await r.json()).results;
      if (r.status === 404) hasServer = false;
    } catch { hasServer = false; }
  }
  // Fallback direkt aus dem Browser
  const r = await fetch(`https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=20&format=json&origin=*`);
  const j = await r.json();
  return (j.query?.search || []).map((x) => ({
    title: x.title,
    url: `https://de.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g, '_'))}`,
    snippet: x.snippet.replace(/<[^>]+>/g, ''),
  }));
}

function setStatus(text) {
  statusEl.hidden = !text;
  statusEl.textContent = text || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.blur();
  setStatus('Suche läuft …');
  try {
    const results = await search(q);
    if (!results.length) { setStatus('Keine Ergebnisse gefunden.'); return; }
    setStatus('');
    buildStreet(results, q);
    searchbar.classList.remove('intro');
    camera.position.set(0, EYE, 8);
    yaw = 0; pitch = 0;
    intro = false;
    help.hidden = isTouch;
    touchUi.hidden = !isTouch;
    crosshair.hidden = false;
  } catch (err) {
    console.error(err);
    setStatus('Die Suche ist fehlgeschlagen. Bitte erneut versuchen.');
  }
});

// ---------- Steuerung ----------
let yaw = 0, pitch = 0, intro = true;
const keys = new Set();
const touchMove = { fwd: false, back: false };

addEventListener('keydown', (e) => {
  if (e.target === input) return;
  keys.add(e.code);
  if (e.code === 'KeyE' && currentSlot) openViewer(currentSlot.result.url);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// Maus: Klick auf die Welt sperrt den Zeiger (Ego-Perspektive)
cssLayer.addEventListener('click', (e) => {
  if (intro || isTouch || !viewer.hidden) return;
  if (e.target.tagName === 'IFRAME') return;
  if (document.pointerLockElement) {
    if (currentSlot) openViewer(currentSlot.result.url);
  } else {
    cssLayer.requestPointerLock?.();
  }
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== cssLayer) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));
});

// Touch: Wischen zum Umsehen
let drag = null;
cssLayer.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') drag = { x: e.clientX, y: e.clientY, t: performance.now() }; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw += (e.clientX - drag.x) * 0.004;
  pitch += (e.clientY - drag.y) * 0.004;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));
  drag.x = e.clientX; drag.y = e.clientY;
});
addEventListener('pointerup', (e) => {
  if (drag && performance.now() - drag.t < 200 && currentSlot && !intro) openViewer(currentSlot.result.url);
  drag = null;
});
for (const b of touchUi.querySelectorAll('button')) {
  const k = b.dataset.move;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); touchMove[k] = true; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => (touchMove[k] = false));
}

// ---------- Info-Karte & Viewer ----------
let currentSlot = null;
function updateInfo(slot) {
  if (slot === currentSlot) return;
  currentSlot = slot;
  info.hidden = !slot;
  if (!slot) return;
  info.querySelector('.rank').textContent = `Ergebnis ${slot.rank}`;
  info.querySelector('h2').textContent = slot.result.title;
  info.querySelector('.url').textContent = slot.result.url;
  info.querySelector('p').textContent = slot.result.snippet || '';
  $('#btn-open').href = slot.result.url;
}
$('#btn-enter').addEventListener('click', () => currentSlot && openViewer(currentSlot.result.url));

async function openViewer(url) {
  document.exitPointerLock?.();
  keys.clear();
  viewer.hidden = false;
  viewer.querySelector('.vurl').textContent = url;
  viewer.querySelector('.vopen').href = url;
  viewer.querySelector('.vopen2').href = url;
  const frame = viewer.querySelector('iframe');
  const blocked = viewer.querySelector('.blocked');
  const ok = await checkFrameable(url);
  frame.hidden = !ok;
  blocked.hidden = ok;
  frame.src = ok ? url : 'about:blank';
}
viewer.querySelector('.vclose').addEventListener('click', () => {
  viewer.hidden = true;
  viewer.querySelector('iframe').src = 'about:blank';
});

// ---------- Hauptschleife ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let bob = 0;
let liveCheckT = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (intro) {
    // Startbildschirm: langsamer Schwenk über die leere Promenade
    yaw = Math.sin(t * 0.08) * 0.35;
    pitch = 0.06;
  } else if (viewer.hidden) {
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 11 : 5) * dt;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(-fwd.z, 0, fwd.x);
    let moving = false;
    const mv = new THREE.Vector3();
    if (keys.has('KeyW') || keys.has('ArrowUp') || touchMove.fwd) mv.add(fwd);
    if (keys.has('KeyS') || keys.has('ArrowDown') || touchMove.back) mv.sub(fwd);
    if (keys.has('KeyD')) mv.add(right);
    if (keys.has('KeyA')) mv.sub(right);
    if (keys.has('ArrowLeft')) yaw += 1.6 * dt;
    if (keys.has('ArrowRight')) yaw -= 1.6 * dt;
    if (mv.lengthSq() > 0) { mv.normalize().multiplyScalar(speed); camera.position.add(mv); moving = true; }
    camera.position.x = Math.max(-STREET_HALF + 2, Math.min(STREET_HALF - 2, camera.position.x));
    camera.position.z = Math.max(streetEnd + 4, Math.min(14, camera.position.z));
    bob = moving ? bob + dt * (speed / dt) * 1.6 : bob * 0.9;
    camera.position.y = EYE + Math.sin(bob) * 0.035;
  }
  euler.set(pitch, yaw, 0);
  camera.quaternion.setFromEuler(euler);

  // Sonne folgt dem Spieler, damit Schatten überall scharf bleiben
  sun.position.set(camera.position.x - 40, 30, camera.position.z - 60);
  sun.target.position.set(camera.position.x, 0, camera.position.z - 10);

  // Nächstgelegenes Ergebnis + Live-Webseiten verwalten
  if (!intro && slots.length) {
    let best = null, bestD = Infinity;
    for (const s of slots) {
      s.dist = camera.position.distanceTo(s.screenPos);
      if (s.dist < bestD) { bestD = s.dist; best = s; }
    }
    updateInfo(bestD < INFO_DIST ? best : null);

    liveCheckT -= dt;
    if (liveCheckT <= 0) {
      liveCheckT = 0.5;
      const near = [...slots].sort((a, b) => a.dist - b.dist).slice(0, MAX_LIVE).filter((s) => s.dist < LIVE_DIST);
      for (const s of slots) {
        if (near.includes(s)) {
          if (!s.live && s.frameable === null) {
            s.frameable = 'pending';
            checkFrameable(s.result.url).then((ok) => { s.frameable = ok; });
          } else if (!s.live && s.frameable === true) {
            showLive(s);
          }
        } else if (s.live) {
          showPreview(s);
        }
      }
    }
  }

  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  cssRenderer.setSize(innerWidth, innerHeight);
});

buildStreet([], '');
input.focus();
tick();
