import { ANIMAL_CONFIG, JAW_OPEN_THRESHOLD, type AnimalId } from '../config';

type Landmark = { x: number; y: number; z?: number };
import {
  blendLmToPx,
  distLm,
  lmToPx,
  mouthCenterLm,
  upperLipCenterLm,
  earAnchorPointsLm,
} from './landmarkHelpers';

export type TrackedPlayer = {
  slot: number;
  animal: AnimalId;
  landmarks: Landmark[];
  faceWidth: number;
  faceHeight: number;
  faceCenterX: number;
  faceCenterY: number;
  headRoll: number;
  isSmiling: boolean;
  isJawOpen: boolean;
  isSurprised: boolean;
  movementVelocity: number;
};

export type AnimationState = {
  earTwitch: number;
  earSwing: number;
  markingsGlow: number;
  noseTwitch: number;
  earsPerk: number;
  earsFlyUp: number;
  headTiltBoost: number;
};

function drawPart(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  roll: number,
  alpha = 1,
  extraRotate = 0,
  flipX = false
) {
  if (!img || (!img.naturalWidth && !img.width)) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(roll + extraRotate);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function computeAnimationState(
  animal: AnimalId,
  time: number,
  player: TrackedPlayer,
  anim: AnimationState
): AnimationState {
  const next = { ...anim };
  const t = time * 0.001;

  if (animal === 'cat') {
    const twitch = Math.sin(t * 2) > 0.95 ? 1 : 0.1;
    next.earTwitch = Math.sin(t * 0.5) * ((8 * Math.PI) / 180) * twitch;
  }
  if (animal === 'dog') {
    const amp = player.movementVelocity > 0.02 ? 15 : 5;
    next.earSwing = Math.sin(t * 1.2) * ((amp * Math.PI) / 180);
    next.headTiltBoost += (Math.abs(player.headRoll) > 0.15 ? 1 : -next.headTiltBoost) * 0.15;
  }
  if (animal === 'fox') {
    next.markingsGlow = 0.4 + Math.sin(t * (player.movementVelocity > 0.02 ? 3 : 1.5)) * 0.15;
  }
  if (animal === 'rabbit') {
    next.noseTwitch = Math.sin(t * 4) * 0.08;
  }
  if (player.isSmiling) {
    next.earsPerk = Math.min(1, next.earsPerk + 0.08);
    if (animal === 'rabbit') next.noseTwitch = 0.12;
  } else {
    next.earsPerk *= 0.92;
  }
  if (player.movementVelocity > 0.05 && animal === 'rabbit') {
    next.earsFlyUp = Math.min(1, next.earsFlyUp + 0.1);
  } else {
    next.earsFlyUp *= 0.9;
  }

  return next;
}

export function drawAnimalFilter(
  ctx: CanvasRenderingContext2D,
  images: Map<string, HTMLImageElement>,
  player: TrackedPlayer,
  anim: AnimationState,
  width: number,
  height: number
) {
  const lm = player.landmarks;
  if (!lm?.length) return;

  const roll = player.headRoll;
  const fw = player.faceWidth;

  if (player.animal === 'dog' && player.isJawOpen) {
    const tongue = images.get('dog/tongue');
    const mouth = mouthCenterLm(lm, width, height);
    if (tongue && mouth) {
      const tw = fw * 0.32;
      const th = tw * (tongue.height / tongue.width);
      drawPart(ctx, tongue, mouth.x, mouth.y, tw, th, roll);
    }
  }

  if (player.animal === 'rabbit' && player.isJawOpen) {
    const teeth = images.get('rabbit/teeth');
    const lip = upperLipCenterLm(lm, width, height);
    if (teeth && lip) {
      const tw = fw * 0.28;
      const th = tw * (teeth.height / teeth.width);
      drawPart(ctx, teeth, lip.x, lip.y, tw, th, roll);
    }
  }

}

/** Blush, nose, whiskers, fox markings — drawn outside the face clip (visible when head turns). */
export function drawAnimalAccessories(
  ctx: CanvasRenderingContext2D,
  images: Map<string, HTMLImageElement>,
  player: TrackedPlayer,
  anim: AnimationState,
  width: number,
  height: number
) {
  const lm = player.landmarks;
  if (!lm?.length) return;

  const roll = player.headRoll;
  const fw = player.faceWidth;
  const fh = player.faceHeight;

  const l50 = lm[50];
  const l280 = lm[280];
  const l234 = lm[234];
  const l454 = lm[454];
  const l4 = lm[4];
  const l33 = lm[33];

  if (player.animal === 'dog' && l33) {
    const patch = images.get('dog/eyepatch');
    if (patch) {
      const pos = lmToPx(l33, width, height);
      drawPart(ctx, patch, pos.x, pos.y, fw * 0.38, fw * 0.38, roll);
    }
  }

  const blush = images.get(`${player.animal}/blush`);
  if (blush && l50 && l280) {
    const bw = fw * 0.35;
    const bh = bw * 0.6;
    const left = lmToPx(l50, width, height);
    const right = lmToPx(l280, width, height);
    drawPart(ctx, blush, left.x, left.y, bw, bh, roll, 0.75);
    drawPart(ctx, blush, right.x, right.y, bw, bh, roll, 0.75);
  }

  const nose = images.get(`${player.animal}/nose`);
  if (nose && l4) {
    const pos = lmToPx(l4, width, height);
    const nw = fw * 0.28;
    const scale = player.animal === 'rabbit' ? 1 + anim.noseTwitch : 1;
    drawPart(ctx, nose, pos.x, pos.y, nw * scale, nw * scale * (nose.height / nose.width), roll);
  }

  if (player.animal === 'cat' || player.animal === 'rabbit') {
    const leftImg = images.get(`${player.animal}/whiskers-left`);
    const rightImg = images.get(`${player.animal}/whiskers-right`);
    const ww = fw * (player.animal === 'rabbit' ? 0.6 : 0.55);
    const wh = ww * 0.35;
    if (leftImg && l234) {
      const left = lmToPx(l234, width, height);
      drawPart(ctx, leftImg, left.x, left.y + fh * 0.06, ww, wh, roll, 0.95);
    }
    if (rightImg && l454) {
      const right = lmToPx(l454, width, height);
      drawPart(ctx, rightImg, right.x, right.y + fh * 0.06, ww, wh, roll, 0.95);
    }
  }

  if (player.animal === 'fox' && l234 && l454 && l50 && l280) {
    const markLeft = images.get('fox/markings-left');
    const markRight = images.get('fox/markings-right');
    const bw = fw * 0.3;
    const inward = 0.58;
    if (markLeft) {
      const left = blendLmToPx(l234, l50, width, height, inward);
      drawPart(ctx, markLeft, left.x, left.y, bw, bw, roll, anim.markingsGlow);
    }
    if (markRight) {
      const right = blendLmToPx(l454, l280, width, height, inward);
      drawPart(ctx, markRight, right.x, right.y, bw, bw, roll, anim.markingsGlow);
    }
  }
}

/** Ears only — called outside the face clip rect */
export function drawAnimalEars(
  ctx: CanvasRenderingContext2D,
  images: Map<string, HTMLImageElement>,
  player: TrackedPlayer,
  anim: AnimationState,
  width: number,
  height: number
) {
  const lm = player.landmarks;
  if (!lm?.length) return;

  const roll = player.headRoll;
  const fw = player.faceWidth;

  const animal = player.animal;
  const img = images.get(`${animal}/ear`);
  if (!img) return;

  const imgW = img.naturalWidth || img.width || 512;
  const imgH = img.naturalHeight || img.height || 512;
  const scaleByAnimal: Record<AnimalId, number> = {
    cat: 0.56,
    dog: 0.6,
    fox: 0.48,
    rabbit: 0.82,
  };
  const earW = fw * (scaleByAnimal[animal] ?? 0.65);
  const earH = earW * (imgH / imgW);

  const anchors = earAnchorPointsLm(lm, width, height, fw);
  if (!anchors) return;

  const liftByAnimal: Record<AnimalId, number> = {
    cat: 0.48,
    dog: 0.46,
    fox: 0.55,
    rabbit: 0.58,
  };
  const earY = anchors.left.y - earH * (liftByAnimal[animal] ?? 0.4);

  let extra = 0;
  if (animal === 'cat') extra = anim.earTwitch + anim.earsPerk * 0.12;
  if (animal === 'dog') extra = anim.earSwing;
  if (animal === 'rabbit') extra = anim.earsPerk * 0.12 - anim.earsFlyUp * 0.2;

  const nudge = fw * 0.03;

  drawPart(
    ctx,
    img,
    anchors.left.x - nudge,
    earY,
    earW,
    earH,
    roll,
    1,
    extra - 0.08,
    false
  );
  drawPart(
    ctx,
    img,
    anchors.right.x + nudge,
    earY,
    earW,
    earH,
    roll,
    1,
    extra + 0.08,
    true
  );
}

export function shouldShowConditional(
  animal: AnimalId,
  part: string,
  isJawOpen: boolean
): boolean {
  const cfg = ANIMAL_CONFIG[animal];
  const cond = cfg.conditionalParts?.[part];
  if (!cond) return true;
  if (cond.showWhen === 'jawOpen') {
    return isJawOpen;
  }
  return true;
}

export function isJawOpenFromMap(map: Record<string, number>) {
  return (map.jawOpen ?? 0) > JAW_OPEN_THRESHOLD;
}
