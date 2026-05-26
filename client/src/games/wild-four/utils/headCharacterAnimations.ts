import { ANIMAL_CONFIG, type AnimalId } from '../config';
import { lmToPx } from './landmarkHelpers';

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

const ROULETTE_ANIMS: HeadAnimKind[] = ['bounce', 'wiggle', 'pulse', 'orbit', 'float', 'shake', 'spin'];

export type RouletteDrawState = {
  slot: number | null;
  displayAnimal: AnimalId | null;
  locked: boolean;
};

export class HeadCharacterAnimator {
  private rouletteAnim: HeadAnimKind = 'spin';

  /** Call when roulette finishes so forehead emoji does not linger. */
  clearRoulette() {
    this.rouletteAnim = ROULETTE_ANIMS[Math.floor(Math.random() * ROULETTE_ANIMS.length)];
  }

  /** Forehead anchor (MediaPipe landmark 10). */
  private forehead(
    face: VisibleFace,
    width: number,
    height: number
  ): { x: number; y: number } {
    const lm = face.landmarks;
    const forehead = lm[10];
    if (forehead) {
      const p = lmToPx(forehead, width, height);
      return { x: p.x, y: p.y - face.faceHeight * 0.06 };
    }
    return {
      x: face.faceCenterX,
      y: face.faceCenterY - face.faceHeight * 0.45,
    };
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

  /**
   * Forehead emoji only while roulette is active for a slot.
   * Hidden after assignment (no overlay, no post-roulette emoji).
   */
  draw(
    ctx: CanvasRenderingContext2D,
    faces: VisibleFace[],
    width: number,
    height: number,
    timeMs: number,
    roulette?: RouletteDrawState
  ) {
    if (roulette?.slot == null || !roulette.displayAnimal) return;

    const face = faces.find((f) => f.slot === roulette.slot);
    if (!face) return;

    const forehead = this.forehead(face, width, height);
    const size = Math.max(28, Math.min(72, face.faceWidth * 0.38));
    const cfg = ANIMAL_CONFIG[roulette.displayAnimal];
    const kind = roulette.locked ? 'pulse' : this.rouletteAnim;
    const seed = face.slot * 17;

    this.drawEmoji(
      ctx,
      cfg.emoji,
      forehead.x,
      forehead.y,
      size * 1.05,
      timeMs,
      kind,
      seed,
      cfg.color
    );
  }
}

export { drawCaptureCountdown } from '../../../utils/drawCaptureCountdown';
