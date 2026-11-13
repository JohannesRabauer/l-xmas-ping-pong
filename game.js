// Nikolaus gegen Weihnachtsmann - Tischtennis
// Ein originales Weihnachts-Pong-Spiel. Alle Figuren werden selbst gezeichnet
// (keine Bilder/Logos Dritter), daher keine Urheberrechts- oder Markenprobleme.
"use strict";

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

let canvas, ctx;
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

const input = {
  wDown: false,
  sDown: false,
  upDown: false,
  downDown: false,
  touchLeftY: null,
  touchRightY: null,
};

function startGame() {
  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  document.getElementById("score-name-left").textContent = CHAR_NAMES[state.p1Char];
  document.getElementById("score-name-right").textContent = CHAR_NAMES[state.p2Char];
  document.getElementById("controls-hint").textContent =
    state.players === 1
      ? "Du: W/S oder Finger auf der linken Seite ziehen"
      : "Spieler 1: W/S (links) · Spieler 2: Pfeil hoch/runter (rechts)";

  resetMatch();
  showScreen("game");
  paddleL.y = LOGICAL_H / 2 - paddleL.h / 2;
  paddleR.y = LOGICAL_H / 2 - paddleR.h / 2;
  paused = false;
  gameOver = false;
  hideWinOverlay();
  attachControls();
  startCountdownServe(Math.random() < 0.5 ? 1 : -1);
  cancelGameLoop();
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
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(LOGICAL_W * dpr);
  canvas.height = Math.round(LOGICAL_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
}

function detachControls() {
  window.onkeydown = null;
  window.onkeyup = null;
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
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Tisch
  ctx.fillStyle = "#0e3b24";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Mittellinie (Netz)
  ctx.strokeStyle = "#dfe9e2";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(LOGICAL_W / 2, 6);
  ctx.lineTo(LOGICAL_W / 2, LOGICAL_H - 6);
  ctx.stroke();
  ctx.setLineDash([]);

  // Spielfeldrand
  ctx.strokeStyle = "#c6d6cd";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, LOGICAL_W - 6, LOGICAL_H - 6);

  drawPaddle(paddleL, state.p1Char, 1);
  drawPaddle(paddleR, state.p2Char, -1);

  // Ball (wie ein Tischtennisball)
  ctx.save();
  ctx.translate(ball.x, ball.y);
  const grad = ctx.createRadialGradient(-ball.r * 0.3, -ball.r * 0.3, 1, 0, 0, ball.r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#dfe3e6");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c0392b55";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r - 1, 0.3, 1.8);
  ctx.stroke();
  ctx.restore();
}

function drawPaddle(paddle, char, facing) {
  const c = CHAR_COLORS[char];
  ctx.save();
  ctx.fillStyle = c.main;
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 7);
  ctx.fill();
  ctx.fillStyle = c.trim;
  roundRect(ctx, paddle.x + (facing > 0 ? paddle.w - 4 : 0), paddle.y + 6, 4, paddle.h - 12, 2);
  ctx.fill();
  ctx.restore();

  const headX = facing > 0 ? paddle.x - 18 : paddle.x + paddle.w + 18;
  const headY = paddle.y + paddle.h / 2;
  drawCharacterBust(ctx, headX, headY, 22, char);
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}
