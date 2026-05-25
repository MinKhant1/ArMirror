import { create } from 'zustand';

const SMILE_THRESHOLD = 0.42;
const MAX_LIVES = 3;

let nextId = 1;

export const useSmileStrikeStore = create((set, get) => ({
  score: 0,
  lives: MAX_LIVES,
  gameState: 'playing',
  runners: [],
  explosions: [],
  lastSpawn: 0,

  reset: () =>
    set({
      score: 0,
      lives: MAX_LIVES,
      gameState: 'playing',
      runners: [],
      explosions: [],
      lastSpawn: 0,
    }),

  spawnRunner: (now) => {
    const { gameState, runners, lastSpawn } = get();
    if (gameState !== 'playing') return;
    if (now - lastSpawn < 1400) return;

    const runner = {
      id: nextId++,
      x: 0.12 + Math.random() * 0.76,
      y: -0.08,
      z: 0,
      speed: 0.00022 + Math.random() * 0.00012,
      wobble: Math.random() * Math.PI * 2,
      hue: Math.random() * 60 + 180,
    };

    set({ runners: [...runners, runner], lastSpawn: now });
  },

  tick: (dt, now) => {
    const state = get();
    if (state.gameState !== 'playing') return;

    state.spawnRunner(now);

    let runners = state.runners.map((r) => ({
      ...r,
      y: r.y + r.speed * dt,
      z: Math.min(1, r.z + r.speed * dt * 2.5),
      wobble: r.wobble + dt * 0.003,
    }));

    let lives = state.lives;
    const reached = runners.filter((r) => r.y > 0.92);
    if (reached.length) {
      lives = Math.max(0, lives - reached.length);
      runners = runners.filter((r) => r.y <= 0.92);
    }

    const explosions = state.explosions
      .map((e) => ({ ...e, age: e.age + dt }))
      .filter((e) => e.age < 500);

    if (lives <= 0) {
      set({ runners, lives: 0, gameState: 'over', explosions });
    } else {
      set({ runners, lives, explosions });
    }
  },

  hitRunner: (id, x, y) => {
    const { gameState, runners, score, explosions } = get();
    if (gameState !== 'playing') return;
    const hit = runners.find((r) => r.id === id);
    if (!hit) return;

    set({
      score: score + 100 + Math.round(hit.z * 50),
      runners: runners.filter((r) => r.id !== id),
      explosions: [...explosions, { x, y, age: 0, scale: 0.6 + hit.z * 0.6 }],
    });
  },
}));

export function getRunnerScreenPos(runner, width, height) {
  const x = runner.x * width + Math.sin(runner.wobble) * 12 * (0.3 + runner.z);
  const y = runner.y * height;
  const scale = 0.35 + runner.z * 1.1;
  const radius = (28 + runner.z * 22) * scale;
  return { x, y, scale, radius };
}

export function rayHitsRunner(ox, oy, tx, ty, runner, width, height) {
  const { x: cx, y: cy, radius } = getRunnerScreenPos(runner, width, height);
  const dx = tx - ox;
  const dy = ty - oy;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;

  const t = Math.max(0, (cx - ox) * dirX + (cy - oy) * dirY);
  if (t > len) return false;
  const px = ox + dirX * t;
  const py = oy + dirY * t;
  return Math.hypot(cx - px, cy - py) < radius * 0.85;
}

export function processLaserHits(lasers, width, height) {
  const store = useSmileStrikeStore.getState();
  if (store.gameState !== 'playing') return;

  const hitIds = new Set();
  for (const laser of lasers) {
    for (const runner of store.runners) {
      if (hitIds.has(runner.id)) continue;
      if (rayHitsRunner(laser.x1, laser.y1, laser.x2, laser.y2, runner, width, height)) {
        hitIds.add(runner.id);
        const pos = getRunnerScreenPos(runner, width, height);
        store.hitRunner(runner.id, pos.x, pos.y);
      }
    }
  }
}

export function drawRunners(ctx, runners, width, height, time) {
  const sorted = [...runners].sort((a, b) => a.z - b.z);

  for (const runner of sorted) {
    const { x, y, scale, radius } = getRunnerScreenPos(runner, width, height);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.shadowColor = `hsl(${runner.hue}, 90%, 60%)`;
    ctx.shadowBlur = 16;
    ctx.fillStyle = `hsl(${runner.hue}, 80%, 55%)`;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.7, radius * 0.5);
    ctx.lineTo(-radius * 0.7, radius * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.2, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `hsla(${runner.hue}, 100%, 70%, 0.8)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.7, radius * 0.5, radius * 0.15, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

export function drawExplosions(ctx, explosions, time) {
  for (const ex of explosions) {
    const p = ex.age / 500;
    const r = 20 + p * 60 * ex.scale;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, ${120 + p * 80}, 0, ${0.6 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawEyeLasers(ctx, lasers, time) {
  for (const laser of lasers) {
    if (!laser.x2 && !laser.y2) continue;
    const len = Math.hypot(laser.x2 - laser.x1, laser.y2 - laser.y1);
    if (len < 8) continue;

    const pulse = 0.7 + Math.sin(time * 0.02 + laser.id) * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // Outer glow beam
    ctx.strokeStyle = 'rgba(255, 23, 68, 0.35)';
    ctx.lineWidth = 18 + pulse * 8;
    ctx.shadowColor = '#ff5252';
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();

    // Core beam
    ctx.strokeStyle = laser.color ?? '#ff1744';
    ctx.lineWidth = 10 + pulse * 4;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();

    // Hot center
    ctx.strokeStyle = '#ff8a80';
    ctx.lineWidth = 4 + pulse * 2;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();

    ctx.fillStyle = '#ffcdd2';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(laser.x1, laser.y1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function buildLasersFromFaces(faces, blendshapes, width, height, transformMatrices = []) {
  const lasers = [];
  const LASER_LENGTH = Math.max(width, height) * 0.9;
  const LASER_COLOR = '#ff1744';

  faces.forEach((landmarks, i) => {
    const smile = blendshapes?.[i]
      ? Math.min(
          1,
          (getSmileFromCategories(blendshapes[i].categories) ?? 0) * 1.5
        )
      : 0;

    if (smile < SMILE_THRESHOLD) return;

    const origin = getFaceCenter(landmarks, width, height);
    const dir = getFaceForwardDirection(landmarks, width, height, transformMatrices[i]);
    const intensity = (smile - SMILE_THRESHOLD) / (1 - SMILE_THRESHOLD);

    if (dir.x === 0 && dir.y === 0) return;

    lasers.push({
      id: `${i}-face`,
      x1: origin.x,
      y1: origin.y,
      x2: origin.x + dir.x * LASER_LENGTH,
      y2: origin.y + dir.y * LASER_LENGTH,
      color: LASER_COLOR,
      intensity,
    });
  });

  return lasers;
}

function getSmileFromCategories(categories) {
  if (!categories?.length) return 0;
  let total = 0;
  let n = 0;
  for (const name of ['mouthSmileLeft', 'mouthSmileRight']) {
    const c = categories.find((x) => x.categoryName === name);
    if (c) {
      total += c.score;
      n += 1;
    }
  }
  return n ? total / n : 0;
}

function getFaceForwardDirection(landmarks, width, height, transformMatrix) {
  if (transformMatrix) {
    const fromMatrix = directionFromTransformMatrix(transformMatrix, width, height);
    if (fromMatrix) return fromMatrix;
  }

  const { fx, fy, fz } = faceNormalFromLandmarks(landmarks);
  return projectForwardToScreen(fx, fy, fz, width, height);
}

/** Face-plane normal via cross product — true “straight out” from the face. */
function faceNormalFromLandmarks(landmarks) {
  const LE = landmarks[33];
  const RE = landmarks[263];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  const rx = RE.x - LE.x;
  const ry = RE.y - LE.y;
  const rz = RE.z - LE.z;

  const dx = chin.x - forehead.x;
  const dy = chin.y - forehead.y;
  const dz = chin.z - forehead.z;

  let fx = ry * dz - rz * dy;
  let fy = rz * dx - rx * dz;
  let fz = rx * dy - ry * dx;

  const len = Math.hypot(fx, fy, fz) || 1;
  fx /= len;
  fy /= len;
  fz /= len;

  // Keep normal pointing toward the camera when facing it
  const eyeMidZ = (LE.z + RE.z) / 2;
  if (fz > 0) {
    fx = -fx;
    fy = -fy;
    fz = -fz;
  }

  return { fx, fy, fz };
}

function projectForwardToScreen(fx, fy, fz, width, height) {
  const planar = Math.hypot(fx, fy);

  // Head-on to camera: shoot straight into the scene (toward runners)
  if (planar < 0.12 && fz < -0.2) {
    return { x: 0, y: -1 };
  }

  // Mirrored display — flip X so left/right matches what you see
  return normalizeDirection(-fx * width * 2, fy * height * 2);
}

function directionFromTransformMatrix(matrix, width, height) {
  const m = matrix?.data ? Array.from(matrix.data) : matrix;
  if (!m || m.length < 12) return null;

  // Face Z-axis column = outward normal of the face plane
  let fx = -m[8];
  let fy = -m[9];
  let fz = -m[10];

  if (!Number.isFinite(fx) || !Number.isFinite(fy) || !Number.isFinite(fz)) return null;
  if (Math.hypot(fx, fy, fz) < 0.01) return null;

  const len = Math.hypot(fx, fy, fz);
  fx /= len;
  fy /= len;
  fz /= len;

  return projectForwardToScreen(fx, fy, fz, width, height);
}

function normalizeDirection(dirX, dirY) {
  const len = Math.hypot(dirX, dirY);
  if (len < 0.001) {
    return { x: 0, y: 0 };
  }
  return { x: dirX / len, y: dirY / len };
}

function getFaceCenter(landmarks, width, height) {
  const mirror = (x) => (1 - x) * width;
  const le = landmarks[33];
  const re = landmarks[263];
  const nose = landmarks[1];

  const eyeX = (le.x + re.x) / 2;
  const eyeY = (le.y + re.y) / 2;

  return {
    x: mirror(eyeX * 0.55 + nose.x * 0.45),
    y: (eyeY * 0.55 + nose.y * 0.45) * height,
  };
}

export function drawSmileStrikeHUD(ctx, { score, lives, gameState, faceCount }, width, height) {
  ctx.save();
  ctx.font = '700 15px Montserrat, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${score}`, 16, 28);
  ctx.fillText(`PLAYERS ${faceCount}`, 16, 50);
  ctx.textAlign = 'right';
  ctx.fillText(`♥`.repeat(lives) + (lives === 0 ? '' : ''), width - 16, 28);

  ctx.font = '500 12px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('SMILE — red laser fires straight out from your face!', width / 2, height - 14);

  if (gameState === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '800 34px Montserrat, sans-serif';
    ctx.fillStyle = '#ef5350';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 16);
    ctx.font = '600 18px Montserrat, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${score}`, width / 2, height / 2 + 20);
  }
  ctx.restore();
}

export { SMILE_THRESHOLD };
