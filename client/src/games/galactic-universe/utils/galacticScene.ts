import {
  createOffscreenCanvas,
  drawMirroredVideo,
} from '../../../components/ARMirror/shared/mirrorUtils.js';

/** Flat space backdrop — no radial vignette that reads as a “shadow”. */
export function drawGalacticSpaceBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0a0018');
  sky.addColorStop(0.45, '#1a0a3e');
  sky.addColorStop(1, '#0d0228');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 48; i++) {
    const sx = ((i * 97) % width + width) % width;
    const sy = (i * 53) % height;
    ctx.fillStyle = i % 3 === 0 ? '#7c4dff' : '#e0f7ff';
    ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
  }
  ctx.restore();
}

type CategoryMask = {
  getAsUint8Array: () => Uint8Array;
  width: number;
  height: number;
};

/** Hard-edge person cutout (no feather halo). */
function drawPersonHardMask(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  categoryMask: CategoryMask,
  width: number,
  height: number
) {
  const videoLayer = createOffscreenCanvas(width, height);
  drawMirroredVideo(videoLayer.getContext('2d')!, video, width, height);

  const maskLayer = createOffscreenCanvas(width, height);
  const mctx = maskLayer.getContext('2d')!;
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, width, height);

  const data = categoryMask.getAsUint8Array();
  const mw = categoryMask.width;
  const mh = categoryMask.height;
  const img = mctx.getImageData(0, 0, width, height);
  const px = img.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mx = Math.min(mw - 1, Math.floor((x / width) * mw));
      const my = Math.min(mh - 1, Math.floor((y / height) * mh));
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

  const masked = createOffscreenCanvas(width, height);
  const cut = masked.getContext('2d')!;
  cut.drawImage(videoLayer, 0, 0);
  cut.globalCompositeOperation = 'destination-in';
  cut.drawImage(maskLayer, 0, 0);

  ctx.drawImage(masked, 0, 0);
}

/** Background + player (flying props drawn on separate layer in front). */
export function drawGalacticScene(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  categoryMask: CategoryMask | null | undefined,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  drawGalacticSpaceBackground(ctx, width, height);

  if (video && categoryMask) {
    drawPersonHardMask(ctx, video, categoryMask, width, height);
  } else if (video) {
    drawMirroredVideo(ctx, video, width, height);
  }
}
