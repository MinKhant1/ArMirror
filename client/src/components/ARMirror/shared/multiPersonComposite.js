import { createOffscreenCanvas, drawMirroredVideo } from './mirrorUtils.js';

const FACE_BODY_INDICES = [10, 234, 454, 152, 33, 263, 61, 291];

function mirrorX(x, width) {
  return (1 - x) * width;
}

function fillEllipse(mctx, cx, cy, rx, ry) {
  mctx.beginPath();
  mctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  mctx.fill();
}

export function buildPersonMask(mctx, faces, poses, segmentMask, width, height) {
  mctx.fillStyle = '#fff';

  for (const landmarks of poses ?? []) {
    if (!landmarks?.length) continue;
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    let visible = 0;

    for (const lm of landmarks) {
      if ((lm.visibility ?? 1) < 0.35) continue;
      visible += 1;
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    }
    if (visible < 4) continue;

    const padX = (maxX - minX) * 0.35;
    const padY = (maxY - minY) * 0.15;
    const cx = mirrorX((minX + maxX) / 2, width);
    const cy = ((minY + maxY) / 2) * height;
    const rx = ((maxX - minX) / 2 + padX) * width;
    const ry = ((maxY - minY) / 2 + padY) * height * 1.1;
    fillEllipse(mctx, cx, cy, rx, ry);
  }

  for (const landmarks of faces ?? []) {
    if (!landmarks?.length) continue;
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (const idx of FACE_BODY_INDICES) {
      const lm = landmarks[idx];
      if (!lm) continue;
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    }

    const faceW = maxX - minX;
    const faceH = maxY - minY;
    const cx = mirrorX((minX + maxX) / 2, width);
    const topY = minY * height;
    const bodyH = faceH * height * 4.5;
    const rx = faceW * width * 0.85;
    const cy = topY + bodyH * 0.45;
    fillEllipse(mctx, cx, cy, rx, bodyH * 0.5);
  }

  if (segmentMask) {
    const data = segmentMask.getAsUint8Array();
    const mw = segmentMask.width;
    const mh = segmentMask.height;
    const img = mctx.getImageData(0, 0, width, height);
    const px = img.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const mx = Math.floor((x / width) * mw);
        const my = Math.floor((y / height) * mh);
        if (data[my * mw + mx] > 0) {
          const i = (y * width + x) * 4;
          px[i] = 255;
          px[i + 1] = 255;
          px[i + 2] = 255;
          px[i + 3] = 255;
        }
      }
    }
    mctx.putImageData(img, 0, 0);
  }
}

export function drawMultiPersonScene(ctx, video, faces, poses, segmentMask, width, height) {
  const videoLayer = createOffscreenCanvas(width, height);
  drawMirroredVideo(videoLayer.getContext('2d'), video, width, height);

  const maskLayer = createOffscreenCanvas(width, height);
  const mctx = maskLayer.getContext('2d');
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, width, height);
  buildPersonMask(mctx, faces, poses, segmentMask, width, height);

  const masked = createOffscreenCanvas(width, height);
  const m2 = masked.getContext('2d');
  m2.drawImage(videoLayer, 0, 0);
  m2.globalCompositeOperation = 'destination-in';
  m2.drawImage(maskLayer, 0, 0);

  ctx.drawImage(masked, 0, 0);
}

export function getEyePositions(landmarks, width, height) {
  const avg = (a, b) => ({
    x: (landmarks[a].x + landmarks[b].x) / 2,
    y: (landmarks[a].y + landmarks[b].y) / 2,
  });

  const left = avg(33, 133);
  const right = avg(362, 263);

  return {
    left: { x: mirrorX(left.x, width), y: left.y * height },
    right: { x: mirrorX(right.x, width), y: right.y * height },
  };
}
