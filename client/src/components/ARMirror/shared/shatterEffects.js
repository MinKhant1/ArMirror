import { create } from 'zustand';

export const useShatterStore = create((set, get) => ({
  crackCount: 0,
  score: 0,
  gameState: 'playing',
  distortion: 0,
  stillnessTime: 0,

  addCrack: () => {
    const { gameState, crackCount } = get();
    if (gameState !== 'playing') return;
    const next = crackCount + 1;
    set({
      crackCount: next,
      distortion: Math.min(1, next / 35),
      score: get().score + 10,
    });
    if (next >= 40) {
      set({ gameState: 'shattered', distortion: 1 });
    }
  },

  tickScore: () => {
    const { gameState } = get();
    if (gameState === 'playing') {
      set({ score: get().score + 1 });
    }
  },

  updateStillness: (isStill, dt) => {
    const { gameState, stillnessTime } = get();
    if (gameState !== 'playing') return;
    if (isStill) {
      set({ stillnessTime: stillnessTime + dt });
    } else {
      set({ stillnessTime: 0 });
    }
  },

  healCracks: (amount = 1) => {
    const { crackCount, gameState } = get();
    if (gameState !== 'playing' || crackCount <= 0) return;
    const next = Math.max(0, crackCount - amount);
    set({
      crackCount: next,
      distortion: Math.min(1, next / 35),
    });
  },

  reset: () =>
    set({
      crackCount: 0,
      score: 0,
      gameState: 'playing',
      distortion: 0,
      stillnessTime: 0,
    }),
}));

export class CrackSystem {
  constructor() {
    this.cracks = [];
  }

  spawn(x, y, intensity = 1) {
    const count = 6 + Math.floor(intensity * 4);
    const lines = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      lines.push({
        angle,
        length: 40 + Math.random() * 80 * intensity,
        branches: Math.floor(Math.random() * 3),
      });
    }
    this.cracks.push({
      x,
      y,
      age: 0,
      maxAge: 99999,
      lines,
      intensity,
      healing: false,
    });
  }

  healAll(dt) {
    for (const crack of this.cracks) {
      if (!crack.healing) crack.healing = true;
      crack.age -= dt * 0.05;
    }
    this.cracks = this.cracks.filter((c) => c.age < c.maxAge && c.age >= -1);
  }

  update(dt) {
    for (const crack of this.cracks) {
      if (!crack.healing) crack.age += dt * 0.001;
    }
  }

  draw(ctx, width, height) {
    ctx.save();
    for (const crack of this.cracks) {
      const alpha = crack.healing
        ? Math.max(0, 1 - crack.age / 30)
        : Math.min(1, 0.3 + crack.age * 0.001);

      ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.9})`;
      ctx.lineWidth = 1.5 + crack.intensity;
      ctx.shadowColor = '#80d8ff';
      ctx.shadowBlur = 6;

      for (const line of crack.lines) {
        ctx.beginPath();
        ctx.moveTo(crack.x, crack.y);
        const ex = crack.x + Math.cos(line.angle) * line.length;
        const ey = crack.y + Math.sin(line.angle) * line.length;
        ctx.lineTo(ex, ey);

        for (let b = 0; b < line.branches; b++) {
          const mid = 0.4 + b * 0.2;
          const bx = crack.x + Math.cos(line.angle) * line.length * mid;
          const by = crack.y + Math.sin(line.angle) * line.length * mid;
          const ba = line.angle + (Math.random() > 0.5 ? 0.6 : -0.6);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ba) * 25, by + Math.sin(ba) * 25);
        }
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(crack.x, crack.y, 4 + crack.intensity * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx.fill();
    }
    ctx.restore();
  }

  drawVoronoiShatter(ctx, width, height, progress) {
    if (progress <= 0) return;
    const cells = 18;
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;

    const points = [];
    for (let i = 0; i < cells; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
      });
    }

    for (let y = 0; y < height; y += 40) {
      for (let x = 0; x < width; x += 40) {
        let minDist = Infinity;
        let secondDist = Infinity;
        for (const p of points) {
          const d = Math.hypot(x - p.x, y - p.y);
          if (d < minDist) {
            secondDist = minDist;
            minDist = d;
          } else if (d < secondDist) {
            secondDist = d;
          }
        }
        if (secondDist - minDist < 3) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }
    ctx.restore();
  }

  clear() {
    this.cracks = [];
  }

  get count() {
    return this.cracks.length;
  }
}

export function applyGlitchDistortion(ctx, sourceCanvas, width, height, amount) {
  if (amount <= 0) {
    ctx.drawImage(sourceCanvas, 0, 0);
    return;
  }

  ctx.drawImage(sourceCanvas, 0, 0);

  const slices = Math.floor(4 + amount * 12);
  for (let i = 0; i < slices; i++) {
    const sy = Math.random() * height;
    const sh = 4 + Math.random() * 20 * amount;
    const offset = (Math.random() - 0.5) * 30 * amount;
    ctx.drawImage(sourceCanvas, 0, sy, width, sh, offset, sy, width, sh);
  }

  if (amount > 0.3) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = amount * 0.3;
    ctx.fillStyle = '#ff0040';
    ctx.fillRect(3 * amount, 0, width, height);
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(-3 * amount, 0, width, height);
    ctx.restore();
  }
}

export function drawMercuryHeal(ctx, width, height, progress) {
  if (progress <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const y = height * (0.2 + i * 0.15) + Math.sin(Date.now() * 0.002 + i) * 10;
    const g = ctx.createLinearGradient(0, y - 20, 0, y + 20);
    g.addColorStop(0, 'rgba(180,220,255,0)');
    g.addColorStop(0.5, `rgba(180,220,255,${0.15 * progress})`);
    g.addColorStop(1, 'rgba(180,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 20, width, 40);
  }
  ctx.restore();
}

export function drawShatterHUD(ctx, { score, crackCount, gameState, distortion }, width) {
  ctx.save();
  ctx.font = '600 14px Montserrat, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 16, 28);
  ctx.fillText(`CRACKS: ${crackCount}/40`, 16, 50);

  const barW = 120;
  const barX = width - barW - 16;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(barX, 20, barW, 8);
  ctx.fillStyle = distortion > 0.7 ? '#ef5350' : '#42a5f5';
  ctx.fillRect(barX, 20, barW * distortion, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '500 11px Montserrat, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DISTORTION', barX + barW, 44);

  if (gameState === 'shattered') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, width, ctx.canvas.height);
    ctx.textAlign = 'center';
    ctx.font = '800 36px Montserrat, sans-serif';
    ctx.fillStyle = '#ef5350';
    ctx.shadowColor = '#ef5350';
    ctx.shadowBlur = 20;
    ctx.fillText('MIRROR SHATTERED', width / 2, ctx.canvas.height / 2 - 20);
    ctx.font = '600 18px Montserrat, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.fillText(`Final Score: ${score}`, width / 2, ctx.canvas.height / 2 + 20);
    ctx.font = '500 14px Montserrat, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Press RESTART to try again', width / 2, ctx.canvas.height / 2 + 55);
  }
  ctx.restore();
}
