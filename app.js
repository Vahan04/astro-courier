const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayText = document.querySelector("#overlay-text");
const startButton = document.querySelector("#start-button");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const levelEl = document.querySelector("#level");

const keys = new Set();
const state = { running: false, score: 0, level: 1, last: 0, spawn: 0, crystals: 0, elapsed: 0, best: Number(localStorage.getItem("astro-courier-best") || 0) };
const ship = { x: 0, y: 0, r: 16, speed: 320 };
let asteroids = [], energy = [], stars = [];
bestEl.textContent = state.best;

function resize() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = box.width * ratio; canvas.height = box.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (!state.running) { ship.x = box.width / 2; ship.y = box.height * 0.78; }
}
window.addEventListener("resize", resize); resize();

function reset() {
  const box = canvas.getBoundingClientRect();
  state.score = 0; state.level = 1; state.spawn = 0; state.crystals = 0; state.elapsed = 0;
  ship.x = box.width / 2; ship.y = box.height * 0.78;
  asteroids = []; energy = [];
  stars = Array.from({ length: 90 }, () => ({ x: Math.random() * box.width, y: Math.random() * box.height, s: Math.random() * 1.8 + 0.3, a: Math.random() * 0.7 + 0.2 }));
  updateStats();
}
function updateStats() { scoreEl.textContent = state.score; levelEl.textContent = state.level; bestEl.textContent = state.best; }
function start() { reset(); state.running = true; overlay.classList.add("hidden"); state.last = performance.now(); requestAnimationFrame(loop); }
function end() {
  state.running = false;
  if (state.score > state.best) { state.best = state.score; localStorage.setItem("astro-courier-best", state.best); }
  updateStats(); overlayTitle.textContent = "Mission complete"; overlayText.textContent = `You delivered ${state.crystals} crystal${state.crystals === 1 ? "" : "s"}. Score: ${state.score}.`; startButton.textContent = "Try again"; overlay.classList.remove("hidden");
}
function circleHit(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy) < a.r + b.r; }

function update(dt) {
  const box = canvas.getBoundingClientRect();
  const dx = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
  const dy = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
  ship.x = Math.max(ship.r, Math.min(box.width - ship.r, ship.x + dx * ship.speed * dt));
  ship.y = Math.max(ship.r, Math.min(box.height - ship.r, ship.y + dy * ship.speed * dt));
  state.level = 1 + Math.floor(state.score / 100);
  state.spawn -= dt;
  if (state.spawn <= 0) {
    state.spawn = Math.max(0.23, 0.75 - state.level * 0.045);
    const r = 13 + Math.random() * 19;
    asteroids.push({ x: r + Math.random() * (box.width - r * 2), y: -r, r, v: 90 + Math.random() * 80 + state.level * 16, spin: Math.random() * 6 });
    if (Math.random() < 0.35) energy.push({ x: 16 + Math.random() * (box.width - 32), y: -15, r: 9, v: 85 + Math.random() * 45 });
  }
  asteroids.forEach(a => { a.y += a.v * dt; a.spin += dt; });
  energy.forEach(e => e.y += e.v * dt);
  asteroids = asteroids.filter(a => a.y < box.height + a.r);
  energy = energy.filter(e => e.y < box.height + e.r);
  for (const a of asteroids) if (circleHit(ship, a)) return end();
  energy = energy.filter(e => { if (circleHit(ship, e)) { state.score += 25; state.crystals++; return false; } return true; });
  state.elapsed += dt;
  state.score = Math.floor(state.elapsed * 10) + state.crystals * 25;
  updateStats();
}

function draw() {
  const box = canvas.getBoundingClientRect();
  const gradient = ctx.createLinearGradient(0, 0, 0, box.height); gradient.addColorStop(0, "#0d1836"); gradient.addColorStop(1, "#070b17"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, box.width, box.height);
  stars.forEach(s => { ctx.globalAlpha = s.a; ctx.fillStyle = "#b9d3ff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
  energy.forEach(e => { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI / 4); ctx.shadowBlur = 18; ctx.shadowColor = "#5ce1e6"; ctx.fillStyle = "#5ce1e6"; ctx.fillRect(-e.r * 0.72, -e.r * 0.72, e.r * 1.44, e.r * 1.44); ctx.restore(); });
  asteroids.forEach(a => { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.spin); ctx.fillStyle = "#ff9e64"; ctx.shadowBlur = 15; ctx.shadowColor = "rgba(255,158,100,.4)"; ctx.beginPath(); for (let i = 0; i < 9; i++) { const r = a.r * (0.78 + Math.sin(i * 4.2) * 0.16); const angle = i * Math.PI * 2 / 9; ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); });
  ctx.save(); ctx.translate(ship.x, ship.y); ctx.shadowBlur = 25; ctx.shadowColor = "#5ce1e6"; ctx.fillStyle = "#e8ffff"; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(14, 15); ctx.lineTo(0, 9); ctx.lineTo(-14, 15); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#5ce1e6"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function loop(now) { if (!state.running) return; const dt = Math.min((now - state.last) / 1000, 0.04); state.last = now; update(dt); draw(); if (state.running) requestAnimationFrame(loop); }
window.addEventListener("keydown", e => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault(); keys.add(e.key.toLowerCase()); });
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
startButton.addEventListener("click", start);
