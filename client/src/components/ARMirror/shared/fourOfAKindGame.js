import { createOffscreenCanvas, drawMirroredVideo, drawSegmentedPerson } from './mirrorUtils.js';
import { getBlendshapeScore } from '../mediaPipeTracker.js';

// ─── CONFIGURATION (single config object at top of main game file) ───
export const FOUR_OF_A_KIND_CONFIG = {
  eventName: 'FOUR OF A KIND',
  watermark: 'fourof.kind',
  brandSubtitle: 'Step in front of the mirror',
  durationMs: 90_000,
  captureCountdownSec: 5,
  qrHoldMs: 10_000,
  qrResetMs: 15_000,
  artworkWidth: 1920,
  artworkHeight: 1080,
  stillOrbitMs: 3000,
  proximityScreenFraction: 0.25,
  velocityStill: 0.01,
  velocitySlow: 0.05,
  velocityMedium: 0.1,
  smileThreshold: 0.55,
  laughJawThreshold: 0.6,
  surpriseEyeThreshold: 0.7,
  ui: {
    background: '#05050F',
    textPrimary: '#F0EDE6',
    textSecondary: '#8A8A9A',
    titleLetterSpacing: '0.2em',
  },
  elements: [
    { id: 'fire', label: 'FIRE', icon: '🔥', colors: ['#FF4500', '#FFB347'] },
    { id: 'water', label: 'WATER', icon: '🌊', colors: ['#0077B6', '#00B4D8'] },
    { id: 'earth', label: 'EARTH', icon: '🌿', colors: ['#2D6A4F', '#FFD700'] },
    { id: 'lightning', label: 'LIGHTNING', icon: '⚡', colors: ['#7B2FBE', '#E0AAFF'] },
  ],
  phases: [
    { id: 'awakening', name: 'AWAKENING', startMs: 0, endMs: 5000 },
    { id: 'emergence', name: 'EMERGENCE', startMs: 5000, endMs: 20000 },
    { id: 'intensify', name: 'AWAKENING', startMs: 20000, endMs: 40000 },
    { id: 'convergence', name: 'CONVERGENCE', startMs: 40000, endMs: 60000 },
    { id: 'magic', name: 'MOMENT OF MAGIC', startMs: 60000, endMs: 75000 },
    { id: 'capture', name: 'CAPTURE', startMs: 75000, endMs: 90000 },
  ],
  fonts: {
    display: '"Cinzel Decorative", serif',
    body: '"Raleway", sans-serif',
  },
};

const CFG = FOUR_OF_A_KIND_CONFIG;
const ELEMENT_IDS = CFG.elements.map((e) => e.id);
const WRIST = [15, 16];
const SHOULDER = [11, 12];
const HIP = [23, 24];
const KNEE = [25, 26];
const MAX_PLAYERS = 4;

function mirrorX(normX, width) {
  return (1 - normX) * width;
}

function normY(lm, height) {
  return lm.y * height;
}

function getPhase(elapsedMs) {
  for (let i = CFG.phases.length - 1; i >= 0; i--) {
    if (elapsedMs >= CFG.phases[i].startMs) return CFG.phases[i];
  }
  return CFG.phases[0];
}

function blendshapeForFace(blendshapes, faceIndex) {
  if (!blendshapes?.[faceIndex]) return null;
  return [blendshapes[faceIndex]];
}

function faceExpression(blendshapes, faceIndex) {
  const bs = blendshapeForFace(blendshapes, faceIndex);
  if (!bs) return { smile: 0, laugh: 0, surprise: 0 };
  const smile =
    (getBlendshapeScore(bs, ['mouthSmileLeft']) + getBlendshapeScore(bs, ['mouthSmileRight'])) / 2;
  const laugh = getBlendshapeScore(bs, ['jawOpen']);
  const surprise =
    (getBlendshapeScore(bs, ['eyeWideLeft']) + getBlendshapeScore(bs, ['eyeWideRight'])) / 2;
  return { smile, laugh, surprise };
}

function poseCenter(landmarks, width, height) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const i of [...SHOULDER, ...HIP]) {
    const lm = landmarks[i];
    if (!lm || (lm.visibility ?? 1) < 0.3) continue;
    sx += mirrorX(lm.x, width);
    sy += lm.y * height;
    n++;
  }
  if (!n) return { x: width / 2, y: height / 2 };
  return { x: sx / n, y: sy / n };
}

function poseVelocity(landmarks, prev, dt, width, height) {
  if (!prev || dt <= 0) return 0;
  const indices = [...WRIST, ...SHOULDER, ...HIP];
  let total = 0;
  let count = 0;
  for (const i of indices) {
    const c = landmarks[i];
    const p = prev[i];
    if (!c || !p) continue;
    const dx = (mirrorX(c.x, width) - mirrorX(p.x, width)) / dt;
    const dy = (c.y * height - p.y * height) / dt;
    total += Math.hypot(dx, dy) / Math.max(width, height);
    count++;
  }
  return count ? total / count : 0;
}

function armsRaised(landmarks) {
  const ls = landmarks[11];
  const rs = landmarks[12];
  const lw = landmarks[15];
  const rw = landmarks[16];
  if (!ls || !rs || !lw || !rw) return false;
  return lw.y < ls.y && rw.y < rs.y;
}

function armsSpread(landmarks) {
  const ls = landmarks[11];
  const rs = landmarks[12];
  const lw = landmarks[15];
  const rw = landmarks[16];
  if (!ls || !rs || !lw || !rw) return false;
  const shoulderW = Math.abs(rs.x - ls.x);
  const wristW = Math.abs(rw.x - lw.x);
  return wristW > shoulderW * 2;
}

function isCrouching(landmarks) {
  const lh = landmarks[23];
  const rh = landmarks[24];
  const lk = landmarks[25];
  const rk = landmarks[26];
  if (!lh || !rh || !lk || !rk) return false;
  const hipY = (lh.y + rh.y) / 2;
  const kneeY = (lk.y + rk.y) / 2;
  return hipY > kneeY + 0.04;
}

function matchPlayers(faces, poses, blendshapes, width, height) {
  const slots = [];
  const usedFaces = new Set();

  for (let pi = 0; pi < (poses?.length ?? 0) && slots.length < MAX_PLAYERS; pi++) {
    const pose = poses[pi];
    if (!pose?.length) continue;
    const nose = pose[0];
    if (!nose) continue;
    const px = mirrorX(nose.x, width);
    const py = nose.y * height;

    let bestFi = -1;
    let bestD = Infinity;
    for (let fi = 0; fi < (faces?.length ?? 0); fi++) {
      if (usedFaces.has(fi)) continue;
      const face = faces[fi];
      if (!face?.length) continue;
      const fx = mirrorX(face[10]?.x ?? face[1]?.x ?? 0.5, width);
      const fy = (face[10]?.y ?? face[1]?.y ?? 0.5) * height;
      const d = Math.hypot(fx - px, fy - py);
      if (d < bestD) {
        bestD = d;
        bestFi = fi;
      }
    }
    if (bestFi >= 0 && bestD < width * 0.35) usedFaces.add(bestFi);

    slots.push({
      poseIndex: pi,
      faceIndex: bestFi,
      landmarks: pose,
      center: poseCenter(pose, width, height),
      expression: bestFi >= 0 ? faceExpression(blendshapes, bestFi) : { smile: 0, laugh: 0, surprise: 0 },
    });
  }

  for (let fi = 0; fi < (faces?.length ?? 0) && slots.length < MAX_PLAYERS; fi++) {
    if (usedFaces.has(fi)) continue;
    const face = faces[fi];
    if (!face?.length) continue;
    const cx = mirrorX(face[10]?.x ?? 0.5, width);
    const cy = (face[10]?.y ?? 0.5) * height;
    slots.push({
      poseIndex: -1,
      faceIndex: fi,
      landmarks: null,
      center: { x: cx, y: cy },
      expression: faceExpression(blendshapes, fi),
    });
  }

  slots.sort((a, b) => a.center.x - b.center.x);
  return slots.map((s, i) => ({
    ...s,
    element: CFG.elements[Math.min(i, CFG.elements.length - 1)],
    slot: i,
  }));
}

class Particle {
  constructor(x, y, element, intensity) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * intensity * 4;
    this.vy = (Math.random() - 0.5) * intensity * 4;
    this.life = 1;
    this.decay = 0.015 + Math.random() * 0.02;
    this.size = 2 + Math.random() * 4 * intensity;
    this.element = element;
    this.spin = Math.random() * Math.PI * 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.spin += 0.08;
    if (this.element.id === 'fire') this.vy -= 0.15;
    if (this.element.id === 'water') this.vy += 0.08;
    if (this.element.id === 'earth') this.vx *= 0.98;
    if (this.element.id === 'lightning') {
      this.vx += (Math.random() - 0.5) * 2;
      this.vy += (Math.random() - 0.5) * 2;
    }
  }
}

function spawnParticles(pool, x, y, element, count, intensity = 1) {
  for (let i = 0; i < count; i++) {
    pool.push(new Particle(x, y, element, intensity));
  }
}

function drawParticle(ctx, p) {
  const [c1, c2] = p.element.colors;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
  g.addColorStop(0, c2);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = p.life * 0.85;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawComboEffect(ctx, combo, width, height, t) {
  const { x, y, type, progress } = combo;
  ctx.save();
  if (type === 'steam') {
    const grad = ctx.createLinearGradient(x, y, x, y - height * 0.3);
    grad.addColorStop(0, 'rgba(200,200,220,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.005) * 0.2;
    ctx.fillRect(x - 40, y - height * 0.35 * progress, 80, height * 0.35);
  } else if (type === 'fireflies') {
    for (let i = 0; i < 12; i++) {
      const fx = x + Math.sin(t * 0.003 + i) * 60;
      const fy = y + Math.cos(t * 0.004 + i * 2) * 40 - progress * 30;
      ctx.fillStyle = `rgba(255, 220, 100, ${0.4 + Math.sin(t * 0.01 + i) * 0.3})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'arc') {
    ctx.strokeStyle = 'rgba(200, 150, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#E0AAFF';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(combo.x1, combo.y1);
    for (let s = 0; s <= 1; s += 0.1) {
      const mx = combo.x1 + (combo.x2 - combo.x1) * s;
      const my = combo.y1 + (combo.y2 - combo.y1) * s + Math.sin(s * 20 + t * 0.02) * 25;
      ctx.lineTo(mx, my);
    }
    ctx.stroke();
  } else if (type === 'helix') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const s = i / 40;
      const hx = combo.x1 + (combo.x2 - combo.x1) * s;
      const hy = combo.y1 + (combo.y2 - combo.y1) * s + Math.sin(s * 12 + t * 0.008) * 20;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.stroke();
  } else if (type === 'aurora') {
    const grad = ctx.createLinearGradient(0, 0, width, height * 0.5);
    grad.addColorStop(0, 'rgba(0, 180, 120, 0.35)');
    grad.addColorStop(0.5, 'rgba(120, 50, 200, 0.4)');
    grad.addColorStop(1, 'rgba(0, 100, 200, 0.35)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.5 + progress * 0.3;
    ctx.fillRect(0, 0, width, height * 0.55);
  } else if (type === 'golden') {
    const r = progress * Math.max(width, height) * 0.8;
    const g = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, r);
    g.addColorStop(0, 'rgba(255, 215, 100, 0.55)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawPhaseBackground(ctx, phase, elapsedMs, players, width, height) {
  const t = elapsedMs / CFG.durationMs;
  const space = ctx.createRadialGradient(width / 2, height * 0.4, 0, width / 2, height / 2, width);
  space.addColorStop(0, '#0a0a1a');
  space.addColorStop(0.6, '#050510');
  space.addColorStop(1, '#020208');
  ctx.fillStyle = space;
  ctx.fillRect(0, 0, width, height);

  if (elapsedMs > 0) {
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137) % width) + Math.sin(elapsedMs * 0.0003 + i) * 2;
      const sy = ((i * 89) % (height * 0.6)) + Math.cos(elapsedMs * 0.0004 + i) * 2;
      const bright = 0.2 + (elapsedMs / 20000) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${bright * (0.2 + (i % 5) * 0.08)})`;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
  }

  if (players.length && elapsedMs >= 20000) {
    const edgeStr = Math.min(1, (elapsedMs - 20000) / 20000);
    players.forEach((p, i) => {
      const side = i < 2 ? 0 : width;
      const g = ctx.createLinearGradient(side, 0, width / 2, height * 0.3);
      g.addColorStop(0, p.element.colors[0] + '44');
      g.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = edgeStr * 0.35;
      if (i % 2 === 1) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width / 2, height);
      ctx.restore();
    });
  }

  if (elapsedMs >= 40000) {
    const conv = Math.min(1, (elapsedMs - 40000) / 20000);
    const aurora = ctx.createLinearGradient(0, height * 0.5, width, 0);
    CFG.elements.forEach((el, i) => aurora.addColorStop(i / 3, el.colors[1] + '55'));
    ctx.globalAlpha = conv * 0.4;
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, width, height * 0.5);
    ctx.globalAlpha = 1;

    if (conv > 0.3) {
      ctx.save();
      ctx.globalAlpha = conv * 0.25;
      ctx.translate(0, height);
      ctx.scale(1, -0.35);
      ctx.drawImage(ctx.canvas, 0, 0, width, height);
      ctx.restore();
    }
  }

  if (elapsedMs >= 60000) {
    const peak = Math.min(1, (elapsedMs - 60000) / 15000);
    ctx.globalAlpha = 0.8 * peak;
    const ag = ctx.createLinearGradient(0, 0, width, height);
    ag.addColorStop(0, 'rgba(0,255,150,0.25)');
    ag.addColorStop(0.5, 'rgba(150,80,255,0.3)');
    ag.addColorStop(1, 'rgba(0,150,255,0.25)');
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}

function drawElementLabel(ctx, player, width, height, reveal) {
  const { element, center } = player;
  const alpha = Math.min(1, reveal);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `600 14px ${CFG.fonts.display}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = element.colors[0];
  ctx.shadowColor = element.colors[1];
  ctx.shadowBlur = 12;
  const text = `${element.icon} ${element.label}`;
  const y = center.y - height * 0.12;
  ctx.fillText(text, center.x, y);
  ctx.restore();
}

function drawTopBar(ctx, players, width) {
  const barY = 28;
  const slotW = 48;
  const startX = width / 2 - (MAX_PLAYERS * slotW) / 2;
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = players.find((pl) => pl.slot === i);
    const x = startX + i * slotW + slotW / 2;
    ctx.beginPath();
    ctx.arc(x, barY, 16, 0, Math.PI * 2);
    if (p) {
      ctx.fillStyle = p.element.colors[0] + '55';
      ctx.strokeStyle = p.element.colors[1];
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.font = `16px ${CFG.fonts.display}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.element.icon, x, barY);
    } else {
      ctx.strokeStyle = CFG.ui.textSecondary + '44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawAttract(ctx, width, height, t) {
  ctx.fillStyle = CFG.ui.background + 'cc';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 40; i++) {
    const el = CFG.elements[i % 4];
    const x = (Math.sin(t * 0.001 + i) * 0.5 + 0.5) * width;
    const y = (Math.cos(t * 0.0013 + i * 2) * 0.5 + 0.5) * height;
    ctx.fillStyle = el.colors[0] + '66';
    ctx.beginPath();
    ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  const pulse = 0.4 + Math.sin(t * 0.003) * 0.15;
  ctx.strokeStyle = `rgba(240, 237, 230, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(width * 0.15, height * 0.12, width * 0.7, height * 0.76);

  ctx.textAlign = 'center';
  ctx.fillStyle = CFG.ui.textPrimary;
  ctx.font = `700 clamp(24px, 5vw, 48px) ${CFG.fonts.display}`;
  ctx.letterSpacing = CFG.ui.titleLetterSpacing;
  ctx.fillText(CFG.eventName, width / 2, height * 0.38);

  ctx.font = `300 18px ${CFG.fonts.body}`;
  ctx.fillStyle = CFG.ui.textSecondary;
  ctx.fillText(CFG.brandSubtitle, width / 2, height * 0.48);
}

function drawPhaseName(ctx, phase, width, height) {
  if (!phase || phase.id === 'capture' || phase.id === 'awakening') return;
  ctx.textAlign = 'center';
  ctx.font = `300 13px ${CFG.fonts.body}`;
  ctx.fillStyle = CFG.ui.textSecondary;
  ctx.fillText(phase.name, width / 2, height - 24);
}

function drawScanLine(ctx, width, height, progress) {
  const y = progress * height;
  const g = ctx.createLinearGradient(0, y - 20, 0, y + 20);
  g.addColorStop(0, 'transparent');
  g.addColorStop(0.5, 'rgba(0, 200, 255, 0.5)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 20, width, 40);
}

function elementPair(a, b) {
  return [a.element.id, b.element.id].sort().join('+');
}

export function createFourOfAKindGame(width, height, callbacks = {}) {
  let screen = 'attract';
  let elapsedMs = 0;
  let sessionStart = null;
  let players = [];
  let prevLandmarks = [];
  let particles = [];
  let combos = [];
  let scanProgress = 0;
  let highlightIndex = 0;
  let lastHighlightAt = 0;
  let allStillSince = null;
  let auroraPlayed = false;
  let goldenPlayed = false;
  let captureCountdown = null;
  let freezeUntil = 0;
  let frozenFrame = null;
  let artworkDataUrl = null;
  let qrDataUrl = null;
  let qrImage = null;
  let artworkImage = null;
  let qrShownAt = 0;
  const playedCombos = new Set();

  function resetSession() {
    elapsedMs = 0;
    sessionStart = null;
    screen = 'attract';
    players = [];
    particles = [];
    combos = [];
    scanProgress = 0;
    highlightIndex = 0;
    allStillSince = null;
    auroraPlayed = false;
    goldenPlayed = false;
    captureCountdown = null;
    freezeUntil = 0;
    frozenFrame = null;
    artworkDataUrl = null;
    qrDataUrl = null;
    qrImage = null;
    artworkImage = null;
    playedCombos.clear();
  }

  function startSession(timestamp) {
    sessionStart = timestamp;
    screen = 'playing';
  }

  function checkCombos(timestamp) {
    const prox = width * CFG.proximityScreenFraction;
    combos = combos.filter((c) => timestamp - c.startedAt < 2500);

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i];
        const b = players[j];
        const d = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y);
        if (d > prox) continue;

        const pair = elementPair(a, b);
        const key = `${pair}-${Math.floor(timestamp / 2000)}`;
        if (playedCombos.has(key)) continue;

        if (pair === 'fire+water') {
          combos.push({
            type: 'steam',
            x: (a.center.x + b.center.x) / 2,
            y: Math.min(a.center.y, b.center.y),
            progress: 1,
            startedAt: timestamp,
          });
          playedCombos.add(key);
        } else if (pair === 'earth+fire') {
          combos.push({
            type: 'fireflies',
            x: (a.center.x + b.center.x) / 2,
            y: (a.center.y + b.center.y) / 2,
            progress: 1,
            startedAt: timestamp,
          });
          playedCombos.add(key);
        } else if (pair === 'lightning+water') {
          combos.push({
            type: 'arc',
            x1: a.center.x,
            y1: a.center.y - 40,
            x2: b.center.x,
            y2: b.center.y - 40,
            progress: 1,
            startedAt: timestamp,
          });
          playedCombos.add(key);
        }

        const facing =
          a.landmarks &&
          b.landmarks &&
          (mirrorX(a.landmarks[0].x, width) < b.center.x) !==
            (mirrorX(b.landmarks[0].x, width) < a.center.x);
        if (facing) {
          combos.push({
            type: 'helix',
            x1: a.center.x,
            y1: a.center.y,
            x2: b.center.x,
            y2: b.center.y,
            progress: 1,
            startedAt: timestamp,
          });
        }
      }
    }
  }

  function updatePlayers(tracking, dt, timestamp) {
    const { faces, poses, blendshapes } = tracking;
    players = matchPlayers(faces, poses, blendshapes, width, height);

    if (screen === 'attract' && players.length > 0) {
      startSession(timestamp);
    }

    if (screen !== 'playing') return;

    const phase = getPhase(elapsedMs);
    players.forEach((p, i) => {
      if (!p.landmarks) return;
      const vel = poseVelocity(p.landmarks, prevLandmarks[i], dt, width, height);
      p.velocity = vel;
      const expr = p.expression;
      let intensity = 0.5;
      if (vel < CFG.velocityStill) intensity = 0.3;
      else if (vel < CFG.velocitySlow) intensity = 0.6;
      else if (vel < CFG.velocityMedium) intensity = 1;
      else intensity = 1.8;

      const cx = p.center.x;
      const cy = p.center.y;
      const count = Math.floor(2 + intensity * 4);

      if (vel < CFG.velocityStill) spawnParticles(particles, cx, cy, p.element, 1, 0.3);
      else spawnParticles(particles, cx, cy, p.element, count, intensity);

      if (expr.smile > CFG.smileThreshold) spawnParticles(particles, cx, cy - 30, p.element, 3, 1.2);
      if (expr.laugh > CFG.laughJawThreshold)
        spawnParticles(particles, cx, cy, p.element, 12, 2);
      if (expr.surprise > CFG.surpriseEyeThreshold)
        spawnParticles(particles, cx, cy - 50, p.element, 8, 1.5);

      if (armsRaised(p.landmarks)) {
        for (let u = 0; u < 5; u++) spawnParticles(particles, cx, cy, p.element, 2, 1.5);
        p.geyser = true;
      }
      if (armsSpread(p.landmarks)) {
        spawnParticles(particles, cx - 40, cy, p.element, 2, 1);
        spawnParticles(particles, cx + 40, cy, p.element, 2, 1);
      }
      if (vel > CFG.velocityMedium) spawnParticles(particles, cx, cy, p.element, 10, 2);
      if (isCrouching(p.landmarks)) spawnParticles(particles, cx, cy + 60, p.element, 4, 1);
    });

    prevLandmarks = players.map((p) => p.landmarks);

    if (elapsedMs >= 20000) checkCombos(timestamp);

    const allArms = players.length === 4 && players.every((p) => p.landmarks && armsRaised(p.landmarks));
    if (allArms && !auroraPlayed) {
      combos.push({ type: 'aurora', progress: 0, startedAt: timestamp });
      auroraPlayed = true;
    }

    const allSmile =
      players.length === 4 && players.every((p) => p.expression.smile > CFG.smileThreshold);
    if (allSmile && !goldenPlayed) {
      combos.push({ type: 'golden', progress: 0, startedAt: timestamp });
      goldenPlayed = true;
    }

    const avgVel = players.reduce((s, p) => s + (p.velocity ?? 0), 0) / (players.length || 1);
    if (avgVel < CFG.velocityStill) {
      if (!allStillSince) allStillSince = timestamp;
      else if (timestamp - allStillSince > CFG.stillOrbitMs) {
        players.forEach((p, i) => {
          const ang = timestamp * 0.001 + i * (Math.PI / 2);
          spawnParticles(
            particles,
            width / 2 + Math.cos(ang) * 120,
            height / 2 + Math.sin(ang) * 80,
            p.element,
            1,
            0.5
          );
        });
      }
    } else {
      allStillSince = null;
    }

    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => p.update());
    if (particles.length > 600) particles.splice(0, particles.length - 600);

    combos.forEach((c) => {
      if (c.progress < 1) c.progress = Math.min(1, (c.progress ?? 0) + dt / 1200);
    });
  }

  async function generateArtwork(ctx, video, mask) {
    const aw = CFG.artworkWidth;
    const ah = CFG.artworkHeight;
    const art = createOffscreenCanvas(aw, ah);
    const actx = art.getContext('2d');

    actx.filter = 'saturate(0.85) contrast(1.05)';
    drawPhaseBackground(actx, getPhase(elapsedMs), elapsedMs, players, aw, ah);
    actx.filter = 'none';

    const scale = Math.max(aw / width, ah / height);
    const dw = width * scale;
    const dh = height * scale;
    const ox = (aw - dw) / 2;
    const oy = (ah - dh) / 2;

    actx.save();
    actx.translate(ox, oy);
    actx.scale(scale, scale);
    drawMirroredVideo(actx, video, width, height);
    if (mask) drawSegmentedPerson(actx, video, mask, width, height, { mirror: true, feather: 3 });
    particles.forEach((p) => drawParticle(actx, p));
    actx.restore();

    const border = 12;
    CFG.elements.forEach((el, i) => {
      actx.fillStyle = el.colors[0];
      if (i === 0) actx.fillRect(0, 0, aw, border);
      if (i === 1) actx.fillRect(aw - border, 0, border, ah);
      if (i === 2) actx.fillRect(0, ah - border, aw, border);
      if (i === 3) actx.fillRect(0, 0, border, ah);
    });

    actx.textAlign = 'center';
    actx.fillStyle = CFG.ui.textPrimary;
    actx.font = `700 36px ${CFG.fonts.display}`;
    actx.letterSpacing = CFG.ui.titleLetterSpacing;
    actx.fillText(CFG.eventName, aw / 2, 56);

    actx.textAlign = 'left';
    actx.font = `300 18px ${CFG.fonts.body}`;
    actx.fillStyle = CFG.ui.textSecondary;
    actx.fillText(new Date().toLocaleDateString(), 24, ah - 24);

    actx.textAlign = 'right';
    actx.fillText(CFG.watermark, aw - 24, ah - 24);

    return art.toDataURL('image/png');
  }

  return {
    update(tracking, dt, timestamp) {
      if (screen === 'qr') {
        if (timestamp - qrShownAt > CFG.qrResetMs) resetSession();
        return;
      }

      if (screen === 'playing' && sessionStart != null) {
        elapsedMs = timestamp - sessionStart;
        if (elapsedMs >= CFG.durationMs) {
          screen = 'qr';
          qrShownAt = timestamp;
          return;
        }
      }

      if (freezeUntil && timestamp < freezeUntil) return;

      updatePlayers(tracking, dt, timestamp);

      const phase = getPhase(elapsedMs);
      if (phase.id === 'capture' && captureCountdown == null && screen === 'playing') {
        captureCountdown = CFG.captureCountdownSec;
      }
    },

    async tickCapture(ctx, video, mask, timestamp) {
      const phase = getPhase(elapsedMs);
      if (phase.id !== 'capture' || screen !== 'playing') return;

      if (captureCountdown != null && captureCountdown > 0) {
        if (!this._lastCountTick || timestamp - this._lastCountTick > 1000) {
          captureCountdown -= 1;
          this._lastCountTick = timestamp;
        }
        if (captureCountdown === 0) {
          artworkDataUrl = await generateArtwork(ctx, video, mask);
          callbacks.onArtwork?.(artworkDataUrl);
          const frozen = createOffscreenCanvas(width, height);
          frozen.getContext('2d').drawImage(ctx.canvas, 0, 0);
          frozenFrame = frozen;
          freezeUntil = timestamp + 1000;
          captureCountdown = null;
          try {
            const QR = await import('qrcode');
            const uploadUrl = await callbacks.uploadArtwork?.(artworkDataUrl);
            qrDataUrl = await QR.toDataURL(uploadUrl || artworkDataUrl, {
              width: 280,
              margin: 2,
              color: { dark: '#F0EDE6', light: '#05050F' },
            });
            qrImage = new Image();
            qrImage.src = qrDataUrl;
          } catch {
            qrDataUrl = null;
          }
          if (artworkDataUrl) {
            artworkImage = new Image();
            artworkImage.src = artworkDataUrl;
          }
          screen = 'qr';
          qrShownAt = timestamp;
        }
      }
    },

    draw(ctx, video, mask, timestamp) {
      if (screen === 'qr') {
        ctx.fillStyle = CFG.ui.background;
        ctx.fillRect(0, 0, width, height);
        if (artworkImage?.complete) {
          ctx.globalAlpha = 0.35;
          ctx.drawImage(artworkImage, width - 160, 16, 140, 79);
          ctx.globalAlpha = 1;
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = CFG.ui.textPrimary;
        ctx.font = `700 28px ${CFG.fonts.display}`;
        ctx.fillText('Your artwork is ready', width / 2, height * 0.22);
        if (qrImage?.complete) ctx.drawImage(qrImage, width / 2 - 140, height * 0.32, 280, 280);
        ctx.font = `300 16px ${CFG.fonts.body}`;
        ctx.fillStyle = CFG.ui.textSecondary;
        ctx.fillText('Scan to download', width / 2, height * 0.72);
        return;
      }

      if (freezeUntil && timestamp < freezeUntil && frozenFrame) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 0.15;
        ctx.drawImage(frozenFrame, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(frozenFrame, 0, 0);
        return;
      }

      if (screen === 'attract') {
        drawMirroredVideo(ctx, video, width, height);
        drawAttract(ctx, width, height, timestamp);
        return;
      }

      const phase = getPhase(elapsedMs);
      drawPhaseBackground(ctx, phase, elapsedMs, players, width, height);
      drawMirroredVideo(ctx, video, width, height);

      if (mask && elapsedMs > 5000) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        players.forEach((p) => {
          const g = ctx.createRadialGradient(p.center.x, p.center.y, 0, p.center.x, p.center.y, 80);
          g.addColorStop(0, p.element.colors[1] + '55');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.center.x, p.center.y, 80, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
        drawSegmentedPerson(ctx, video, mask, width, height, { mirror: true, feather: 2, alpha: 0.92 });
      }

      particles.forEach((p) => drawParticle(ctx, p));
      combos.forEach((c) => drawComboEffect(ctx, c, width, height, timestamp));

      if (phase.id === 'awakening' && elapsedMs < 5000) {
        scanProgress = Math.min(1, elapsedMs / 5000);
        drawScanLine(ctx, width, height, scanProgress);
        if (timestamp - lastHighlightAt > 600 && highlightIndex < players.length) {
          lastHighlightAt = timestamp;
          highlightIndex++;
        }
        players.forEach((p, i) => {
          const reveal = i < highlightIndex ? Math.min(1, (timestamp - lastHighlightAt) / 400) : 0;
          if (i < highlightIndex) drawElementLabel(ctx, p, width, height, reveal || 1);
        });
      } else {
        players.forEach((p) => drawElementLabel(ctx, p, width, height, 1));
      }

      drawTopBar(ctx, players, width);
      drawPhaseName(ctx, phase, width, height);

      if (phase.id === 'magic' && elapsedMs > 62000) {
        ctx.textAlign = 'center';
        ctx.font = `300 20px ${CFG.fonts.body}`;
        ctx.fillStyle = CFG.ui.textPrimary + 'cc';
        ctx.fillText('You created something beautiful together', width / 2, height * 0.12);
      }

      if (phase.id === 'capture') {
        ctx.textAlign = 'center';
        ctx.font = `600 22px ${CFG.fonts.display}`;
        ctx.fillStyle = CFG.ui.textPrimary + 'bb';
        ctx.fillText('Strike your pose...', width / 2, height * 0.1);
        if (captureCountdown != null && captureCountdown > 0) {
          const colors = CFG.elements.map((e) => e.colors[0]);
          const idx = (CFG.captureCountdownSec - captureCountdown) % 4;
          ctx.font = `700 72px ${CFG.fonts.display}`;
          ctx.fillStyle = colors[idx];
          ctx.fillText(String(captureCountdown), width / 2, height / 2);
        }
      }
    },

    getCaptureDataUrl: () => artworkDataUrl,
    getScreen: () => screen,
    reset: resetSession,
    dispose: () => {},
  };
}
