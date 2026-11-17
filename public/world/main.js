// ChainPepu – die begehbare Suchmaschine.
//
// Aufbau: Eine WebGL-Szene (Straße, Gebäude, Bäume, Passanten, Himmel) liegt ÜBER
// einer CSS3D-Ebene mit den echten Webseiten. An den Bildschirmen stanzt WebGL
// durchsichtige Löcher, sodass man die echten Seiten sieht – korrekt verdeckt von
// Bäumen, Laternen und Menschen davor.
//
// Bedienung: Ziehen = umsehen, Klick/Tippen auf den Boden = dorthin gehen,
// Klick/Tippen auf eine Webseite = hineingehen. Mausrad / Pfeile / WASD = laufen.
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const ASSET = (f) => new URL(`./assets/${f}`, import.meta.url).href;

// ---------- Konstanten ----------
const SCREEN_PX = { w: 1280, h: 800 };
const SCREEN_M = { w: 8, h: 5 };
const PX_TO_M = SCREEN_M.w / SCREEN_PX.w;
const STREET_HALF = 11;          // Straßenmitte -> Fassade
const SIDEWALK_X = STREET_HALF - 2.6;
const SLOT_LEN = 18;
const FIRST_Z = 0;
const EYE = 1.7;
const LIVE_DIST = 28;
const MAX_LIVE = 4;
const INFO_DIST = 16;

// ---------- Oberfläche ----------
// Eigener Container direkt im <body>, außerhalb fremder Frameworks (z. B. React-Hydration)
let root = document.getElementById('chainpepu');
if (!root || root.tagName === 'MAIN') {
  root = document.createElement('div');
  root.id = 'chainpepu';
  document.body.appendChild(root);
}
root.innerHTML = `
  <div id="css-layer"></div>
  <div id="gl-layer"></div>
  <div id="loader"><div class="bar"><i></i></div><span>Die Stadt wird gebaut …</span></div>
  <header id="searchbar" class="intro">
    <div class="brand">Chain<span>Pepu</span></div>
    <form id="search-form" autocomplete="off" role="search">
      <input id="q" name="q" type="search" placeholder="Wonach suchst du?" aria-label="Suchbegriff" enterkeyhint="search" />
      <button type="submit">Suchen</button>
    </form>
    <p class="tagline">Geh durch deine Suchergebnisse.</p>
  </header>
  <button id="daynight" type="button" aria-label="Tag oder Nacht">☾</button>
  <aside id="info" hidden>
    <div class="rank"></div>
    <h2></h2>
    <div class="url"></div>
    <p></p>
    <button id="btn-enter" type="button">Webseite betreten</button>
  </aside>
  <div id="help" hidden>Ziehen: umsehen · Auf den Boden tippen: hingehen · Auf eine Webseite tippen: hineingehen</div>
  <div id="touch" hidden>
    <button data-move="fwd" aria-label="Vorwärts">▲</button>
    <button data-move="back" aria-label="Zurück">▼</button>
  </div>
  <div id="status" hidden></div>
  <div id="viewer" hidden>
    <div class="bar">
      <button class="vclose" type="button">← Zurück auf die Straße</button>
      <span class="vurl"></span>
      <a class="vopen" target="_blank" rel="noopener">Im neuen Tab ↗</a>
    </div>
    <iframe title="Webseite" referrerpolicy="no-referrer"></iframe>
  </div>`;

const $ = (s) => root.querySelector(s);
const glLayer = $('#gl-layer');
const cssLayer = $('#css-layer');
const searchbar = $('#searchbar');
const form = $('#search-form');
const input = $('#q');
const info = $('#info');
const help = $('#help');
const touchUi = $('#touch');
const statusEl = $('#status');
const viewer = $('#viewer');
const loaderEl = $('#loader');
const dayNightBtn = $('#daynight');
const isTouch = matchMedia('(pointer: coarse)').matches;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
const isTouchDevice = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouchDevice ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
glLayer.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(innerWidth, innerHeight);
cssLayer.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
const cssScene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9b48f, 70, 340);

const fovFor = (a) => (a < 1 ? 78 : 66);
const camera = new THREE.PerspectiveCamera(fovFor(innerWidth / innerHeight), innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, EYE, 12);

// ---------- Licht ----------
const hemi = new THREE.HemisphereLight(0xffe2c4, 0x3a3229, 0.9);
const sun = new THREE.DirectionalLight(0xffc48a, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isTouchDevice ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 220 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

// Ein paar echte Lichtquellen, die immer an die nächsten Laternen wandern (Nacht)
const lampLights = Array.from({ length: 6 }, () => {
  const l = new THREE.PointLight(0xffb36b, 0, 18, 1.6);
  scene.add(l);
  return l;
});

// ---------- Laden ----------
const manager = new THREE.LoadingManager();
manager.onProgress = (_u, done, total) => { loaderEl.querySelector('i').style.width = `${(done / total) * 100}%`; };
const texLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

function tex(file, repeat) {
  return new Promise((resolve) => {
    texLoader.load(ASSET(file), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      resolve(t);
    }, undefined, () => resolve(null));
  });
}
function glb(file, height) {
  return new Promise((resolve) => {
    gltfLoader.load(ASSET(file), (g) => {
      const obj = g.scene;
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          if (o.material?.map) o.material.map.anisotropy = maxAniso;
          if (file === 'tree.glb' && o.material?.color) o.material.color.multiplyScalar(0.78);
        }
      });
      // auf reale Höhe skalieren, Füße auf den Boden
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const s = height / size.y;
      obj.scale.setScalar(s);
      box.setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      obj.position.set(-c.x, -box.min.y, -c.z);
      const wrap = new THREE.Group();
      wrap.add(obj);
      resolve({ object: wrap, animations: g.animations });
    }, undefined, () => resolve(null));
  });
}

const pmrem = new THREE.PMREMGenerator(renderer);
const [skyDay, skyNight, pavingTex, ...facadeTexs] = await Promise.all([
  tex('sky.jpg'), tex('sky_night.jpg'), tex('paving.jpg', true),
  tex('facade.jpg', true), tex('facade2.jpg', true), tex('facade3.jpg', true), tex('facade4.jpg', true),
]);
// Fassaden und ihre reale Kachelgröße in Metern (Breite, Höhe)
const FACADES = [
  { t: facadeTexs[0], w: 17, h: 17, tint: 0xffffff },
  { t: facadeTexs[1], w: 15, h: 14, tint: 0xffffff },
  { t: facadeTexs[2], w: 18, h: 18, tint: 0xffffff },
  { t: facadeTexs[3], w: 15, h: 14, tint: 0xffffff },
].filter((f) => f.t);

const [treeM, lampM, benchM, manM, womanM] = await Promise.all([
  glb('tree.glb', 9), glb('lamp.glb', 4.6), glb('bench.glb', 0.9), glb('man.glb', 1.8), glb('woman.glb', 1.68),
]);
const envDay = skyDay ? pmrem.fromEquirectangular(skyDay).texture : null;
const envNight = skyNight ? pmrem.fromEquirectangular(skyNight).texture : null;
for (const t of [skyDay, skyNight]) if (t) t.mapping = THREE.EquirectangularReflectionMapping;
loaderEl.classList.add('done');
setTimeout(() => loaderEl.remove(), 900);

// ---------- Glüh-Sprites (Lichtschein um Laternen) ----------
const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,230,190,1)');
  grd.addColorStop(0.25, 'rgba(255,190,110,0.55)');
  grd.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 });

// ---------- Tag / Nacht ----------
let night = false;
function setNight(on) {
  night = on;
  dayNightBtn.textContent = on ? '☀' : '☾';
  dayNightBtn.setAttribute('aria-label', on ? 'Zum Tag wechseln' : 'Zur Nacht wechseln');
  const sky = on ? skyNight : skyDay;
  scene.background = sky || new THREE.Color(on ? 0x0b1020 : 0xc9a27e);
  scene.environment = on ? envNight : envDay;
  scene.environmentIntensity = on ? 0.55 : 0.8;
  scene.backgroundIntensity = 1;
  scene.fog.color.set(on ? 0x0e1424 : 0xd9b48f);
  hemi.color.set(on ? 0x8aa0ff : 0xffe2c4);
  hemi.groundColor.set(on ? 0x1a1610 : 0x3a3229);
  hemi.intensity = on ? 0.18 : 0.9;
  sun.color.set(on ? 0x9fb4ff : 0xffc48a);
  sun.intensity = on ? 0.35 : 3.2;
  renderer.toneMappingExposure = on ? 1.15 : 1.0;
  glowMat.opacity = on ? 1 : 0.3;
  for (const l of lampLights) l.intensity = on ? 22 : 0;
  for (const m of facadeMats) m.emissiveIntensity = on ? 0.22 : 0;
  for (const m of shopMats) m.emissiveIntensity = on ? 0.55 : 0.08;
}
dayNightBtn.addEventListener('click', () => setNight(!night));

// ---------- Boden ----------
const groundGroup = new THREE.Group();
scene.add(groundGroup);
let groundMesh = null;
function buildGround(length) {
  groundGroup.clear();
  const len = length + 200;
  let pave = null;
  if (pavingTex) {
    pave = pavingTex.clone();
    pave.needsUpdate = true;
    pave.repeat.set(70 / 5, len / 5);
  }
  groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(70, len),
    new THREE.MeshStandardMaterial({ map: pave, color: pave ? 0xffffff : 0x8d8780, roughness: 0.78, metalness: 0.0 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.z = 70 - len / 2;
  groundMesh.receiveShadow = true;
  groundMesh.userData.ground = true;
  groundGroup.add(groundMesh);

  const curbMat = new THREE.MeshStandardMaterial({ color: 0x9a948c, roughness: 0.7 });
  for (const x of [-SIDEWALK_X + 1.2, SIDEWALK_X - 1.2]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, len), curbMat);
    curb.position.set(x, 0.07, 70 - len / 2);
    curb.receiveShadow = curb.castShadow = true;
    groundGroup.add(curb);
  }
}

// ---------- Hilfen ----------
function makeLabelTexture(lines, { w = 1024, h = 256, bg = 'rgba(14,16,22,0.94)' } = {}) {
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
const safeHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const shotUrl = (u) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(u)}?w=${SCREEN_PX.w}&h=${SCREEN_PX.h}`;
const rand = (i, n = 1) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };

// Erdgeschoss: Steinpfeiler mit beleuchteten Schaufenstern (prozedural)
const shopTex = (() => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#a99d8c'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`; g.fillRect(0, i * 13, 1024, 1); }
  for (const x of [70, 560]) {
    const grd = g.createLinearGradient(0, 90, 0, 470);
    grd.addColorStop(0, '#2a2d33'); grd.addColorStop(0.35, '#6b5236'); grd.addColorStop(1, '#c99a5b');
    g.fillStyle = '#1d1f23'; g.fillRect(x - 10, 80, 414, 400);
    g.fillStyle = grd; g.fillRect(x, 90, 394, 380);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x, 90); g.lineTo(x + 160, 90); g.lineTo(x, 300); g.fill();
    g.fillStyle = '#1d1f23'; g.fillRect(x + 192, 90, 10, 380); g.fillRect(x, 200, 394, 8);
  }
  g.fillStyle = '#8f8473'; g.fillRect(0, 0, 1024, 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = maxAniso;
  return t;
})();
const shopEmissive = (() => { const t = shopTex.clone(); t.needsUpdate = true; return t; })();

const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true, blending: THREE.NoBlending, side: THREE.DoubleSide });
const bezelMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3, metalness: 0.85 });
const bezelHover = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3, metalness: 0.85, emissive: 0xffb35c, emissiveIntensity: 0.9 });
const corniceMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.7 });
const plinthMat = new THREE.MeshStandardMaterial({ color: 0x3b3833, roughness: 0.6 });
const sharedMats = new Set([holeMat, bezelMat, bezelHover, corniceMat, plinthMat]);
const facadeMats = [];
const shopMats = [];

// ---------- Straße ----------
const street = new THREE.Group();
scene.add(street);
let slots = [];
let clickables = [];
let streetEnd = -60;

function clearStreet() {
  for (const s of slots) if (s.css) cssScene.remove(s.css);
  street.traverse((o) => {
    if (!o.isMesh || o.userData.shared) return;
    o.geometry.dispose();
    for (const m of [].concat(o.material)) {
      if (!m || sharedMats.has(m)) continue;
      if (m.map?.isCanvasTexture || m.map?.source?.data?.tagName === 'CANVAS') m.map.dispose();
      m.dispose();
    }
  });
  street.clear();
  slots = [];
  clickables = [];
  facadeMats.length = 0;
  shopMats.length = 0;
}

function placeModel(model, x, z, rotY = 0) {
  if (!model) return null;
  const o = model.object.clone();
  o.traverse((c) => { if (c.isMesh) c.userData.shared = true; });
  o.position.set(x, 0, z);
  o.rotation.y = rotY;
  street.add(o);
  return o;
}

function addLamp(x, z) {
  const side = Math.sign(x);
  if (lampM) {
    placeModel(lampM, x, z, side > 0 ? -Math.PI / 2 : Math.PI / 2);
  } else {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 4.6, 12), bezelMat);
    pole.position.set(x, 2.3, z);
    street.add(pole);
  }
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(x, 4.25, z);
  glow.scale.setScalar(2.6);
  street.add(glow);
  lampPositions.push(new THREE.Vector3(x, 4.1, z));
}
let lampPositions = [];

function buildStreet(results, query) {
  clearStreet();
  lampPositions = [];
  const count = Math.max(results.length, 10) + 2;
  streetEnd = FIRST_Z - Math.ceil(count / 2) * SLOT_LEN;
  buildGround(-streetEnd);

  for (let i = -4; i < count; i++) {
    const result = i >= 0 ? results[i] || null : null;
    const side = (i + 4) % 2 === 0 ? -1 : 1;
    const z = FIRST_Z - Math.floor(i / 2) * SLOT_LEN - (side > 0 ? SLOT_LEN / 2 : 0);
    const height = 15 + Math.round(rand(i + 10) * 22);
    const depth = 16;
    const width = SLOT_LEN - 0.6;
    const fx = side * (STREET_HALF + depth / 2);

    // Gebäude
    const f = FACADES[((i + 8) * 3 + 1) % FACADES.length];
    let ft = null;
    if (f) {
      ft = f.t.clone();
      ft.needsUpdate = true;
      ft.repeat.set(width / f.w, (height - 4) / f.h);
      ft.offset.set(rand(i, 2), 0);
    }
    const bmat = new THREE.MeshStandardMaterial({
      map: ft, color: f ? f.tint : 0xd8cfc4, roughness: 0.72, metalness: 0.04,
      emissive: 0xffffff, emissiveMap: ft, emissiveIntensity: night ? 0.22 : 0,
    });
    facadeMats.push(bmat);
    const building = new THREE.Mesh(new THREE.BoxGeometry(depth, height - 4, width), bmat);
    building.position.set(fx, 4 + (height - 4) / 2, z);
    building.castShadow = building.receiveShadow = true;
    street.add(building);

    // Erdgeschoss (Sockel) + Gesims + Dachkante
    const st = shopTex.clone(); st.needsUpdate = true; st.repeat.set(width / 9, 1);
    const shopMat = new THREE.MeshStandardMaterial({ map: st, roughness: 0.45, metalness: 0.1, emissive: 0xffc58a, emissiveMap: st, emissiveIntensity: night ? 0.55 : 0.08 });
    shopMats.push(shopMat);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(depth, 4, width), [plinthMat, plinthMat, plinthMat, plinthMat, shopMat, shopMat]);
    plinth.position.set(fx, 2, z);
    plinth.castShadow = plinth.receiveShadow = true;
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.2, 0.25, width), corniceMat);
    cornice.position.set(fx - side * 0.05, 4.05, z);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.8, 0.6, width + 0.3), corniceMat);
    roof.position.set(fx - side * 0.4, height + 0.1, z);
    for (const m of [cornice, roof]) { m.castShadow = m.receiveShadow = true; }
    street.add(plinth, cornice, roof);

    // Straßenmöbel
    addLamp(side * SIDEWALK_X, z + SLOT_LEN / 2);
    placeModel(treeM, side * (SIDEWALK_X + 0.2), z - SLOT_LEN / 2 + 3.5, rand(i, 5) * Math.PI * 2);
    if (benchM && i % 3 === 0) placeModel(benchM, side * (SIDEWALK_X + 0.6), z + 5.5, side > 0 ? -Math.PI / 2 : Math.PI / 2);

    if (!result) continue;

    // Bildschirm: schräg zur Straße gedreht wie eine große Werbetafel,
    // damit man die Seite schon beim Heranlaufen sieht (auch im Hochformat)
    const faceX = side * STREET_HALF;
    const tilt = 0.44; // ~25°
    const n = new THREE.Vector3(-side * Math.cos(tilt), 0, Math.sin(tilt));
    const rotY = Math.atan2(n.x, n.z);
    const screenY = 2.2 + SCREEN_M.h / 2;
    const d = ((SCREEN_M.w / 2) * Math.sin(tilt) + 0.4) / Math.cos(tilt);
    const center = new THREE.Vector3(faceX, screenY, z).addScaledVector(n, d);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_M.w + 0.45, SCREEN_M.h + 0.45, 0.3), bezelMat);
    bezel.position.copy(center).addScaledVector(n, -0.17);
    bezel.rotation.y = rotY;
    bezel.castShadow = true;
    street.add(bezel);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, screenY - SCREEN_M.h / 2, 0.25), bezelMat);
    post.position.copy(center).addScaledVector(n, -0.3);
    post.position.y = (screenY - SCREEN_M.h / 2) / 2;
    street.add(post);

    const hole = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_M.w, SCREEN_M.h), holeMat);
    hole.position.copy(center);
    hole.rotation.y = rotY;
    hole.renderOrder = 10;
    street.add(hole);

    const host = safeHost(result.url);
    const signTex = makeLabelTexture([
      { text: `#${i + 1}  ·  ${host}`, size: 44, color: '#ffb35c', weight: 700 },
      { text: result.title, size: 72, weight: 700, offset: 18 },
    ]);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_M.w + 0.45, (SCREEN_M.w + 0.45) / 4),
      new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.85, roughness: 0.4 })
    );
    sign.position.copy(center).addScaledVector(n, -0.02);
    sign.position.y = screenY + SCREEN_M.h / 2 + 1.45;
    sign.rotation.y = rotY;
    street.add(sign);

    const el = document.createElement('div');
    el.className = 'site-screen';
    const css = new CSS3DObject(el);
    css.position.copy(hole.position);
    css.rotation.y = rotY;
    css.scale.setScalar(PX_TO_M);
    cssScene.add(css);

    const slot = { result, rank: i + 1, side, normal: n.clone(), screenPos: hole.position.clone(), css, el, bezel, live: false, frameable: null };
    for (const m of [hole, bezel, sign]) { m.userData.slot = slot; clickables.push(m); }
    showPreview(slot);
    slots.push(slot);
    checkFrameable(result.url).then((ok) => { slot.frameable = ok; });
  }

  if (query) {
    const t = makeLabelTexture([
      { text: `„${query}“`, size: 96, weight: 800 },
      { text: `${results.length} Ergebnisse – tippe auf eine Webseite, um hineinzugehen`, size: 40, color: '#ffb35c', offset: 20 },
    ], { w: 2048, h: 320 });
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.5), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 }));
    gate.position.set(0, 7.2, FIRST_Z + 6);
    street.add(gate);
    for (const x of [-8.3, 8.3]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.6, 0.5), bezelMat);
      p.position.set(x, 4.3, FIRST_Z + 6);
      p.castShadow = true;
      street.add(p);
    }
  }
  spawnPeople();
}

// ---------- Webseiten auf den Bildschirmen ----------
function showPreview(slot) {
  slot.live = false;
  slot.el.replaceChildren();
  const img = new Image();
  img.alt = slot.result.title;
  img.referrerPolicy = 'no-referrer';
  img.src = shotUrl(slot.result.url);
  let tries = 0;
  const retry = () => {
    if (slot.live || !img.isConnected || ++tries > 3) return;
    img.src = shotUrl(slot.result.url) + `&r=${Date.now()}`;
    setTimeout(retry, 8000);
  };
  setTimeout(retry, 6000);
  slot.el.appendChild(img);
}
function showLive(slot) {
  slot.live = true;
  const f = document.createElement('iframe');
  f.src = slot.result.url;
  f.referrerPolicy = 'no-referrer';
  f.tabIndex = -1;
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  slot.el.replaceChildren(f);
}

let hasServer = true;
const frameCache = new Map();
async function checkFrameable(url) {
  if (frameCache.has(url)) return frameCache.get(url);
  let ok = /\.wikipedia\.org$/.test(new URL(url).hostname);
  if (hasServer) {
    try {
      const r = await fetch(`/api/frameable?url=${encodeURIComponent(url)}`);
      if (r.ok) ok = (await r.json()).frameable;
      else if (r.status === 404) hasServer = false;
    } catch { hasServer = false; }
  }
  frameCache.set(url, ok);
  return ok;
}

// ---------- Passanten ----------
const people = [];
const peopleGroup = new THREE.Group();
scene.add(peopleGroup);
function spawnPeople() {
  for (const p of people) peopleGroup.remove(p.obj);
  people.length = 0;
  const models = [manM, womanM].filter(Boolean);
  if (!models.length) return;
  const n = isTouchDevice ? 6 : 10;
  for (let i = 0; i < n; i++) {
    const m = models[i % models.length];
    const obj = SkeletonUtils.clone(m.object);
    const lane = (rand(i, 7) * 2 - 1) * (SIDEWALK_X - 0.8);
    const dir = rand(i, 8) > 0.5 ? 1 : -1;
    obj.position.set(lane, 0, 26 - rand(i, 9) * (26 - streetEnd));
    peopleGroup.add(obj);
    let mixer = null;
    if (m.animations.length) {
      mixer = new THREE.AnimationMixer(obj);
      const a = mixer.clipAction(m.animations[0]);
      a.play();
      a.time = rand(i, 10) * m.animations[0].duration;
      a.timeScale = 0.9 + rand(i, 11) * 0.25;
    }
    people.push({ obj, mixer, dir, speed: 1.15 + rand(i, 12) * 0.35 });
  }
}
function updatePeople(dt) {
  for (const p of people) {
    p.mixer?.update(dt);
    if (!p.mixer) continue;
    p.obj.position.z += p.dir * p.speed * dt;
    if (p.obj.position.z > 30) p.dir = -1;
    if (p.obj.position.z < streetEnd + 4) p.dir = 1;
    // Modelle schauen in +Z; Richtung weich drehen
    const target = p.dir > 0 ? 0 : Math.PI;
    p.obj.rotation.y += (target - p.obj.rotation.y) * Math.min(1, dt * 4);
  }
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
  const r = await fetch(`https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=20&format=json&origin=*`);
  const j = await r.json();
  return (j.query?.search || []).map((x) => ({
    title: x.title,
    url: `https://de.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g, '_'))}`,
    snippet: x.snippet.replace(/<[^>]+>/g, ''),
  }));
}
function setStatus(text) { statusEl.hidden = !text; statusEl.textContent = text || ''; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.blur();
  setStatus('Suche läuft …');
  try {
    const results = await search(q);
    if (!results.length) { setStatus('Keine Ergebnisse gefunden. Versuch einen anderen Begriff.'); return; }
    setStatus('');
    buildStreet(results, q);
    searchbar.classList.remove('intro');
    camera.position.set(0, EYE, 12);
    yaw = 0; pitch = 0; walkTarget = null;
    intro = false;
    help.hidden = false;
    touchUi.hidden = !isTouch;
    setTimeout(() => { help.hidden = true; }, 9000);
  } catch (err) {
    console.error(err);
    setStatus('Die Suche hat nicht geklappt. Bitte gleich noch einmal versuchen.');
  }
});

// ---------- Steuerung: nur Zeigen, Ziehen und Tippen ----------
let yaw = 0, pitch = 0, intro = true;
let walkTarget = null;
const keys = new Set();
const touchMove = { fwd: false, back: false };
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hoverSlot = null;

function pick(clientX, clientY) {
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = groundMesh ? [...clickables, groundMesh] : clickables;
  const hit = raycaster.intersectObjects(targets, false)[0];
  if (!hit) return null;
  if (hit.object.userData.slot) return { slot: hit.object.userData.slot };
  if (hit.object.userData.ground) return { ground: hit.point };
  return null;
}

let drag = null;
glLayer.addEventListener('pointerdown', (e) => {
  if (!viewer.hidden) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
  glLayer.setPointerCapture(e.pointerId);
});
glLayer.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    if (drag.moved) {
      const k = e.pointerType === 'mouse' ? 0.0035 : 0.005;
      yaw += dx * k;
      pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * k));
      walkTarget = null;
    }
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  if (e.pointerType === 'mouse' && !intro) {
    const p = pick(e.clientX, e.clientY);
    setHover(p?.slot || null);
    glLayer.style.cursor = p?.slot ? 'pointer' : p?.ground ? 'crosshair' : 'grab';
  }
});
glLayer.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const wasTap = !drag.moved && performance.now() - drag.t < 600;
  drag = null;
  if (!wasTap || intro) return;
  const p = pick(e.clientX, e.clientY);
  if (p?.slot) enterSite(p.slot);
  else if (p?.ground) {
    walkTarget = new THREE.Vector3(
      Math.max(-SIDEWALK_X + 0.5, Math.min(SIDEWALK_X - 0.5, p.ground.x)), EYE,
      Math.max(streetEnd + 4, Math.min(30, p.ground.z)));
  }
});
glLayer.addEventListener('pointercancel', () => { drag = null; });
glLayer.addEventListener('wheel', (e) => {
  if (intro || !viewer.hidden) return;
  e.preventDefault();
  walkTarget = null;
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  camera.position.addScaledVector(f, -Math.sign(e.deltaY) * 1.6);
}, { passive: false });

function setHover(slot) {
  if (slot === hoverSlot) return;
  if (hoverSlot) hoverSlot.bezel.material = bezelMat;
  hoverSlot = slot;
  if (slot) slot.bezel.material = bezelHover;
}

addEventListener('keydown', (e) => {
  if (e.target === input) return;
  keys.add(e.code);
  if (e.code === 'Escape' && !viewer.hidden) closeViewer();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
for (const b of touchUi.querySelectorAll('button')) {
  const k = b.dataset.move;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); touchMove[k] = true; walkTarget = null; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => (touchMove[k] = false));
}

// ---------- In eine Webseite hineingehen ----------
let currentSlot = null;
function updateInfo(slot) {
  if (slot === currentSlot) return;
  currentSlot = slot;
  info.hidden = !slot;
  if (!slot) return;
  info.querySelector('.rank').textContent = `Ergebnis ${slot.rank} · ${safeHost(slot.result.url)}`;
  info.querySelector('h2').textContent = slot.result.title;
  info.querySelector('.url').textContent = slot.result.url;
  info.querySelector('p').textContent = slot.result.snippet || '';
}
$('#btn-enter').addEventListener('click', () => currentSlot && enterSite(currentSlot));

let flyTo = null;   // kurze Kamerafahrt auf den Bildschirm zu
function enterSite(slot) {
  const url = slot.result.url;
  // Seiten, die keine Einbettung erlauben, sofort (noch im Klick) im neuen Tab öffnen
  if (slot.frameable === false) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  walkTarget = null;
  const from = camera.position.clone();
  const dist = camera.aspect < 1 ? 9 : 5.4;   // Hochformat: weiter weg, damit die Seite passt
  const to = slot.screenPos.clone().addScaledVector(slot.normal, dist);
  to.y = slot.screenPos.y;
  const yawTo = Math.atan2(slot.normal.x, slot.normal.z);
  flyTo = { t: 0, start: performance.now(), from, to, yawFrom: yaw, yawTo: nearestAngle(yaw, yawTo), pitchFrom: pitch, url };
}
function nearestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}
function openViewer(url) {
  keys.clear();
  viewer.hidden = false;
  viewer.querySelector('.vurl').textContent = url;
  viewer.querySelector('.vopen').href = url;
  viewer.querySelector('iframe').src = url;
}
function closeViewer() {
  viewer.hidden = true;
  viewer.querySelector('iframe').src = 'about:blank';
  camera.position.y = EYE;
  pitch = 0;
}
viewer.querySelector('.vclose').addEventListener('click', closeViewer);

// ---------- Hauptschleife ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const rightV = new THREE.Vector3();
const mv = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let bob = 0, liveCheckT = 0;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updatePeople(dt);

  if (intro) {
    yaw = Math.sin(t * 0.07) * 0.35;
    pitch = 0.05;
  } else if (flyTo) {
    flyTo.t = Math.min(1, (performance.now() - flyTo.start) / 1100);
    const k = ease(flyTo.t);
    camera.position.lerpVectors(flyTo.from, flyTo.to, k);
    yaw = flyTo.yawFrom + (flyTo.yawTo - flyTo.yawFrom) * k;
    pitch = flyTo.pitchFrom * (1 - k);
    if (flyTo.t >= 1) { const u = flyTo.url; flyTo = null; openViewer(u); }
  } else if (viewer.hidden) {
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 11 : 5) * dt;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    rightV.set(-fwd.z, 0, fwd.x);
    mv.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp') || touchMove.fwd) mv.add(fwd);
    if (keys.has('KeyS') || keys.has('ArrowDown') || touchMove.back) mv.sub(fwd);
    if (keys.has('KeyD')) mv.add(rightV);
    if (keys.has('KeyA')) mv.sub(rightV);
    if (keys.has('ArrowLeft')) yaw += 1.6 * dt;
    if (keys.has('ArrowRight')) yaw -= 1.6 * dt;
    let moving = false;
    if (mv.lengthSq() > 0) { walkTarget = null; mv.normalize().multiplyScalar(speed); camera.position.add(mv); moving = true; }
    else if (walkTarget) {
      const d = new THREE.Vector3(walkTarget.x - camera.position.x, 0, walkTarget.z - camera.position.z);
      const len = d.length();
      if (len < 0.25) walkTarget = null;
      else { camera.position.addScaledVector(d.normalize(), Math.min(len, 5 * dt)); moving = true; }
    }
    camera.position.x = Math.max(-SIDEWALK_X + 0.5, Math.min(SIDEWALK_X - 0.5, camera.position.x));
    camera.position.z = Math.max(streetEnd + 4, Math.min(30, camera.position.z));
    bob = moving ? bob + dt * 9 : bob * 0.85;
    camera.position.y = EYE + Math.sin(bob) * 0.03;
  }
  euler.set(pitch, yaw, 0);
  camera.quaternion.setFromEuler(euler);

  sun.position.set(camera.position.x - 40, 32, camera.position.z - 60);
  sun.target.position.set(camera.position.x, 0, camera.position.z - 12);

  // Nachts: die echten Lichtquellen hängen an den nächsten Laternen
  if (night && lampPositions.length) {
    const near = lampPositions.map((p) => [p, p.distanceToSquared(camera.position)]).sort((a, b) => a[1] - b[1]);
    lampLights.forEach((l, i) => { if (near[i]) l.position.copy(near[i][0]).y -= 0.4; });
  }

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
        if (near.includes(s)) { if (!s.live && s.frameable === true) showLive(s); }
        else if (s.live) showPreview(s);
      }
    }
  }

  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = fovFor(camera.aspect);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  cssRenderer.setSize(innerWidth, innerHeight);
});

// Start: Tageszeit wie beim Besucher
const hour = new Date().getHours();
buildStreet([], '');
setNight(hour < 7 || hour >= 19);
window.__chainpepu = { get slots() { return slots; }, camera, pick, get flyTo() { return flyTo; } };
tick();
