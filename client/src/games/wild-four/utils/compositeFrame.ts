import {
  createOffscreenCanvas,
  drawMirroredVideo,
  parseMask,
} from '../../../components/ARMirror/shared/mirrorUtils.js';

type MaskInfo = { data: Uint8Array; width: number; height: number };
type FloatMaskInfo = { data: Float32Array; width: number; height: number };

type SegmentationInput =
  | Parameters<typeof parseMask>[0]
  | { confidence?: unknown; category?: unknown }
  | null;

const MASK_BLUR_PX = 4;
const CONFIDENCE_FLOOR = 0.08;

function parseConfidenceMask(mask: unknown): FloatMaskInfo | null {
  if (!mask || typeof (mask as { getAsFloat32Array?: () => Float32Array }).getAsFloat32Array !== 'function') {
    return null;
  }
  const m = mask as { getAsFloat32Array: () => Float32Array; width: number; height: number };
  return {
    data: m.getAsFloat32Array(),
    width: m.width,
    height: m.height,
  };
}

function resolveSegmentationMasks(mask: SegmentationInput) {
  if (!mask) return { category: null as MaskInfo | null, confidence: null as FloatMaskInfo | null };
  if (typeof mask === 'object' && ('confidence' in mask || 'category' in mask)) {
    const bundle = mask as { confidence?: unknown; category?: unknown };
    return {
      category: parseMask(bundle.category as Parameters<typeof parseMask>[0]),
      confidence: parseConfidenceMask(bundle.confidence),
    };
  }
  return {
    category: parseMask(mask as Parameters<typeof parseMask>[0]),
    confidence: null,
  };
}

function sampleMaskValue(maskInfo: MaskInfo, sx: number, sy: number, frameW: number, frameH: number) {
  const u = (sx / frameW) * maskInfo.width;
  const v = (sy / frameH) * maskInfo.height;
  const x0 = Math.max(0, Math.min(maskInfo.width - 1, Math.floor(u)));
  const y0 = Math.max(0, Math.min(maskInfo.height - 1, Math.floor(v)));
  const x1 = Math.min(maskInfo.width - 1, x0 + 1);
  const y1 = Math.min(maskInfo.height - 1, y0 + 1);
  const fx = u - x0;
  const fy = v - y0;
  const v00 = maskInfo.data[y0 * maskInfo.width + x0];
  const v10 = maskInfo.data[y0 * maskInfo.width + x1];
  const v01 = maskInfo.data[y1 * maskInfo.width + x0];
  const v11 = maskInfo.data[y1 * maskInfo.width + x1];
  return (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
}

function sampleConfidenceValue(
  maskInfo: FloatMaskInfo,
  sx: number,
  sy: number,
  frameW: number,
  frameH: number
) {
  const u = (sx / frameW) * maskInfo.width;
  const v = (sy / frameH) * maskInfo.height;
  const x0 = Math.max(0, Math.min(maskInfo.width - 1, Math.floor(u)));
  const y0 = Math.max(0, Math.min(maskInfo.height - 1, Math.floor(v)));
  const x1 = Math.min(maskInfo.width - 1, x0 + 1);
  const y1 = Math.min(maskInfo.height - 1, y0 + 1);
  const fx = u - x0;
  const fy = v - y0;
  const v00 = maskInfo.data[y0 * maskInfo.width + x0];
  const v10 = maskInfo.data[y0 * maskInfo.width + x1];
  const v01 = maskInfo.data[y1 * maskInfo.width + x0];
  const v11 = maskInfo.data[y1 * maskInfo.width + x1];
  return (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
}

/**
 * Decide whether person pixels are non-zero in the mask (MediaPipe selfie default)
 * or inverted. Compares torso region vs image borders each frame.
 */
function detectPersonPolarity(maskInfo: MaskInfo, frameW: number, frameH: number) {
  let torsoHigh = 0;
  let torsoLow = 0;
  let borderHigh = 0;
  let borderLow = 0;

  const sample = (sx: number, sy: number, bucket: 'torso' | 'border') => {
    const v = sampleMaskValue(maskInfo, sx, sy, frameW, frameH);
    const high = v > 127;
    if (bucket === 'torso') {
      if (high) torsoHigh += 1;
      else torsoLow += 1;
    } else if (high) borderHigh += 1;
    else borderLow += 1;
  };

  for (let y = frameH * 0.32; y <= frameH * 0.88; y += frameH * 0.08) {
    for (let x = frameW * 0.28; x <= frameW * 0.72; x += frameW * 0.08) {
      sample(frameW - 1 - x, y, 'torso');
    }
  }

  const borders: [number, number][] = [
    [frameW * 0.06, frameH * 0.08],
    [frameW * 0.94, frameH * 0.08],
    [frameW * 0.06, frameH * 0.92],
    [frameW * 0.94, frameH * 0.92],
    [frameW * 0.5, frameH * 0.06],
  ];
  for (const [x, y] of borders) {
    sample(frameW - 1 - x, y, 'border');
  }

  const torsoCoverage = torsoHigh / Math.max(1, torsoHigh + torsoLow);
  const borderCoverage = borderHigh / Math.max(1, borderHigh + borderLow);
  const ambiguous = Math.abs(torsoCoverage - borderCoverage) < 0.12;

  return {
    personIsNonZero: torsoCoverage >= borderCoverage,
    ambiguous,
  };
}

function isPersonValue(v: number, personIsNonZero: boolean) {
  const nonZero = v > 127;
  return personIsNonZero ? nonZero : !nonZero;
}

function confidenceToAlpha(v: number) {
  const t = Math.min(1, Math.max(0, (v - CONFIDENCE_FLOOR) / (1 - CONFIDENCE_FLOOR)));
  return Math.round(Math.pow(t, 0.92) * 255);
}

function upscaleAndSoftenMask(small: HTMLCanvasElement, w: number, h: number) {
  const scaled = createOffscreenCanvas(w, h);
  const sctx = scaled.getContext('2d')!;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(small, 0, 0, w, h);

  const softened = createOffscreenCanvas(w, h);
  const softCtx = softened.getContext('2d')!;
  softCtx.filter = `blur(${MASK_BLUR_PX}px)`;
  softCtx.drawImage(scaled, 0, 0);
  softCtx.filter = 'none';
  return softened;
}

function buildMirroredConfidenceMask(conf: FloatMaskInfo, w: number, h: number) {
  const mw = conf.width;
  const mh = conf.height;
  const small = createOffscreenCanvas(mw, mh);
  const sctx = small.getContext('2d')!;
  const img = sctx.createImageData(mw, mh);
  const px = img.data;

  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const frameX = ((mx + 0.5) / mw) * w;
      const frameY = ((my + 0.5) / mh) * h;
      const sx = w - 1 - frameX;
      const v = sampleConfidenceValue(conf, sx, frameY, w, h);
      const alpha = confidenceToAlpha(v);
      const i = (my * mw + mx) * 4;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = alpha;
    }
  }

  sctx.putImageData(img, 0, 0);
  return upscaleAndSoftenMask(small, w, h);
}

function buildMirroredCategoryMask(
  maskInfo: MaskInfo,
  w: number,
  h: number,
  flipPolarity = false
) {
  const detected = detectPersonPolarity(maskInfo, w, h);
  const personIsNonZero = flipPolarity ? !detected.personIsNonZero : detected.personIsNonZero;

  const mw = maskInfo.width;
  const mh = maskInfo.height;
  const small = createOffscreenCanvas(mw, mh);
  const sctx = small.getContext('2d')!;
  const img = sctx.createImageData(mw, mh);
  const px = img.data;

  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const frameX = ((mx + 0.5) / mw) * w;
      const frameY = ((my + 0.5) / mh) * h;
      const sx = w - 1 - frameX;
      const v = sampleMaskValue(maskInfo, sx, frameY, w, h);
      const alpha = isPersonValue(v, personIsNonZero) ? 255 : 0;
      const i = (my * mw + mx) * 4;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = alpha;
    }
  }

  sctx.putImageData(img, 0, 0);
  return {
    canvas: upscaleAndSoftenMask(small, w, h),
    ambiguous: detected.ambiguous,
  };
}

function confidenceMaskUsable(conf: FloatMaskInfo) {
  const step = Math.max(1, Math.floor(conf.data.length / 8000));
  for (let i = 0; i < conf.data.length; i += step) {
    if (conf.data[i] > 0.08) return true;
  }
  return false;
}

function buildPersonMask(mask: SegmentationInput, w: number, h: number, flipPolarity = false) {
  const { category, confidence } = resolveSegmentationMasks(mask);
  if (confidence && confidenceMaskUsable(confidence)) {
    return { canvas: buildMirroredConfidenceMask(confidence, w, h), ambiguous: false };
  }
  if (category) return buildMirroredCategoryMask(category, w, h, flipPolarity);
  return null;
}

/**
 * Forest background + mirrored person cutout on top (Smile Strike style).
 */
export function drawWildFourFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  forestCanvas: HTMLCanvasElement | null,
  mask: SegmentationInput,
  w: number,
  h: number
) {
  const videoLayer = createOffscreenCanvas(w, h);
  drawMirroredVideo(videoLayer.getContext('2d')!, video, w, h);

  const paintBackground = () => {
    if (forestCanvas?.width) {
      ctx.drawImage(forestCanvas, 0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a3a2a');
      g.addColorStop(1, '#0d1f15');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  };

  let built = buildPersonMask(mask, w, h);
  if (!built) {
    ctx.drawImage(videoLayer, 0, 0, w, h);
    return;
  }

  const drawCutout = (maskCanvas: HTMLCanvasElement) => {
    const cutout = createOffscreenCanvas(w, h);
    const cutoutCtx = cutout.getContext('2d')!;
    cutoutCtx.drawImage(videoLayer, 0, 0);
    cutoutCtx.globalCompositeOperation = 'destination-in';
    cutoutCtx.drawImage(maskCanvas, 0, 0);
    ctx.drawImage(cutout, 0, 0);
  };

  paintBackground();
  drawCutout(built.canvas);

  if (built.ambiguous && cutoutCenterIsEmpty(built.canvas, w, h)) {
    const flipped = buildPersonMask(mask, w, h, true);
    if (flipped) {
      ctx.clearRect(0, 0, w, h);
      paintBackground();
      drawCutout(flipped.canvas);
    }
  }
}

function cutoutCenterIsEmpty(maskCanvas: HTMLCanvasElement, w: number, h: number) {
  const mctx = maskCanvas.getContext('2d')!;
  const cx = Math.floor(w * 0.5);
  const cy = Math.floor(h * 0.55);
  const r = Math.max(8, Math.floor(Math.min(w, h) * 0.06));
  let sum = 0;
  let count = 0;
  for (let y = cy - r; y <= cy + r; y += 4) {
    for (let x = cx - r; x <= cx + r; x += 4) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      sum += mctx.getImageData(x, y, 1, 1).data[3];
      count += 1;
    }
  }
  return count > 0 && sum / count < 40;
}

export function resetMaskCalibration() {
  /* polarity is detected per frame */
}
