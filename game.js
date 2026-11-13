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
  nikolaus: { main: "#b5281f", trim: "#f5f7fa", accent: "#d4af37" },
  weihnachtsmann: { main: "#e0342a", trim: "#f5f7fa", accent: "#2e7d32" },
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
// Zeichnet eine kleine, komplett selbst entworfene "Spielzeug-Klötzchen"-Figur
// (generische, chunky Blockform mit rundem Kopf - bewusst KEIN LEGO-Design:
// kein zylindrischer gelber Kopf, keine Stud-Noppen, keine Trapez-Torso-Form/
// Klauenhände). char: "nikolaus" (Bischofsmütze) oder "weihnachtsmann" (Zipfelmütze)
function drawCharacterBust(ctx, cx, cy, r, char) {
  const c = CHAR_COLORS[char];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = "round";

  // weicher Schatten unter der Figur
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(r * 0.05, r * 1.55, r * 0.9, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- Torso: chunky, gerundeter "Spielzeug-Block" (kein LEGO-Trapez) ---
  ctx.fillStyle = shade(c.main, -6);
  roundRectPath(ctx, -r * 0.95, r * 0.45, r * 1.9, r * 1.15, r * 0.32);
  ctx.fill();
  // Highlight-Kante oben links (Plastik-Glanz)
  ctx.fillStyle = shade(c.main, 22);
  roundRectPath(ctx, -r * 0.95, r * 0.45, r * 1.9, r * 0.32, r * 0.3);
  ctx.fill();
  // Umriss
  ctx.strokeStyle = "rgba(30,20,15,0.55)";
  ctx.lineWidth = Math.max(1.2, r * 0.045);
  roundRectPath(ctx, -r * 0.95, r * 0.45, r * 1.9, r * 1.15, r * 0.32);
  ctx.stroke();
  // Gürtel/Knöpfe
  ctx.fillStyle = c.accent;
  roundRectPath(ctx, -r * 0.5, r * 0.98, r, r * 0.16, r * 0.06);
  ctx.fill();

  // --- Arme (blockig, Stummel-"Mitten"-Hände statt Klauen) ---
  ctx.fillStyle = c.main;
  roundRectPath(ctx, -r * 1.25, r * 0.55, r * 0.34, r * 0.85, r * 0.17);
  ctx.fill();
  roundRectPath(ctx, r * 0.91, r * 0.55, r * 0.34, r * 0.85, r * 0.17);
  ctx.fill();
  ctx.fillStyle = "#f2f2f2";
  ctx.beginPath();
  ctx.arc(-r * 1.08, r * 1.42, r * 0.2, 0, Math.PI * 2);
  ctx.arc(r * 1.08, r * 1.42, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // --- Kopf: rund (ausdrücklich kein Zylinder) ---
  const faceGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.1, 0, 0, r * 0.7);
  faceGrad.addColorStop(0, "#ffe6bd");
  faceGrad.addColorStop(1, "#f2c788");
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,20,15,0.4)";
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();

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

  // Augen mit Glanzpunkt (einfache Punkte, nicht LEGO-typische Striche)
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
  // leichte Bartstruktur
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

  if (char === "nikolaus") {
    // Bischofsmütze (Mitra): hohe, gespaltene rote Mütze mit weißem Rand und goldenem Kreuz
    const mitreGrad = ctx.createLinearGradient(0, -r * 1.65, 0, -r * 0.42);
    mitreGrad.addColorStop(0, shade(c.main, 20));
    mitreGrad.addColorStop(1, shade(c.main, -10));
    ctx.fillStyle = mitreGrad;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.42);
    ctx.quadraticCurveTo(-r * 0.3, -r * 1.55, 0, -r * 1.65);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.55, r * 0.62, -r * 0.42);
    ctx.closePath();
    ctx.fill();
    // Mittelgrat-Highlight
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.6);
    ctx.lineTo(0, -r * 0.5);
    ctx.stroke();
    // weißer Rand mit Fellstruktur
    drawFurBand(ctx, 0, -r * 0.42, r * 0.66, r * 0.17, c.trim);
    // goldenes Kreuz
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5);
    ctx.lineTo(0, -r * 0.6);
    ctx.moveTo(-r * 0.16, -r * 1.1);
    ctx.lineTo(r * 0.16, -r * 1.1);
    ctx.stroke();
  } else {
    // Weihnachtsmann: runde Zipfelmütze mit Bommel
    const hatGrad = ctx.createLinearGradient(0, -r * 1.5, 0, -r * 0.35);
    hatGrad.addColorStop(0, shade(c.main, 20));
    hatGrad.addColorStop(1, shade(c.main, -10));
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.35);
    ctx.quadraticCurveTo(-r * 0.75, -r * 1.3, r * 0.15, -r * 1.5);
    ctx.quadraticCurveTo(r * 0.85, -r * 1.35, r * 0.62, -r * 0.35);
    ctx.closePath();
    ctx.fill();
    // weißer Rand mit Fellstruktur
    drawFurBand(ctx, 0, -r * 0.4, r * 0.68, r * 0.18, c.trim);
    // Bommel
    const pomGrad = ctx.createRadialGradient(r * 0.62, -r * 1.48, r * 0.02, r * 0.68, -r * 1.42, r * 0.17);
    pomGrad.addColorStop(0, "#ffffff");
    pomGrad.addColorStop(1, "#e3e3e3");
    ctx.fillStyle = pomGrad;
    ctx.beginPath();
    ctx.arc(r * 0.68, -r * 1.42, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

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
function roundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Heller/dunkler Farbton einer Hex-Farbe berechnen (percent: -100..100)
function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `rgb(${r}, ${g}, ${b})`;
}

// Zeichnet einen fellartigen weißen Rand (kleine Knubbel statt glatter Ellipse)
function drawFurBand(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const bumps = 10;
  for (let i = 0; i <= bumps; i++) {
    const t = i / bumps;
    const bx = cx - rx + t * rx * 2;
    ctx.beginPath();
    ctx.arc(bx, cy - ry * 0.15, ry * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderCharacterPreviews() {
  document.querySelectorAll(".char-preview").forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCharacterBust(ctx, canvas.width / 2, canvas.height / 1.55, canvas.width * 0.26, canvas.dataset.preview);
  });
}
renderCharacterPreviews();

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

const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 11, speed: 6.2 };
const paddleL = { x: 28, y: 0, w: 16, h: 95, vy: 0 };
const paddleR = { x: 0, y: 0, w: 16, h: 95, vy: 0 };
const PADDLE_SPEED = 430; // px/sec logical
const BOT_MAX_SPEED = 330;
const scores = { left: 0, right: 0 };

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
// vielen kleinen Schneeflocken, die ueber der Szene langsam herabfallen und
// unten wieder nach oben "recycled" werden (rein kosmetisch).
let snowPositions = null;
let snowSpeeds = null;
function buildSnowfall() {
  const count = 260;
  const spread = 1400;
  const topY = 500;
  const bottomY = -180;
  const geo = new THREE.BufferGeometry();
  snowPositions = new Float32Array(count * 3);
  snowSpeeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * spread;
    snowPositions[i * 3 + 1] = bottomY + Math.random() * (topY - bottomY);
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    snowSpeeds[i] = 16 + Math.random() * 28;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 5,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.topY = topY;
  points.userData.bottomY = bottomY;
  return points;
}

function updateSnowfall(dt, snow) {
  if (!snow || !snowPositions) return;
  const pos = snow.geometry.attributes.position.array;
  const { topY, bottomY } = snow.userData;
  for (let i = 0; i < snowSpeeds.length; i++) {
    pos[i * 3 + 1] -= snowSpeeds[i] * dt;
    if (pos[i * 3 + 1] < bottomY) pos[i * 3 + 1] = topY;
  }
  snow.geometry.attributes.position.needsUpdate = true;
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
  // Haenden statt Klauen. ---
  const armMat = new THREE.MeshStandardMaterial({ color: c.main, roughness: 0.5 });
  const armGeo = new THREE.CapsuleGeometry(9, 32, 6, 12);
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-41, 38, 0);
  armL.rotation.z = 0.12;
  armL.castShadow = true;
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(41, 38, 0);
  armR.rotation.z = -0.12;
  armR.castShadow = true;
  group.add(armL, armR);

  const handMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.65 });
  const handGeo = new THREE.SphereGeometry(12, 14, 14);
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-43, 16, 0);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(43, 16, 0);
  handL.castShadow = true;
  handR.castShadow = true;
  group.add(handL, handR);

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

  // Tischtennis-Schlaeger in der zum Netz zeigenden Hand
  const batMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.35 });
  const bat = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 4, 24), batMat);
  bat.rotation.x = Math.PI / 2;
  bat.position.set(side * 43, 16, -8);
  bat.castShadow = true;
  group.add(bat);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 2.4, 8, 24), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(bat.position);
  group.add(rim);

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
function attachControls() {
  window.onkeydown = (e) => {
    if (["w", "W"].includes(e.key)) input.wDown = true;
    if (["s", "S"].includes(e.key)) input.sDown = true;
    if (e.key === "ArrowUp") { input.upDown = true; e.preventDefault(); }
    if (e.key === "ArrowDown") { input.downDown = true; e.preventDefault(); }
    if (e.key === " " || e.key === "Escape") { togglePause(); e.preventDefault(); }
  };
  window.onkeyup = (e) => {
    if (["w", "W"].includes(e.key)) input.wDown = false;
    if (["s", "S"].includes(e.key)) input.sDown = false;
    if (e.key === "ArrowUp") input.upDown = false;
    if (e.key === "ArrowDown") input.downDown = false;
  };

  const wrap = document.getElementById("game-wrap");
  const handleTouch = (e) => {
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
  wrap.ontouchstart = handleTouch;
  wrap.ontouchmove = handleTouch;
  wrap.ontouchend = (e) => {
    if (e.touches.length === 0) {
      input.touchLeftY = null;
      input.touchRightY = null;
    } else {
      handleTouch(e);
    }
  };

  // Maus-Unterstützung (Desktop): linke Haelfte = Spieler 1 ziehen
  wrap.onmousemove = (e) => {
    if (!e.buttons) return;
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
    if (relX < rect.width / 2) input.touchLeftY = relY;
    else if (state.players === 2) input.touchRightY = relY;
  };
  wrap.onmouseleave = () => {
    input.touchLeftY = null;
    input.touchRightY = null;
  };
  // Beim Loslassen der Maustaste die Maussteuerung wieder freigeben, sonst
  // bliebe die zuletzt gezogene Position fuer immer "eingerastet" und
  // blockiert danach die Tastatursteuerung (input.touchLeftY !== null).
  window.onmouseup = () => {
    input.touchLeftY = null;
    input.touchRightY = null;
  };
}

function detachControls() {
  window.onkeydown = null;
  window.onkeyup = null;
  window.onmouseup = null;
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

/* ------------------------------ Zeichnen ------------------------------ */
function draw() {
  if (charL) {
    charL.position.set(worldX(paddleL.x + paddleL.w / 2), 0, worldZ(paddleL.y + paddleL.h / 2));
  }
  if (charR) {
    charR.position.set(worldX(paddleR.x + paddleR.w / 2), 0, worldZ(paddleR.y + paddleR.h / 2));
  }
  if (ballMesh) {
    const progress = clamp(ball.x / LOGICAL_W, 0, 1);
    const arc = BALL_ARC_HEIGHT * Math.sin(Math.PI * progress);
    ballMesh.position.set(worldX(ball.x), BALL_VISUAL_R + arc, worldZ(ball.y));
  }
  renderer.render(scene, camera);
}
