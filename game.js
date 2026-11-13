// Nikolaus gegen Weihnachtsmann - Tischtennis
// Ein originales Weihnachts-Pong-Spiel in echtem 3D (Three.js). Alle Figuren
// werden selbst aus einfachen 3D-Grundformen gebaut (kein LEGO-Design: runder
// statt zylindrischer Kopf, keine Noppen, generische Blockform), daher keine
// Urheberrechts- oder Markenprobleme.
"use strict";

import * as THREE from "three";

/* ----------------------------- Zustand ----------------------------- */
const state = {
  players: 1, // 1 = gegen Bot, 2 = gegen 2. Spieler
  p1Char: "nikolaus",
  p2Char: "weihnachtsmann",
};

const CHAR_NAMES = {
  nikolaus: "Nikolaus",
  weihnachtsmann: "Weihnachtsmann",
};

const CHAR_COLORS = {
  // Bewusst stark unterschiedliche Farbwelten (nicht nur zwei Rottoene),
  // damit die Figuren auch aus der Vogelperspektive (Top-Down-Kamera) und
  // auf kleinen mobilen Bildschirmen klar unterscheidbar bleiben: Nikolaus
  // = dunkles Bischofs-Burgunderrot mit Gold, Weihnachtsmann = klassisches
  // helles Rot mit Weiss/Schwarz.
  nikolaus: { main: "#7a1f3d", trim: "#ecd18a", accent: "#f4d035" },
  weihnachtsmann: { main: "#d4211f", trim: "#f5f7fa", accent: "#222222" },
};

/* ------------------------- Bildschirm-Logik ------------------------- */
const screens = {
  mode: document.getElementById("screen-mode"),
  char1: document.getElementById("screen-char1"),
  char2: document.getElementById("screen-char2"),
  game: document.getElementById("screen-game"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

document.querySelectorAll("#screen-mode .big-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    unlockAudio();
    state.players = parseInt(btn.dataset.players, 10);
    document.getElementById("char1-title").textContent =
      state.players === 1 ? "Wähle deine Figur" : "Spieler 1: Wähle deine Figur";
    showScreen("char1");
  });
});

document.querySelectorAll("#screen-char1 .char-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.p1Char = btn.dataset.char;
    if (state.players === 2) {
      showScreen("char2");
    } else {
      state.p2Char = state.p1Char === "nikolaus" ? "weihnachtsmann" : "nikolaus";
      startGame();
    }
  });
});

document.querySelectorAll("#screen-char2 .char-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.p2Char = btn.dataset.char;
    startGame();
  });
});

document.getElementById("btn-again").addEventListener("click", () => {
  resetMatch();
  hideWinOverlay();
  startCountdownServe(Math.random() < 0.5 ? 1 : -1);
});

document.getElementById("btn-menu").addEventListener("click", () => {
  hideWinOverlay();
  cancelGameLoop();
  showScreen("mode");
});

document.getElementById("btn-pause").addEventListener("click", togglePause);

/* ------------------------- Figuren zeichnen ------------------------- */

// Zeichnet nur Gesicht + Bart (ohne Mütze, ohne Körper) für die 3D-Kopf-Textur.
// Die Mütze wird für die 3D-Figur als echtes 3D-Objekt gebaut (siehe buildHat3D).
function drawFaceDetails(ctx, cx, cy, r, char) {
  const c = CHAR_COLORS[char];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = "round";

  const faceGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.1, 0, 0, r * 0.7);
  faceGrad.addColorStop(0, "#ffe6bd");
  faceGrad.addColorStop(1, "#f2c788");
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();

  // Augenbrauen
  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = Math.max(1, r * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.18);
  ctx.quadraticCurveTo(-r * 0.22, -r * 0.26, -r * 0.12, -r * 0.19);
  ctx.moveTo(r * 0.12, -r * 0.19);
  ctx.quadraticCurveTo(r * 0.22, -r * 0.26, r * 0.32, -r * 0.18);
  ctx.stroke();

  // Wangen
  ctx.fillStyle = "#ff9d8a";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(-r * 0.34, r * 0.14, r * 0.13, 0, Math.PI * 2);
  ctx.arc(r * 0.34, r * 0.14, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Augen mit Glanzpunkt
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.05, r * 0.075, 0, Math.PI * 2);
  ctx.arc(r * 0.22, -r * 0.05, r * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-r * 0.19, -r * 0.08, r * 0.022, 0, Math.PI * 2);
  ctx.arc(r * 0.25, -r * 0.08, r * 0.022, 0, Math.PI * 2);
  ctx.fill();

  // Nase
  ctx.fillStyle = "#f2a97c";
  ctx.beginPath();
  ctx.arc(0, r * 0.04, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Lächeln
  ctx.strokeStyle = "#7a2f12";
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Bart
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-r * 0.58, r * 0.05);
  ctx.quadraticCurveTo(-r * 0.6, r * 0.9, 0, r * 1.05);
  ctx.quadraticCurveTo(r * 0.6, r * 0.9, r * 0.58, r * 0.05);
  ctx.quadraticCurveTo(0, r * 0.45, -r * 0.58, r * 0.05);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,200,200,0.5)";
  ctx.lineWidth = Math.max(0.5, r * 0.02);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.09, r * 0.35);
    ctx.quadraticCurveTo(i * r * 0.1, r * 0.7, i * r * 0.06, r * 0.98);
    ctx.stroke();
  }

  // Schnurrbart
  ctx.fillStyle = "#f2f2f2";
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, r * 0.12, r * 0.18, r * 0.09, -0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.2, r * 0.12, r * 0.18, r * 0.09, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Hilfsfunktion: gerundetes Rechteck als Pfad (für den blockigen Torso)
// Charakterauswahl-Vorschau: statt eines flachen gemalten Bildes zeigt
// jedes Vorschau-Canvas jetzt eine echte, leicht laufende/wippende 3D-
// Miniaturszene desselben Modells, das auch im Spiel verwendet wird (siehe
// buildCharacterModel/applyCharacterAnim weiter unten).
const previewRigs = [];
function initCharacterPreviews() {
  document.querySelectorAll(".char-preview").forEach((canvas) => {
    const char = canvas.dataset.preview;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.width, canvas.height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 0.95));
    // Hauptlicht auf derselben (negativen Z-)Seite wie die Kamera, damit das
    // Gesicht der Figur beleuchtet statt im Schatten liegt.
    const key = new THREE.DirectionalLight(0xfff3d6, 1.15);
    key.position.set(-100, 200, -160);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd6ff, 0.35);
    fill.position.set(120, 80, 80);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(28, canvas.width / canvas.height, 10, 2000);
    // Negative Z, da das Gesicht der Figur (siehe buildCharacterModel) zur
    // negativen Z-Achse zeigt - so blickt die Vorschau-Kamera der Figur ins
    // Gesicht statt auf ihren Ruecken, und die volle Koerperhoehe (Fuesse
    // bis Muetzenspitze) passt vollstaendig ins Bild.
    camera.position.set(-90, 150, -330);
    camera.lookAt(0, 90, 0);

    const model = buildCharacterModel(char, 1);
    scene.add(model);

    previewRigs.push({
      renderer,
      scene,
      camera,
      model,
      anim: { walkPhase: Math.random() * Math.PI * 2, hitTimer: 1 },
    });
  });
  if (previewRigs.length) requestAnimationFrame(animatePreviews);
}

let lastPreviewT = null;
function animatePreviews(t) {
  if (lastPreviewT === null) lastPreviewT = t;
  const dt = Math.min(0.05, (t - lastPreviewT) / 1000);
  lastPreviewT = t;
  for (const rig of previewRigs) {
    rig.anim.walkPhase += dt * 3.2;
    applyCharacterAnim(rig.model, rig.anim, false, 0, 0);
    rig.model.rotation.y = Math.sin(t / 2600) * 0.55; // sanftes Hin-und-Her-Drehen zum Vorfuehren
    rig.renderer.render(rig.scene, rig.camera);
  }
  requestAnimationFrame(animatePreviews);
}
initCharacterPreviews();

/* ----------------------------- Audio -------------------------------- */
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  } else if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(freq, duration, type = "sine", gain = 0.18, delay = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function sfxHit() {
  playTone(880, 0.12, "triangle", 0.22);
}
function sfxWall() {
  playTone(440, 0.08, "sine", 0.14);
}
function sfxScore() {
  playTone(220, 0.25, "sawtooth", 0.16);
}
function sfxWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.3, "triangle", 0.2, i * 0.14));
}
function sfxPresent() {
  [660, 990].forEach((f, i) => playTone(f, 0.16, "triangle", 0.2, i * 0.09));
}

/* ------------------------------ Spiel -------------------------------- */
const WIN_SCORE = 5;
const LOGICAL_W = 900;
const LOGICAL_H = 500;
const BALL_VISUAL_R = 17; // etwas groesser als der Logik-Radius, damit der Ball in 3D gut sichtbar ist
const BALL_ARC_HEIGHT = 55; // kosmetischer Bogen (Flug ueber das Netz), rein optisch

let canvas, renderer, scene, camera;
let tableGroup, netGroup, ballMesh, charL, charR, snowPoints;
let rafId = null;
let paused = false;
let gameOver = false;
let countdownActive = false;

const PADDLE_H_BASE = 95;
const PADDLE_H_BOOST = 150; // Schlaeger-Hoehe waehrend des Geschenk-Power-ups
const POWERUP_DURATION = 7; // Sekunden, die der Power-up-Bonus anhaelt

const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 11, speed: 6.2 };
const paddleL = { x: 28, y: 0, w: 16, h: PADDLE_H_BASE, vy: 0 };
const paddleR = { x: 0, y: 0, w: 16, h: PADDLE_H_BASE, vy: 0 };
const PADDLE_SPEED = 430; // px/sec logical
const BOT_MAX_SPEED = 330;
const scores = { left: 0, right: 0 };

// Rein kosmetischer Animationszustand je Figur (Lauf-/Schwung-Phase, Treffer-
// Timer) - beeinflusst nur draw(), nicht die Physik oben.
const animL = { walkPhase: 0, hitTimer: 0 };
const animR = { walkPhase: 0, hitTimer: 0 };
let prevPaddleLY = paddleL.y;
let prevPaddleRY = paddleR.y;
let lastHitSide = null; // "left" | "right" | null - wer den Ball zuletzt getroffen hat
let boostTimerL = 0; // restliche Sekunden Schlaeger-Boost links
let boostTimerR = 0; // restliche Sekunden Schlaeger-Boost rechts

// Zufaellig auftauchendes Geschenk als kleines Power-up: wer es mit dem Ball
// trifft, bekommt fuer POWERUP_DURATION Sekunden einen laengeren Schlaeger.
const present = { x: 0, y: 0, r: 26, active: false };
let presentMesh = null;
let presentSpawnTimer = 6;

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// Rechnet die flache Spiellogik-Koordinate (x: 0..LOGICAL_W, y: 0..LOGICAL_H)
// in 3D-Weltkoordinaten um (X bleibt links/rechts, die Logik-Y-Achse wird zur
// Tisch-Tiefe Z). Die komplette Physik oben bleibt dadurch unveraendert.
function worldX(logicalX) {
  return logicalX - LOGICAL_W / 2;
}
function worldZ(logicalY) {
  return logicalY - LOGICAL_H / 2;
}

const input = {
  wDown: false,
  sDown: false,
  upDown: false,
  downDown: false,
  touchLeftY: null,
  touchRightY: null,
};

/* --------------------------- 3D-Szene bauen --------------------------- */
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071a10);
  scene.fog = new THREE.Fog(0x071a10, 1400, 2600);

  // Vogelperspektive (fast senkrecht von oben), wie im urspruenglichen
  // 2D-Spiel, aber als echte 3D-Kamera. Eine orthographische Kamera wird
  // verwendet, damit es (anders als bei einer Perspektivkamera) keine
  // Objekt-Position-abhaengige Verzerrung gibt - hohe Objekte wie die Muetzen
  // "kippen" sonst an den Bildschirmraendern stark zur Seite. WICHTIG:
  // camera.up muss explizit auf einen horizontalen Vektor gesetzt werden,
  // bevor lookAt() aufgerufen wird - sonst waere die Rotation um die
  // Blickachse undefiniert (Blickrichtung fast parallel zum Standard-Up
  // (0,1,0)). (0,0,-1) sorgt dafuer, dass "nach oben auf dem Bildschirm" der
  // Welt-Richtung -Z entspricht und "nach unten auf dem Bildschirm" +Z -
  // exakt wie die Logik-Y-Achse (worldZ) erwartet, damit Maus-/Touch-Ziehen
  // nicht mehr spiegelverkehrt wirkt.
  const halfH = 330;
  const halfW = halfH * (LOGICAL_W / LOGICAL_H);
  camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 10, 4000);
  camera.up.set(0, 0, -1);
  camera.position.set(0, 900, -230);
  camera.lookAt(0, 0, 60);
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(buildLights());
  tableGroup = buildTable();
  scene.add(tableGroup);
  netGroup = buildNet();
  scene.add(netGroup);
  scene.add(buildTrees());
  snowPoints = buildSnowfall();
  scene.add(snowPoints);
  presentMesh = buildPresentMesh();
  scene.add(presentMesh);

  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_VISUAL_R, 20, 20), ballMat);
  ballMesh.castShadow = true;
  scene.add(ballMesh);
}

function buildLights() {
  const group = new THREE.Group();
  group.add(new THREE.HemisphereLight(0xbcd4ff, 0x14110c, 0.6));
  group.add(new THREE.AmbientLight(0x443322, 0.35));

  const dirLight = new THREE.DirectionalLight(0xfff2d9, 1.2);
  dirLight.position.set(220, 520, -260);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -520;
  dirLight.shadow.camera.right = 520;
  dirLight.shadow.camera.top = 420;
  dirLight.shadow.camera.bottom = -420;
  dirLight.shadow.camera.near = 50;
  dirLight.shadow.camera.far = 1400;
  dirLight.shadow.bias = -0.0015;
  group.add(dirLight, dirLight.target);

  // warme Zusatzlichter bei den Baeumen fuer eine gemuetliche Atmosphaere
  const warmL = new THREE.PointLight(0xffb84d, 0.6, 500);
  warmL.position.set(-540, 110, 0);
  const warmR = new THREE.PointLight(0xffb84d, 0.6, 500);
  warmR.position.set(540, 110, 0);
  group.add(warmL, warmR);

  return group;
}

function buildTable() {
  const group = new THREE.Group();
  const topMat = new THREE.MeshStandardMaterial({ color: 0x0e3b24, roughness: 0.6 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(LOGICAL_W, 20, LOGICAL_H), topMat);
  top.position.y = -10;
  top.receiveShadow = true;
  group.add(top);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.7 });
  const legGeo = new THREE.BoxGeometry(18, 150, 18);
  const legOffsets = [
    [-LOGICAL_W / 2 + 40, -LOGICAL_H / 2 + 40],
    [LOGICAL_W / 2 - 40, -LOGICAL_H / 2 + 40],
    [-LOGICAL_W / 2 + 40, LOGICAL_H / 2 - 40],
    [LOGICAL_W / 2 - 40, LOGICAL_H / 2 - 40],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, -95, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  const lineMat = new THREE.MeshStandardMaterial({ color: 0xdfe9e2, roughness: 0.5 });
  const edgeT = 6;
  const borderDefs = [
    [LOGICAL_W, edgeT, 0, LOGICAL_H / 2 - edgeT / 2],
    [LOGICAL_W, edgeT, 0, -LOGICAL_H / 2 + edgeT / 2],
    [edgeT, LOGICAL_H, -LOGICAL_W / 2 + edgeT / 2, 0],
    [edgeT, LOGICAL_H, LOGICAL_W / 2 - edgeT / 2, 0],
  ];
  for (const [w, d, x, z] of borderDefs) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), lineMat);
    edge.position.set(x, 0.6, z);
    group.add(edge);
  }
  const center = new THREE.Mesh(new THREE.BoxGeometry(6, 2, LOGICAL_H - 12), lineMat);
  center.position.set(0, 0.6, 0);
  group.add(center);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a1f14, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -170;
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}

function buildNet() {
  const group = new THREE.Group();
  const netHeight = 60;
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(LOGICAL_H - 10, netHeight), netMat);
  netMesh.rotation.y = Math.PI / 2;
  netMesh.position.set(0, netHeight / 2, 0);
  group.add(netMesh);

  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const tape = new THREE.Mesh(new THREE.BoxGeometry(6, 4, LOGICAL_H - 10), tapeMat);
  tape.position.set(0, netHeight, 0);
  group.add(tape);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
  const postGeo = new THREE.CylinderGeometry(4, 4, netHeight + 10, 10);
  const postL = new THREE.Mesh(postGeo, postMat);
  postL.position.set(0, netHeight / 2, -(LOGICAL_H / 2 - 6));
  const postR = new THREE.Mesh(postGeo, postMat);
  postR.position.set(0, netHeight / 2, LOGICAL_H / 2 - 6);
  group.add(postL, postR);

  return group;
}

function buildTree(x, z, height) {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3a21, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, height * 0.25, 8), trunkMat);
  trunk.position.y = height * 0.125;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f5c33, roughness: 0.8 });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf3f8ff, roughness: 0.6 });
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const coneH = height * 0.5;
    const coneR = (1 - i * 0.22) * height * 0.32;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 10), leafMat);
    cone.position.y = height * 0.25 + i * coneH * 0.42 + coneH / 2;
    cone.castShadow = true;
    tree.add(cone);
    // kleine Schneehaube auf jeder Tanne-Etage, fuer weihnachtliche Stimmung
    const cap = new THREE.Mesh(new THREE.ConeGeometry(coneR * 0.82, coneH * 0.22, 10), snowCapMat);
    cap.position.y = cone.position.y + coneH / 2 - coneH * 0.06;
    tree.add(cap);
  }
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd65c,
    emissive: 0xffbf3a,
    emissiveIntensity: 0.6,
  });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(6), starMat);
  star.position.y = height * 1.02;
  tree.add(star);

  tree.position.set(x, -10, z);
  return tree;
}

function buildTrees() {
  const group = new THREE.Group();
  const positions = [
    [-560, -180],
    [-560, 180],
    [560, -180],
    [560, 180],
  ];
  for (const [x, z] of positions) {
    group.add(buildTree(x, z, 75 + Math.abs(x + z) % 25));
  }
  return group;
}

// Stimmungsvoller Schneefall im Hintergrund: ein einzelnes Points-Objekt mit
// vielen kleinen Schneeflocken. WICHTIG: Unter der fast senkrechten
// Vogelperspektive (Orthographic-Kamera) erzeugt eine reine Y-Bewegung
// (Hoehe) kaum sichtbare Bildschirmbewegung - eine orthographische Kamera
// kennt keine perspektivische Tiefenwirkung, daher wuerde "echtes" Fallen
// entlang der Welt-Y-Achse nur extrem langsam ueber den Bildschirm "treiben"
// statt sichtbar zu fallen. Deshalb wird die Fallbewegung hier zusaetzlich
// ueber Punktgroesse/Deckkraft dargestellt (grosse, helle Flocke = hoch oben/
// nah an der Kamera, kleine, verblassende Flocke = kurz vorm Boden) - ein in
// Top-Down-Spielen uebliches Kunstgriff, damit "von oben kommend, zu Boden
// fallend" trotzdem klar erkennbar ist. Ein eigener Shader wird benoetigt,
// weil THREE.PointsMaterial.sizeAttenuation bei orthographischen Kameras
// bewusst deaktiviert ist (kein Tiefen-Bezug dort).
let snowPositions = null;
let snowSpeeds = null;
let snowDrift = null;
function buildSnowfall() {
  const count = 260;
  const spread = 1800;
  const topY = 520;
  const floorY = -6;
  const geo = new THREE.BufferGeometry();
  snowPositions = new Float32Array(count * 3);
  snowSpeeds = new Float32Array(count);
  snowDrift = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * spread;
    snowPositions[i * 3 + 1] = floorY + Math.random() * (topY - floorY);
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    snowSpeeds[i] = 34 + Math.random() * 46;
    snowDrift[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTopY: { value: topY },
      uFloorY: { value: floorY },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: `
      uniform float uTopY;
      uniform float uFloorY;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float h = clamp((position.y - uFloorY) / (uTopY - uFloorY), 0.0, 1.0);
        gl_PointSize = mix(2.0, 8.5, h) * uPixelRatio;
        vAlpha = mix(0.08, 0.9, h);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * soft);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.topY = topY;
  points.userData.floorY = floorY;
  points.userData.spread = spread;
  return points;
}

function updateSnowfall(dt, snow) {
  if (!snow || !snowPositions) return;
  const pos = snow.geometry.attributes.position.array;
  const { topY, floorY, spread } = snow.userData;
  const t = performance.now() / 1000;
  for (let i = 0; i < snowSpeeds.length; i++) {
    pos[i * 3 + 1] -= snowSpeeds[i] * dt; // faellt Richtung Boden
    pos[i * 3] += Math.sin(t * 0.6 + snowDrift[i]) * 5 * dt; // leichtes Treiben
    if (pos[i * 3 + 1] < floorY) {
      pos[i * 3 + 1] = topY;
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
  }
  snow.geometry.attributes.position.needsUpdate = true;
}

// Baut ein kleines Geschenk (Pappschachtel + Schleife) als zufaellig
// auftauchendes Power-up - rein generisch gestaltet, keine Markenbezuege.
function buildPresentMesh() {
  const group = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.45 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(34, 30, 34), boxMat);
  box.position.y = 15;
  box.castShadow = true;
  group.add(box);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.3, metalness: 0.35 });
  const ribbonX = new THREE.Mesh(new THREE.BoxGeometry(38, 32, 7), ribbonMat);
  ribbonX.position.y = 15;
  group.add(ribbonX);
  const ribbonZ = new THREE.Mesh(new THREE.BoxGeometry(7, 32, 38), ribbonMat);
  ribbonZ.position.y = 15;
  group.add(ribbonZ);
  const bowGeo = new THREE.SphereGeometry(7, 10, 10);
  const bowL = new THREE.Mesh(bowGeo, ribbonMat);
  bowL.position.set(-8, 32, 0);
  bowL.scale.set(1, 0.7, 1.4);
  const bowR = bowL.clone();
  bowR.position.x = 8;
  group.add(bowL, bowR);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  group.visible = false;
  return group;
}

// Baut die Mütze als echtes 3D-Objekt (kein LEGO-Design: kein Zylinderkopf,
// keine Noppen - generische, selbst entworfene Blockfigur).
function buildHat3D(char, c) {
  const hat = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({ color: c.main, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: c.trim, roughness: 0.8 });

  if (char === "nikolaus") {
    const mitre = new THREE.Mesh(new THREE.ConeGeometry(26, 62, 16), mainMat);
    mitre.position.y = 31;
    mitre.castShadow = true;
    hat.add(mitre);
    const band = new THREE.Mesh(new THREE.TorusGeometry(27, 7, 10, 20), trimMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 2;
    hat.add(band);
    const crossMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.3, metalness: 0.4 });
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), crossMat);
    vBar.position.set(0, 30, -24);
    hat.add(vBar);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 4), crossMat);
    hBar.position.set(0, 38, -24);
    hat.add(hBar);
  } else {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(28, 46, 16), mainMat);
    cone.position.set(4, 21, 0);
    cone.rotation.z = -0.18;
    cone.castShadow = true;
    hat.add(cone);
    const band = new THREE.Mesh(new THREE.TorusGeometry(28, 7, 10, 20), trimMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 2;
    hat.add(band);
    const pomMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const pom = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 12), pomMat);
    pom.position.set(16, 44, 0);
    hat.add(pom);
  }
  return hat;
}

// Baut eine Spielfigur komplett aus generischen, selbst entworfenen 3D-
// Grundformen (Lathe-Rundkoerper/Kapsel/Kugel/Kegel) - rundem Kopf statt
// Zylinder, ohne Noppen, ohne Trapez-Torso/Klauen, damit es garantiert kein
// LEGO-Design ist. side: 1 = links, -1 = rechts (steuert nur, in welcher
// Hand der Schlaeger sitzt).
function buildCharacterModel(char, side) {
  const c = CHAR_COLORS[char];
  const group = new THREE.Group();

  // --- Torso: glatter, rundlicher "Spielzeugfiguren"-Koerper (Lathe-Profil
  // um die Y-Achse rotiert) statt eckigem Kasten - bewusst KEIN Trapez/Box,
  // sieht freundlich-rundlich aus wie eine handgefertigte Holzfigur.
  const torsoMat = new THREE.MeshStandardMaterial({ color: c.main, roughness: 0.5 });
  const torsoProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(30, 3),
    new THREE.Vector2(35, 16),
    new THREE.Vector2(34, 32),
    new THREE.Vector2(29, 48),
    new THREE.Vector2(20, 58),
    new THREE.Vector2(13, 63),
    new THREE.Vector2(0, 65),
  ];
  const TORSO_TOP_Y = 65;
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 28), torsoMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Guertel als schlanker Ring um die breiteste Stelle des Torsos, plus
  // runde Schnalle vorne - statt eines eckigen Kastens.
  const beltMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.4 });
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(35.5, 35.5, 9, 28, 1, true), beltMat);
  belt.position.y = 22;
  group.add(belt);
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.25, metalness: 0.5 });
  const buckle = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 14), buckleMat);
  buckle.position.set(0, 22, -35.5);
  group.add(buckle);

  // --- Arme: weiche Kapseln statt Kaesten, mit runden "Fausthandschuh"-
  // Haenden statt Klauen. Jeder Arm haengt an einem eigenen Dreh-Pivot an
  // der Schulter, damit er sich beim Laufen/Schlagen glaubhaft um die
  // Schulter schwingen laesst (statt nur der Kapsel-Mesh selbst zu drehen,
  // was Hand/Schlaeger zurueckliesse). ---
  const armMat = new THREE.MeshStandardMaterial({ color: c.main, roughness: 0.5 });
  const armGeo = new THREE.CapsuleGeometry(9, 32, 6, 12);
  const handMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.65 });
  const handGeo = new THREE.SphereGeometry(12, 14, 14);
  const batMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.35 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5 });

  // side: 1 = Schlaeger in der rechten Hand (Figur steht links, Netz rechts),
  // -1 = Schlaeger in der linken Hand.
  function buildArmPivot(sx, isBatArm) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 41, 58, 0);
    const capsule = new THREE.Mesh(armGeo, armMat);
    capsule.position.set(0, -20, 0);
    capsule.rotation.z = sx > 0 ? -0.12 : 0.12;
    capsule.castShadow = true;
    pivot.add(capsule);
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(sx * 2, -42, 0);
    hand.castShadow = true;
    pivot.add(hand);
    if (isBatArm) {
      const bat = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 4, 24), batMat);
      bat.rotation.x = Math.PI / 2;
      bat.position.set(sx * 2, -42, -8);
      bat.castShadow = true;
      pivot.add(bat);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 2.4, 8, 24), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(bat.position);
      pivot.add(rim);
    }
    return pivot;
  }
  const armPivotL = buildArmPivot(-1, side === -1);
  const armPivotR = buildArmPivot(1, side === 1);
  group.add(armPivotL, armPivotR);
  group.userData.armBat = side === 1 ? armPivotR : armPivotL;
  group.userData.armOther = side === 1 ? armPivotL : armPivotR;

  // --- Fuesse: kleine, flache runde Stiefel statt Beinen - geben der
  // Figur einen stabilen, "geerdeten" Stand von oben betrachtet. ---
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.6 });
  const bootGeo = new THREE.SphereGeometry(14, 14, 10);
  const bootL = new THREE.Mesh(bootGeo, bootMat);
  bootL.position.set(-17, 4, 5);
  bootL.scale.set(1, 0.55, 1.35);
  const bootR = new THREE.Mesh(bootGeo, bootMat);
  bootR.position.set(17, 4, 5);
  bootR.scale.set(1, 0.55, 1.35);
  bootL.castShadow = true;
  bootR.castShadow = true;
  group.add(bootL, bootR);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2c788, roughness: 0.55 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(32, 26, 26), headMat);
  head.position.y = TORSO_TOP_Y + 32 - 6;
  head.castShadow = true;
  group.add(head);

  // Gesicht als Textur (wiederverwendet die 2D-Zeichenroutine) auf einer
  // Ebene direkt vor dem Kopf, zur Kamera ausgerichtet.
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 256;
  faceCanvas.height = 256;
  drawFaceDetails(faceCanvas.getContext("2d"), 128, 150, 78, char);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, alphaTest: 0.04 });
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(94, 94), faceMat);
  facePlane.position.set(0, head.position.y + 6, -31);
  facePlane.rotation.y = Math.PI;
  group.add(facePlane);

  const hat = buildHat3D(char, c);
  hat.position.y = head.position.y + 24;
  group.add(hat);

  return group;
}

function disposeObject3D(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

function buildCharacters() {
  if (charL) {
    scene.remove(charL);
    disposeObject3D(charL);
  }
  if (charR) {
    scene.remove(charR);
    disposeObject3D(charR);
  }
  charL = buildCharacterModel(state.p1Char, 1);
  charR = buildCharacterModel(state.p2Char, -1);
  scene.add(charL, charR);
}

function startGame() {
  canvas = document.getElementById("game-canvas");
  if (!renderer) initThree();
  buildCharacters();

  document.getElementById("score-name-left").textContent = CHAR_NAMES[state.p1Char];
  document.getElementById("score-name-right").textContent = CHAR_NAMES[state.p2Char];
  document.getElementById("controls-hint").textContent =
    state.players === 1
      ? "Du: W/S oder Finger auf der linken Seite ziehen"
      : "Spieler 1: W/S (links) · Spieler 2: Pfeil hoch/runter (rechts)";

  resetMatch();
  // Erst den Bildschirm sichtbar machen, DANACH die Groesse messen/setzen -
  // solange #screen-game "display: none" ist, liefert der Wrapper 0 Breite/Hoehe.
  showScreen("game");
  resizeCanvas();
  // removeEventListener vor addEventListener macht dies ueber mehrere
  // startGame()-Aufrufe hinweg idempotent (sonst sammeln sich bei jedem
  // "Nochmal spielen"/Neustart doppelte resize-Listener an).
  window.removeEventListener("resize", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  paddleL.y = LOGICAL_H / 2 - paddleL.h / 2;
  paddleR.y = LOGICAL_H / 2 - paddleR.h / 2;
  paused = false;
  gameOver = false;
  hideWinOverlay();
  // WICHTIG: zuerst alte Schleife/Listener stoppen, DANACH neue Controls
  // anhaengen - sonst wuerde das abschliessende detachControls() in
  // cancelGameLoop() die gerade gesetzten Tastatur-Listener sofort wieder
  // loeschen (Ursache des "W/S bewegt nichts"-Bugs bei "Nochmal spielen").
  cancelGameLoop();
  attachControls();
  startCountdownServe(Math.random() < 0.5 ? 1 : -1);
  rafId = requestAnimationFrame(loop);
}

function resetMatch() {
  scores.left = 0;
  scores.right = 0;
  updateScoreboard();
  gameOver = false;
  present.active = false;
  if (presentMesh) presentMesh.visible = false;
  presentSpawnTimer = randRange(6, 9);
  boostTimerL = 0;
  boostTimerR = 0;
  lastHitSide = null;
  paddleL.h = PADDLE_H_BASE;
  paddleR.h = PADDLE_H_BASE;
  animL.walkPhase = 0;
  animR.walkPhase = 0;
  animL.hitTimer = 0;
  animR.hitTimer = 0;
}

function resizeCanvas() {
  const wrap = document.getElementById("game-wrap");
  const maxW = wrap.clientWidth - 4;
  const maxH = wrap.clientHeight - 4;
  let w = maxW;
  let h = (w * LOGICAL_H) / LOGICAL_W;
  if (h > maxH) {
    h = maxH;
    w = (h * LOGICAL_W) / LOGICAL_H;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = LOGICAL_W / LOGICAL_H;
  camera.updateProjectionMatrix();
  paddleR.x = LOGICAL_W - 28 - paddleR.w;
}

function updateScoreboard() {
  document.getElementById("score-left").textContent = scores.left;
  document.getElementById("score-right").textContent = scores.right;
}

/* --------------------------- Eingabe -------------------------------- */
// Handler-Referenzen werden hier gemerkt, damit detachControls() sie exakt
// wieder entfernen kann (addEventListener statt onX-Zuweisung - robuster
// bei wiederholtem attachControls()/detachControls() ueber mehrere
// startGame()-Aufrufe hinweg, z.B. bei "Nochmal spielen").
let controlHandlers = null;

function attachControls() {
  const wrap = document.getElementById("game-wrap");

  const onKeyDown = (e) => {
    if (["w", "W"].includes(e.key)) input.wDown = true;
    if (["s", "S"].includes(e.key)) input.sDown = true;
    if (e.key === "ArrowUp") { input.upDown = true; e.preventDefault(); }
    if (e.key === "ArrowDown") { input.downDown = true; e.preventDefault(); }
    if (e.key === " " || e.key === "Escape") { togglePause(); e.preventDefault(); }
  };
  const onKeyUp = (e) => {
    if (["w", "W"].includes(e.key)) input.wDown = false;
    if (["s", "S"].includes(e.key)) input.sDown = false;
    if (e.key === "ArrowUp") input.upDown = false;
    if (e.key === "ArrowDown") input.downDown = false;
  };

  const handleTouch = (e) => {
    // Touches auf UI-Buttons (Pause, Sieg-Overlay "Nochmal spielen"/"Zum
    // Startbildschirm") NICHT abfangen - sonst wuerde preventDefault() das
    // synthetische Klick-Event unterdruecken und die Buttons waeren auf
    // Touch-Geraeten wirkungslos (Ursache des "Zurueck zum Start"/"Nochmal
    // spielen" funktioniert nicht auf dem Handy"-Bugs).
    if (e.target.closest("#win-overlay, #btn-pause")) return;
    const rect = canvas.getBoundingClientRect();
    input.touchLeftY = null;
    input.touchRightY = null;
    for (const t of e.touches) {
      const relX = t.clientX - rect.left;
      const relY = ((t.clientY - rect.top) / rect.height) * LOGICAL_H;
      if (relX < rect.width / 2) input.touchLeftY = relY;
      else input.touchRightY = relY;
    }
    e.preventDefault();
  };
  const onTouchEnd = (e) => {
    if (e.target.closest("#win-overlay, #btn-pause")) return;
    if (e.touches.length === 0) {
      input.touchLeftY = null;
      input.touchRightY = null;
    } else {
      handleTouch(e);
    }
  };

  // Maus-Unterstützung (Desktop): linke Haelfte = Spieler 1 ziehen
  const onMouseMove = (e) => {
    if (!e.buttons) return;
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
    if (relX < rect.width / 2) input.touchLeftY = relY;
    else if (state.players === 2) input.touchRightY = relY;
  };
  const onMouseLeave = () => {
    input.touchLeftY = null;
    input.touchRightY = null;
  };
  // Beim Loslassen der Maustaste die Maussteuerung wieder freigeben, sonst
  // bliebe die zuletzt gezogene Position fuer immer "eingerastet" und
  // blockiert danach die Tastatursteuerung (input.touchLeftY !== null).
  const onMouseUp = () => {
    input.touchLeftY = null;
    input.touchRightY = null;
  };

  controlHandlers = { wrap, onKeyDown, onKeyUp, handleTouch, onTouchEnd, onMouseMove, onMouseLeave, onMouseUp };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  wrap.addEventListener("touchstart", handleTouch, { passive: false });
  wrap.addEventListener("touchmove", handleTouch, { passive: false });
  wrap.addEventListener("touchend", onTouchEnd, { passive: false });
  wrap.addEventListener("mousemove", onMouseMove);
  wrap.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("mouseup", onMouseUp);
}

function detachControls() {
  if (!controlHandlers) return;
  const { wrap, onKeyDown, onKeyUp, handleTouch, onTouchEnd, onMouseMove, onMouseLeave, onMouseUp } = controlHandlers;
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  wrap.removeEventListener("touchstart", handleTouch, { passive: false });
  wrap.removeEventListener("touchmove", handleTouch, { passive: false });
  wrap.removeEventListener("touchend", onTouchEnd, { passive: false });
  wrap.removeEventListener("mousemove", onMouseMove);
  wrap.removeEventListener("mouseleave", onMouseLeave);
  window.removeEventListener("mouseup", onMouseUp);
  controlHandlers = null;
}

/* --------------------------- Spiellogik ------------------------------ */
function serveBall(direction) {
  ball.x = LOGICAL_W / 2;
  ball.y = LOGICAL_H / 2;
  ball.speed = 6.2;
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI; // leichte Zufallsrichtung
  ball.vx = Math.cos(angle) * ball.speed * direction;
  ball.vy = Math.sin(angle) * ball.speed;
}

function startCountdownServe(direction) {
  countdownActive = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.x = LOGICAL_W / 2;
  ball.y = LOGICAL_H / 2;
  const el = document.getElementById("countdown");
  let n = 3;
  el.textContent = n;
  const tick = () => {
    n -= 1;
    if (n > 0) {
      el.textContent = n;
      setTimeout(tick, 500);
    } else {
      el.textContent = "";
      serveBall(direction);
      countdownActive = false;
    }
  };
  setTimeout(tick, 500);
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  document.getElementById("btn-pause").textContent = paused ? "▶" : "⏸";
}

function cancelGameLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  detachControls();
}

function hideWinOverlay() {
  document.getElementById("win-overlay").classList.add("hidden");
}

function showWinOverlay(winnerSide) {
  gameOver = true;
  const winnerChar = winnerSide === "left" ? state.p1Char : state.p2Char;
  let text;
  if (state.players === 1) {
    text = winnerSide === "left" ? "🎉 Du hast gewonnen! 🎉" : `${CHAR_NAMES[winnerChar]} (Computer) hat gewonnen!`;
  } else {
    text = `🎉 ${CHAR_NAMES[winnerChar]} hat gewonnen! 🎉`;
  }
  document.getElementById("win-text").textContent = text;
  document.getElementById("win-overlay").classList.remove("hidden");
  sfxWin();
}

let lastTime = null;
function loop(ts) {
  rafId = requestAnimationFrame(loop);
  if (lastTime === null) lastTime = ts;
  let dt = (ts - lastTime) / 1000;
  lastTime = ts;
  dt = Math.min(dt, 0.033); // Stabilität bei Tab-Wechsel

  if (!paused && !gameOver) {
    update(dt);
  }
  updateSnowfall(dt, snowPoints);
  draw();
}

function update(dt) {
  // Geschenk-Power-up anwenden: waehrend boostTimer > 0 ist der jeweilige
  // Schlaeger (Trefferflaeche) groesser - rein additiv, aendert sonst nichts
  // an der bestehenden Physik/Logik.
  if (boostTimerL > 0) {
    boostTimerL = Math.max(0, boostTimerL - dt);
    paddleL.h = PADDLE_H_BOOST;
  } else {
    paddleL.h = PADDLE_H_BASE;
  }
  if (boostTimerR > 0) {
    boostTimerR = Math.max(0, boostTimerR - dt);
    paddleR.h = PADDLE_H_BOOST;
  } else {
    paddleR.h = PADDLE_H_BASE;
  }

  // --- Spieler 1 (links) ---
  if (input.touchLeftY !== null) {
    const target = input.touchLeftY - paddleL.h / 2;
    paddleL.y += (target - paddleL.y) * Math.min(1, dt * 12);
  } else {
    if (input.wDown) paddleL.y -= PADDLE_SPEED * dt;
    if (input.sDown) paddleL.y += PADDLE_SPEED * dt;
  }
  paddleL.y = clamp(paddleL.y, 0, LOGICAL_H - paddleL.h);

  // --- Spieler 2 (rechts) oder Bot ---
  if (state.players === 2) {
    if (input.touchRightY !== null) {
      const target = input.touchRightY - paddleR.h / 2;
      paddleR.y += (target - paddleR.y) * Math.min(1, dt * 12);
    } else {
      if (input.upDown) paddleR.y -= PADDLE_SPEED * dt;
      if (input.downDown) paddleR.y += PADDLE_SPEED * dt;
    }
  } else {
    updateBot(dt);
  }
  paddleR.y = clamp(paddleR.y, 0, LOGICAL_H - paddleR.h);

  // Rein kosmetische Figuren-Animation: erkennt Bewegung anhand der
  // tatsaechlichen Position (funktioniert fuer Tastatur, Touch UND Bot
  // gleichermassen) und steuert damit Lauf-Bob/Arm-Schwung in draw().
  const movedL = Math.abs(paddleL.y - prevPaddleLY) > 0.05;
  const movedR = Math.abs(paddleR.y - prevPaddleRY) > 0.05;
  prevPaddleLY = paddleL.y;
  prevPaddleRY = paddleR.y;
  animL.walkPhase += dt * (movedL ? 11 : 3.2);
  animR.walkPhase += dt * (movedR ? 11 : 3.2);
  if (animL.hitTimer > 0) animL.hitTimer = Math.max(0, animL.hitTimer - dt / 0.26);
  if (animR.hitTimer > 0) animR.hitTimer = Math.max(0, animR.hitTimer - dt / 0.26);

  if (countdownActive) return;

  // --- Ball bewegen ---
  ball.x += ball.vx * 60 * dt;
  ball.y += ball.vy * 60 * dt;

  // Wand oben/unten
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy *= -1;
    sfxWall();
  } else if (ball.y + ball.r > LOGICAL_H) {
    ball.y = LOGICAL_H - ball.r;
    ball.vy *= -1;
    sfxWall();
  }

  // Geschenk-Power-up: zufaellig auftauchen lassen und auf Treffer durch den
  // Ball pruefen (gleiches Prinzip wie die Schlaeger-Kollision unten, rein
  // additiv zur bestehenden Ball-Logik).
  presentSpawnTimer -= dt;
  if (!present.active && presentSpawnTimer <= 0) {
    spawnPresent();
  }
  if (present.active) {
    const dx = ball.x - present.x;
    const dy = ball.y - present.y;
    const rr = ball.r + present.r;
    if (dx * dx + dy * dy <= rr * rr) {
      collectPresent();
    }
  }

  // Schläger links
  if (
    ball.vx < 0 &&
    ball.x - ball.r <= paddleL.x + paddleL.w &&
    ball.x - ball.r >= paddleL.x - 20 &&
    ball.y >= paddleL.y - ball.r &&
    ball.y <= paddleL.y + paddleL.h + ball.r
  ) {
    bounceOffPaddle(paddleL, 1);
  }

  // Schläger rechts
  if (
    ball.vx > 0 &&
    ball.x + ball.r >= paddleR.x &&
    ball.x + ball.r <= paddleR.x + paddleR.w + 20 &&
    ball.y >= paddleR.y - ball.r &&
    ball.y <= paddleR.y + paddleR.h + ball.r
  ) {
    bounceOffPaddle(paddleR, -1);
  }

  // Punkt für rechts (Ball links raus)
  if (ball.x + ball.r < 0) {
    scores.right += 1;
    updateScoreboard();
    sfxScore();
    if (scores.right >= WIN_SCORE) showWinOverlay("right");
    else startCountdownServe(1);
  } else if (ball.x - ball.r > LOGICAL_W) {
    scores.left += 1;
    updateScoreboard();
    sfxScore();
    if (scores.left >= WIN_SCORE) showWinOverlay("left");
    else startCountdownServe(-1);
  }
}

function bounceOffPaddle(paddle, dirSign) {
  const relative = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2); // -1..1
  const maxAngle = (Math.PI / 180) * 55;
  const angle = relative * maxAngle;
  ball.speed = Math.min(ball.speed * 1.08, 15.5);
  ball.vx = Math.cos(angle) * ball.speed * dirSign;
  ball.vy = Math.sin(angle) * ball.speed;
  // Ball leicht aus dem Schläger herausschieben, damit er nicht haengen bleibt
  ball.x = dirSign > 0 ? paddle.x + paddle.w + ball.r + 1 : paddle.x - ball.r - 1;
  sfxHit();

  // Rein kosmetisch: merken wer getroffen hat (fuer Geschenk-Power-up) und
  // einen kurzen Schlag-Impuls fuer die Arm-Animation in draw() ausloesen.
  if (paddle === paddleL) {
    lastHitSide = "left";
    animL.hitTimer = 1;
  } else {
    lastHitSide = "right";
    animR.hitTimer = 1;
  }
}

function spawnPresent() {
  // Spawnt in der mittleren Tischzone, nicht zu nah an den Schlaegern/Raendern.
  present.x = randRange(LOGICAL_W * 0.35, LOGICAL_W * 0.65);
  present.y = randRange(40, LOGICAL_H - 40);
  present.active = true;
  presentSpawnTimer = randRange(9, 14);
}

function collectPresent() {
  present.active = false;
  if (presentMesh) presentMesh.visible = false;
  if (lastHitSide === "left") boostTimerL = POWERUP_DURATION;
  else if (lastHitSide === "right") boostTimerR = POWERUP_DURATION;
  sfxPresent();
}

function updateBot(dt) {
  // Einfache, aber nicht perfekte KI: reagiert nur wenn der Ball sich naehert,
  // mit begrenzter Geschwindigkeit und etwas "Zielfehler" fuer Fairness.
  const center = paddleR.y + paddleR.h / 2;
  let target = center;
  if (ball.vx > 0) {
    target = ball.y + Math.sin(Date.now() / 150) * 8;
  } else {
    target = LOGICAL_H / 2;
  }
  const diff = target - center;
  const maxStep = BOT_MAX_SPEED * dt;
  const step = clamp(diff, -maxStep, maxStep);
  paddleR.y += step;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Rein kosmetische Figuren-Animation: Lauf-Bob/Wackeln anhand walkPhase,
// Arm-Schwung des "freien" Arms, Schlaeger-Schwung + leichtes Stauchen beim
// Treffer, und leichtes Groesser-Wachsen waehrend des Geschenk-Power-ups.
// Beeinflusst nur Three.js-Objekte, keine Logik/Physik.
function applyCharacterAnim(group, anim, boosted, baseX, baseZ) {
  if (!group) return;
  const bob = Math.abs(Math.sin(anim.walkPhase)) * 4.5;
  group.position.set(baseX, bob, baseZ);
  group.rotation.z = Math.sin(anim.walkPhase * 2) * 0.025;

  const otherArm = group.userData.armOther;
  if (otherArm) otherArm.rotation.x = Math.sin(anim.walkPhase) * 0.45;

  const batArm = group.userData.armBat;
  if (batArm) {
    const swing = Math.sin(anim.hitTimer * Math.PI) * 1.1; // 0 am Anfang/Ende, Spitze in der Mitte
    batArm.rotation.x = Math.sin(anim.walkPhase) * 0.2 - swing;
  }

  const boostScale = boosted ? 1.15 : 1;
  const hitSquash = 1 - Math.sin(anim.hitTimer * Math.PI) * 0.06;
  group.scale.set(boostScale, boostScale * hitSquash, boostScale);
}

/* ------------------------------ Zeichnen ------------------------------ */
function draw() {
  if (charL) {
    applyCharacterAnim(
      charL,
      animL,
      boostTimerL > 0,
      worldX(paddleL.x + paddleL.w / 2),
      worldZ(paddleL.y + paddleL.h / 2)
    );
  }
  if (charR) {
    applyCharacterAnim(
      charR,
      animR,
      boostTimerR > 0,
      worldX(paddleR.x + paddleR.w / 2),
      worldZ(paddleR.y + paddleR.h / 2)
    );
  }
  if (ballMesh) {
    const progress = clamp(ball.x / LOGICAL_W, 0, 1);
    const arc = BALL_ARC_HEIGHT * Math.sin(Math.PI * progress);
    ballMesh.position.set(worldX(ball.x), BALL_VISUAL_R + arc, worldZ(ball.y));
  }
  if (presentMesh) {
    presentMesh.visible = present.active;
    if (present.active) {
      const t = performance.now() / 1000;
      presentMesh.position.set(worldX(present.x), 18 + Math.sin(t * 2.2) * 4, worldZ(present.y));
      presentMesh.rotation.y = t * 1.4;
    }
  }
  renderer.render(scene, camera);
}
