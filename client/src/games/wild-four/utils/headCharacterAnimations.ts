import { ANIMAL_CONFIG, type AnimalId } from '../config';
import { earAnchorPointsLm, lmToPx } from './landmarkHelpers';
import type { TrackedPlayer } from './filterRenderer';

export type HeadAnimKind = 'bounce' | 'wiggle' | 'pulse' | 'orbit' | 'float' | 'shake' | 'spin';

export type VisibleFace = {
  slot: number;
  animal: AnimalId | null;
  landmarks: { x: number; y: number; z?: number }[];
  faceWidth: number;
  faceHeight: number;
  faceCenterX: number;
  faceCenterY: number;
  headRoll: number;
};

const ALL_ANIMS: HeadAnimKind[] = ['bounce', 'wiggle', 'pulse', 'orbit', 'float', 'shake', 'spin'];

/** How long each random animation plays before the icon is removed. */
const ANIM_DURATION_MS = 2000;
/** Icon stays hidden this long after the animation ends. */
const HIDE_AFTER_ANIM_MS = 1000;

type SlotState = {
  kind: HeadAnimKind;
  seed: number;
  startedAt: number;
  animal: AnimalId | null;
};

export type RouletteDrawState = {
  slot: number | null;
  displayAnimal: AnimalId | null;
  locked: boolean;
};

export class HeadCharacterAnimator {
  private slots = new Map<number, SlotState>();
  private groupStartedAt = 0;

  private pickGroupAnim(): HeadAnimKind {
    return ALL_ANIMS[Math.floor(Math.random() * ALL_ANIMS.length)];
  }

  /** Start the same random animation on every active head at once. */
  private startGroupCycle(faces: VisibleFace[], timeMs: number) {
    const kind = this.pickGroupAnim();
    this.groupStartedAt = timeMs;
    for (const face of faces) {
      this.slots.set(face.slot, {
        kind,
        seed: face.slot * 17.3,
        startedAt: timeMs,
        animal: face.animal,
      });
    }
  }

  private syncGroup(faces: VisibleFace[], timeMs: number) {
    if (!faces.length) {
      this.groupStartedAt = 0;
      return;
    }

    const cycleMs = ANIM_DURATION_MS + HIDE_AFTER_ANIM_MS;
    const someoneNew = faces.some((f) => !this.slots.has(f.slot));
    const cycleEnded =
      this.groupStartedAt > 0 && timeMs >= this.groupStartedAt + cycleMs;

    if (someoneNew || cycleEnded || this.groupStartedAt === 0) {
      this.startGroupCycle(faces, timeMs);
      return;
    }

    for (const face of faces) {
      const state = this.slots.get(face.slot);
      if (state) state.animal = face.animal;
    }
  }

  private slotVisible(slot: number, timeMs: number) {
    const state = this.slots.get(slot);
    if (!state) return { state: null, visible: false };
    const visible = timeMs < state.startedAt + ANIM_DURATION_MS;
    return { state, visible };
  }

  prune(activeSlots: number[]) {
    const active = new Set(activeSlots);
    for (const slot of this.slots.keys()) {
      if (!active.has(slot)) this.slots.delete(slot);
    }
  }

  private headTop(face: VisibleFace, width: number, height: number) {
    const lm = face.landmarks;
    const anchors = earAnchorPointsLm(lm, width, height, face.faceWidth);
    if (anchors) {
      const y = Math.min(anchors.left.y, anchors.right.y);
      const x = (anchors.left.x + anchors.right.x) / 2;
      return { x, y: y - face.faceHeight * 0.22 };
    }
    const forehead = lm[10];
    if (forehead) {
      const p = lmToPx(forehead, width, height);
      return { x: p.x, y: p.y - face.faceHeight * 0.35 };
    }
    return { x: face.faceCenterX, y: face.faceCenterY - face.faceHeight * 0.55 };
  }

  private animOffset(kind: HeadAnimKind, t: number, seed: number, size: number) {
    const s = t * 0.001 + seed;
    switch (kind) {
      case 'bounce':
        return { dx: 0, dy: Math.sin(s * 5) * size * 0.2, rot: 0, scale: 1 + Math.sin(s * 5) * 0.06 };
      case 'wiggle':
        return {
          dx: Math.sin(s * 7) * size * 0.12,
          dy: Math.sin(s * 4) * size * 0.06,
          rot: Math.sin(s * 6) * 0.25,
          scale: 1,
        };
      case 'pulse':
        return { dx: 0, dy: 0, rot: 0, scale: 1 + Math.sin(s * 4) * 0.18 };
      case 'orbit':
        return {
          dx: Math.cos(s * 3) * size * 0.14,
          dy: Math.sin(s * 3) * size * 0.1,
          rot: s * 0.5,
          scale: 1,
        };
      case 'float':
        return { dx: 0, dy: Math.sin(s * 2.2) * size * 0.14, rot: Math.sin(s * 1.5) * 0.08, scale: 1 };
      case 'shake':
        return {
          dx: Math.sin(s * 14) * size * 0.1,
          dy: 0,
          rot: Math.sin(s * 12) * 0.12,
          scale: 1,
        };
      case 'spin':
        return { dx: 0, dy: -Math.abs(Math.sin(s * 3)) * size * 0.08, rot: s * 2.5, scale: 1 };
      default:
        return { dx: 0, dy: 0, rot: 0, scale: 1 };
    }
  }

  private drawEmoji(
    ctx: CanvasRenderingContext2D,
    emoji: string,
    x: number,
    y: number,
    size: number,
    t: number,
    kind: HeadAnimKind,
    seed: number,
    glow?: string
  ) {
    const { dx, dy, rot, scale } = this.animOffset(kind, t, seed, size);
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = size * 0.35;
    }
    ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    faces: VisibleFace[],
    width: number,
    height: number,
    timeMs: number,
    roulette?: RouletteDrawState
  ) {
    const activeSlots = faces.map((f) => f.slot);
    this.prune(activeSlots);
    this.syncGroup(faces, timeMs);

    for (const face of faces) {
      const top = this.headTop(face, width, height);
      const size = Math.max(28, Math.min(72, face.faceWidth * 0.38));
      const isRouletteTarget = roulette?.slot === face.slot && roulette.displayAnimal;

      if (isRouletteTarget && roulette.displayAnimal) {
        const cfg = ANIMAL_CONFIG[roulette.displayAnimal];
        const fast = roulette.locked ? 'pulse' : 'spin';
        const seed = face.slot * 17;
        this.drawEmoji(ctx, cfg.emoji, top.x, top.y, size * 1.1, timeMs, fast, seed, cfg.color);
        continue;
      }

      const { state, visible } = this.slotVisible(face.slot, timeMs);
      if (!state || !visible) continue;

      if (!face.animal) {
        this.drawEmoji(ctx, '❓', top.x, top.y, size * 0.85, timeMs, state.kind, state.seed);
        continue;
      }

      const cfg = ANIMAL_CONFIG[face.animal];
      this.drawEmoji(ctx, cfg.emoji, top.x, top.y, size, timeMs, state.kind, state.seed, cfg.color);
    }
  }
}

export function drawCaptureCountdown(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  countdown: number | null
) {
  if (countdown == null || countdown < 0) return;
  ctx.save();
  ctx.font = `bold ${Math.min(w, h) * 0.12}px "Cinzel Decorative", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  if (countdown > 0) {
    ctx.fillText(String(countdown), w / 2, h * 0.12);
  }
  ctx.restore();
}
