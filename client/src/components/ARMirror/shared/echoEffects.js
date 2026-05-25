import { createOffscreenCanvas } from './mirrorUtils.js';
import { POSE_CONNECTIONS } from '../mediaPipeTracker.js';

const STYLE_BY_AGE = [
  { minAge: 8500, style: 'dissolve', alpha: 0.35 },
  { minAge: 5500, style: 'xray', alpha: 0.45 },
  { minAge: 2500, style: 'watercolor', alpha: 0.55 },
  { minAge: 800, style: 'sketch', alpha: 0.65 },
];

export function getEchoLayers(now, ringBuffer) {
  const layers = [];
  for (const { minAge, style, alpha } of STYLE_BY_AGE) {
    const frame = ringBuffer.getAtAge(now, minAge);
    if (frame) layers.push({ ...frame, style, alpha });
  }
  return layers;
}

export function applyEchoStyle(ctx, sourceCanvas, style, width, height, time = 0, poseLandmarks = null) {
  const temp = createOffscreenCanvas(width, height);
  const tctx = temp.getContext('2d');
  tctx.drawImage(sourceCanvas, 0, 0);

  switch (style) {
    case 'sketch':
      applySketch(tctx, width, height);
      break;
    case 'watercolor':
      applyWatercolor(tctx, width, height);
      break;
    case 'xray':
      applyXray(tctx, width, height, poseLandmarks);
      break;
    case 'dissolve':
      applyDissolve(tctx, width, height, time);
      break;
    default:
      break;
  }

  ctx.drawImage(temp, 0, 0);
}

function applySketch(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const px = imageData.data;
  const gray = new Uint8ClampedArray(width * height);

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (px[o + 3] < 10) {
      gray[i] = 0;
      continue;
    }
    gray[i] = px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (px[o + 3] < 10) continue;

      const gx =
        -gray[i - width - 1] - gray[i - 1] * 2 - gray[i + width - 1] +
        gray[i - width + 1] + gray[i + 1] * 2 + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - gray[i - width] * 2 - gray[i - width + 1] +
        gray[i + width - 1] + gray[i + width] * 2 + gray[i + width + 1];
      const edge = Math.min(255, Math.hypot(gx, gy) * 1.5);

      px[o] = 200 - edge * 0.6;
      px[o + 1] = 210 - edge * 0.5;
      px[o + 2] = 230 - edge * 0.3;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyWatercolor(ctx, width, height) {
  ctx.filter = 'blur(3px) saturate(1.8) contrast(0.85) brightness(1.1)';
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';

  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(100, 180, 255, 0.15)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}

function applyXray(ctx, width, height, poseLandmarks) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const px = imageData.data;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 10) continue;
    const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    px[i] = lum * 0.2;
    px[i + 1] = Math.min(255, lum * 0.9 + 80);
    px[i + 2] = Math.min(255, lum * 0.5 + 40);
  }
  ctx.putImageData(imageData, 0, 0);

  if (poseLandmarks?.length) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 180, 0.85)';
    ctx.shadowColor = '#00ffc8';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;

    for (const [a, b] of POSE_CONNECTIONS) {
      const p1 = poseLandmarks[a];
      const p2 = poseLandmarks[b];
      if (!p1 || !p2 || (p1.visibility ?? 1) < 0.4 || (p2.visibility ?? 1) < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }

    for (const lm of poseLandmarks) {
      if ((lm.visibility ?? 1) < 0.4) continue;
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffc8';
      ctx.fill();
    }
    ctx.restore();
  }
}

function applyDissolve(ctx, width, height, time) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const px = imageData.data;
  const seed = Math.floor(time * 0.02);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (px[i + 3] < 10) continue;
      const hash = ((x * 73856093) ^ (y * 19349663) ^ seed) & 0xff;
      if (hash < 90) {
        px[i + 3] = 0;
      } else if (hash < 130) {
        px[i] = Math.min(255, px[i] + 60);
        px[i + 1] = Math.min(255, px[i + 1] + 80);
        px[i + 2] = 255;
        px[i + 3] *= 0.5;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export function drawEchoVignette(ctx, width, height) {
  const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(2,4,12,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export function drawEtherealFog(ctx, width, height, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const x = width * (0.3 + 0.2 * i) + Math.sin(time * 0.001 + i) * 40;
    const y = height * 0.5 + Math.cos(time * 0.0008 + i * 2) * 30;
    const r = width * 0.25;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(120, 180, 255, ${0.04 + i * 0.02})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}
