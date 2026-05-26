import type { AlienMaskId } from '../config';
import {
  MASK_EYE_LAYOUT,
  MASK_FACE_LAYOUT,
  MASK_SIZE_SCALE,
} from '../config';
import { lmToPx, midpointLm } from '../../wild-four/utils/landmarkHelpers';

type Landmark = { x: number; y: number; z?: number };

export type TrackedPlayer = {
  slot: number;
  mask: AlienMaskId;
  faceWidth: number;
  faceHeight: number;
  faceCenterX: number;
  faceCenterY: number;
  headRoll: number;
  isSmiling: boolean;
  landmarks: Landmark[];
};

function getPlayerEyes(lm: Landmark[], width: number, height: number) {
  const l33 = lm[33];
  const l133 = lm[133];
  const l263 = lm[263];
  const l362 = lm[362];
  if (!l33 || !l133 || !l263 || !l362) return null;

  const left = midpointLm(l33, l133, width, height);
  const right = midpointLm(l362, l263, width, height);
  const mid = {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
  const interEye = Math.hypot(right.x - left.x, right.y - left.y);
  if (interEye < 8) return null;

  return { left, right, mid, interEye };
}

function drawEyeAlignedMask(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  player: TrackedPlayer,
  width: number,
  height: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const layout = MASK_EYE_LAYOUT[player.mask];
  if (!layout) return;

  const eyes = getPlayerEyes(player.landmarks, width, height);
  if (!eyes) return;

  const eyeSpan = layout.rightEye.x - layout.leftEye.x;
  const scaleMul = (layout.scaleMul ?? 1) * MASK_SIZE_SCALE;
  const maskW = (eyes.interEye / eyeSpan) * scaleMul;
  const maskH = maskW * (ih / iw);

  const anchorX = ((layout.leftEye.x + layout.rightEye.x) / 2) * maskW;
  const anchorY = ((layout.leftEye.y + layout.rightEye.y) / 2) * maskH;
  const lift = (layout.lift ?? 0) * eyes.interEye;

  ctx.save();
  ctx.translate(eyes.mid.x, eyes.mid.y - lift);
  ctx.rotate(player.headRoll);
  ctx.drawImage(img, -anchorX, -anchorY, maskW, maskH);
  ctx.restore();
}

function drawFaceCenterMask(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  player: TrackedPlayer
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const layout = MASK_FACE_LAYOUT[player.mask];
  if (!layout) return;

  const aspect = ih / iw;
  const wFromFace = player.faceWidth / layout.openingWidthFrac;
  const hFromFace = player.faceHeight / layout.openingHeightFrac;
  const scaleMul = (layout.scaleMul ?? 1) * MASK_SIZE_SCALE;
  const maskW = Math.max(wFromFace, hFromFace / aspect) * scaleMul;
  const maskH = maskW * aspect;

  const anchorX = layout.center.x * maskW;
  const anchorY = layout.center.y * maskH;
  const lift = (layout.liftY ?? 0) * player.faceHeight;

  ctx.save();
  ctx.translate(player.faceCenterX, player.faceCenterY - lift);
  ctx.rotate(player.headRoll);
  ctx.drawImage(img, -anchorX, -anchorY, maskW, maskH);
  ctx.restore();
}

function drawFaceMaskFallback(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  player: TrackedPlayer
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const maskW = player.faceWidth * 2.1 * MASK_SIZE_SCALE;
  const maskH = maskW * (ih / iw);
  const cx = player.faceCenterX;
  const cy = player.faceCenterY - player.faceHeight * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.headRoll);
  ctx.drawImage(img, -maskW / 2, -maskH / 2, maskW, maskH);
  ctx.restore();
}

export function drawFaceMask(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  player: TrackedPlayer,
  width: number,
  height: number
) {
  if (MASK_FACE_LAYOUT[player.mask]) {
    drawFaceCenterMask(ctx, img, player);
    return;
  }

  if (MASK_EYE_LAYOUT[player.mask]) {
    const eyes = getPlayerEyes(player.landmarks, width, height);
    if (eyes) {
      drawEyeAlignedMask(ctx, img, player, width, height);
      return;
    }
  }

  drawFaceMaskFallback(ctx, img, player);
}

export function drawAllMasks(
  ctx: CanvasRenderingContext2D,
  images: Map<string, HTMLImageElement>,
  players: TrackedPlayer[],
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  for (const player of players) {
    const img = images.get(player.mask);
    if (!img) continue;
    drawFaceMask(ctx, img, player, width, height);
  }
}
