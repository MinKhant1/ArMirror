import {
  createOffscreenCanvas,
  drawMirroredVideo,
  parseMask,
} from '../../../components/ARMirror/shared/mirrorUtils.js';

type MaskInfo = { data: Uint8Array; width: number; height: number };

let personIsNonZero: boolean | null = null;

function sampleMaskValue(maskInfo: MaskInfo, sx: number, sy: number, frameW: number, frameH: number) {
  const mx = Math.min(maskInfo.width - 1, Math.floor((sx / frameW) * maskInfo.width));
  const my = Math.min(maskInfo.height - 1, Math.floor((sy / frameH) * maskInfo.height));
  return maskInfo.data[my * maskInfo.width + mx];
}

function calibrateMaskPolarity(maskInfo: MaskInfo, frameW: number, frameH: number) {
  const cx = frameW * 0.5;
  const cy = frameH * 0.45;
  const cornerX = frameW * 0.08;
  const cornerY = frameH * 0.12;
  const centerVal = sampleMaskValue(maskInfo, frameW - 1 - cx, cy, frameW, frameH);
  const cornerVal = sampleMaskValue(maskInfo, frameW - 1 - cornerX, cornerY, frameW, frameH);
  personIsNonZero = centerVal >= cornerVal;
}

function isPersonPixel(
  maskInfo: MaskInfo,
  x: number,
  y: number,
  frameW: number,
  frameH: number
) {
  const sx = frameW - 1 - x;
  const v = sampleMaskValue(maskInfo, sx, y, frameW, frameH);
  const nonZero = v > 0;
  return personIsNonZero ? nonZero : !nonZero;
}

function buildMirroredPersonMask(maskInfo: MaskInfo, w: number, h: number) {
  if (personIsNonZero === null) calibrateMaskPolarity(maskInfo, w, h);

  const canvas = createOffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const px = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isPersonPixel(maskInfo, x, y, w, h)) {
        const i = (y * w + x) * 4;
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Forest background + mirrored person cutout on top (Smile Strike style).
 */
export function drawWildFourFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  forestCanvas: HTMLCanvasElement | null,
  mask: unknown,
  w: number,
  h: number
) {
  if (forestCanvas?.width) {
    ctx.drawImage(forestCanvas, 0, 0, w, h);
  }

  const videoLayer = createOffscreenCanvas(w, h);
  drawMirroredVideo(videoLayer.getContext('2d')!, video, w, h);

  const maskInfo = parseMask(mask as Parameters<typeof parseMask>[0]);
  if (!maskInfo) {
    ctx.drawImage(videoLayer, 0, 0);
    return;
  }

  const personMask = buildMirroredPersonMask(maskInfo, w, h);
  const cutout = createOffscreenCanvas(w, h);
  const cutoutCtx = cutout.getContext('2d')!;
  cutoutCtx.drawImage(videoLayer, 0, 0);
  cutoutCtx.globalCompositeOperation = 'destination-in';
  cutoutCtx.drawImage(personMask, 0, 0);

  ctx.drawImage(cutout, 0, 0);
}

export function resetMaskCalibration() {
  personIsNonZero = null;
}
