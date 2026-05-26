import { ANIMAL_CONFIG, JAW_OPEN_THRESHOLD, type AnimalId } from '../config';

type Landmark = { x: number; y: number; z?: number };
import {
  distLm,
  lmToPx,
  openMouthCenterLm,
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
  earsPerk: number;
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
  flipX = false,
  anchor: 'center' | 'top' | 'bottom' = 'center'
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(roll + extraRotate);
  if (flipX) ctx.scale(-1, 1);
  const dy = anchor === 'top' ? 0 : anchor === 'bottom' ? -h : -h / 2;
  ctx.drawImage(img, -w / 2, dy, w, h);
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

  if (animal === 'dog') {
    const amp = player.movementVelocity > 0.02 ? 15 : 5;
    next.earSwing = Math.sin(t * 1.2) * ((amp * Math.PI) / 180);
    next.headTiltBoost += (Math.abs(player.headRoll) > 0.15 ? 1 : -next.headTiltBoost) * 0.15;
  }
  if (animal === 'coala') {
    next.earTwitch = Math.sin(t * 1.5) * ((6 * Math.PI) / 180);
  }
  if (player.isSmiling) next.earsPerk = Math.min(1, next.earsPerk + 0.08);
  else next.earsPerk *= 0.92;

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
    const mouth = openMouthCenterLm(lm, width, height);
    if (tongue && mouth) {
      const tw = fw * 0.32;
      const th = tw * (tongue.height / tongue.width);
      const tongueY = mouth.y + player.faceHeight * 0.09;
      drawPart(ctx, tongue, mouth.x, tongueY, tw, th, roll);
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

  const l50 = lm[50];
  const l280 = lm[280];
  const l4 = lm[4];
  const l33 = lm[33];

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
    const noseScale: Record<AnimalId, number> = {
      dog: 0.28,
      cow: 0.28,
      coala: 1,
    };
    const nw = fw * (noseScale[player.animal] ?? 0.28);
    drawPart(ctx, nose, pos.x, pos.y, nw, nw * (nose.height / nose.width), roll);
  }

  // Note: cow horns are drawn in drawAnimalEars after the ears to avoid being covered.
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

  let anchors = earAnchorPointsLm(lm, width, height, fw);
  if (!anchors) return;

  if (animal === 'coala') {
    const earL = images.get('coala/ear-left');
    const earR = images.get('coala/ear-right');
    if (!earL && !earR) return;

    const earW = fw * 1.5;
    const earHL =
      earL && (earL.naturalWidth || earL.width)
        ? earW * ((earL.naturalHeight || earL.height) / (earL.naturalWidth || earL.width))
        : earW;
    const earHR =
      earR && (earR.naturalWidth || earR.width)
        ? earW * ((earR.naturalHeight || earR.height) / (earR.naturalWidth || earR.width))
        : earW;

    const earY = anchors.left.y - Math.max(earHL, earHR) * 0.42;
    const nudge = fw * 0.04;
    const extra = anim.earTwitch + anim.earsPerk * 0.05;

    if (earL) {
      drawPart(
        ctx,
        earL,
        anchors.left.x - nudge,
        earY,
        earW,
        earHL,
        roll,
        1,
        extra - 0.05,
        false,
        'center'
      );
    }
    if (earR) {
      drawPart(
        ctx,
        earR,
        anchors.right.x + nudge,
        earY,
        earW,
        earHR,
        roll,
        1,
        extra + 0.05,
        false,
        'center'
      );
    }
    return;
  }

  const img = images.get(`${animal}/ear`);
  if (!img) return;

  const imgW = img.naturalWidth || img.width || 512;
  const imgH = img.naturalHeight || img.height || 512;
  const scaleByAnimal: Record<AnimalId, number> = {
    dog: 0.6,
    cow: 0.72,
    coala: 0.7,
  };
  const earW = fw * (scaleByAnimal[animal] ?? 0.65);
  const earH = earW * (imgH / imgW);

  let dogEarAttach: { left: { x: number; y: number }; right: { x: number; y: number } } | null =
    null;
  if (animal === 'dog' && lm[234] && lm[454]) {
    const templeL = lmToPx(lm[234], width, height);
    const templeR = lmToPx(lm[454], width, height);
    // Bottom of ear sits on the head at the temple; ear extends upward.
    const attachY = Math.min(templeL.y, templeR.y, anchors.left.y) - fw * 0.06;
    dogEarAttach = {
      left: { x: templeL.x, y: attachY },
      right: { x: templeR.x, y: attachY },
    };
    anchors = {
      left: { x: templeL.x, y: anchors.left.y },
      right: { x: templeR.x, y: anchors.right.y },
    };
  }

  const liftByAnimal: Record<AnimalId, number> = {
    dog: 0,
    cow: 0.5,
    coala: 0.42,
  };
  const earCenterY = anchors.left.y - earH * (liftByAnimal[animal] ?? 0.4);

  let extra = 0;
  if (animal === 'dog') extra = anim.earSwing;
  if (animal === 'cow') extra = anim.earsPerk * 0.06;

  const nudge = fw * 0.03;
  const dogEarAnchor: 'bottom' | 'center' = 'bottom';

  // Cow horns: draw BEFORE ears so they appear behind the ear sprites.
  if (animal === 'cow') {
    const hornL = images.get('cow/horn-left');
    const hornR = images.get('cow/horn-right');

    if (hornL || hornR) {
      const hornW = fw * 0.28; // slightly smaller

      const hornLAspect =
        hornL && hornL.naturalWidth
          ? hornL.naturalHeight / hornL.naturalWidth
          : hornL && hornL.width
            ? hornL.height / hornL.width
            : 1;
      const hornRAspect =
        hornR && hornR.naturalWidth
          ? hornR.naturalHeight / hornR.naturalWidth
          : hornR && hornR.width
            ? hornR.height / hornR.width
            : 1;

      const hornLH = hornW * hornLAspect;
      const hornRH = hornW * hornRAspect;

      // Move horns closer to center (lerp towards face center).
      const centerX = player.faceCenterX;
      const xL = anchors.left.x + (centerX - anchors.left.x) * 0.38;
      const xR = anchors.right.x + (centerX - anchors.right.x) * 0.38;

      // Place horns slightly above ear centers.
      const hornY = earCenterY - earH * 0.15 - hornLH * 0.04;

      if (hornL) {
        drawPart(ctx, hornL, xL, hornY, hornW, hornLH, roll, 1, -0.06);
      }
      if (hornR) {
        drawPart(ctx, hornR, xR, hornY, hornW, hornRH, roll, 1, 0.06);
      }
    }
  }

  const leftEarY =
    animal === 'dog' && dogEarAttach ? dogEarAttach.left.y : earCenterY;
  const rightEarY =
    animal === 'dog' && dogEarAttach ? dogEarAttach.right.y : earCenterY;
  const leftEarX =
    animal === 'dog' && dogEarAttach ? dogEarAttach.left.x - nudge : anchors.left.x - nudge;
  const rightEarX =
    animal === 'dog' && dogEarAttach ? dogEarAttach.right.x + nudge : anchors.right.x + nudge;
  const earAnchor = animal === 'dog' ? dogEarAnchor : 'center';

  drawPart(
    ctx,
    img,
    leftEarX,
    leftEarY,
    earW,
    earH,
    roll,
    1,
    extra - 0.08,
    false,
    earAnchor
  );
  drawPart(
    ctx,
    img,
    rightEarX,
    rightEarY,
    earW,
    earH,
    roll,
    1,
    extra + 0.08,
    true,
    earAnchor
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
