import type { TrackedPlayer } from './maskRenderer';
import { lmToPx } from '../../wild-four/utils/landmarkHelpers';

type SlotAnim = {
  phase: 'hidden' | 'rising' | 'hold' | 'fading';
  progress: number;
  startedAt: number;
};

const RISE_MS = 520;
const FADE_MS = 320;

export class FriendshipAnimator {
  private slots = new Map<number, SlotAnim>();

  update(players: TrackedPlayer[], timestamp: number) {
    const smiling = new Set(players.filter((p) => p.isSmiling).map((p) => p.slot));

    for (const slot of smiling) {
      let anim = this.slots.get(slot);
      if (!anim || anim.phase === 'hidden' || anim.phase === 'fading') {
        this.slots.set(slot, {
          phase: 'rising',
          progress: 0,
          startedAt: timestamp,
        });
        continue;
      }
      if (anim.phase === 'rising') {
        const t = Math.min(1, (timestamp - anim.startedAt) / RISE_MS);
        if (t >= 1) {
          this.slots.set(slot, { phase: 'hold', progress: 1, startedAt: timestamp });
        } else {
          anim.progress = t;
        }
      }
    }

    for (const [slot, anim] of this.slots) {
      if (smiling.has(slot)) continue;
      if (anim.phase === 'hold' || anim.phase === 'rising') {
        this.slots.set(slot, { phase: 'fading', progress: 1, startedAt: timestamp });
      } else if (anim.phase === 'fading') {
        const t = 1 - Math.min(1, (timestamp - anim.startedAt) / FADE_MS);
        if (t <= 0) this.slots.delete(slot);
        else anim.progress = t;
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    players: TrackedPlayer[],
    width: number,
    height: number,
    timestamp: number
  ) {
    ctx.clearRect(0, 0, width, height);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    for (const player of players) {
      const anim = this.slots.get(player.slot);
      if (!anim || anim.phase === 'hidden') continue;

      const lm = player.landmarks;
      const forehead = lm[10] ?? lm[151];
      const anchor = forehead
        ? lmToPx(forehead, width, height)
        : { x: player.faceCenterX, y: player.faceCenterY - player.faceHeight * 0.55 };

      const fw = player.faceWidth;
      const badgeW = fw * 1.05;
      const badgeH = badgeW * (ih / iw);
      const riseOffset = (1 - anim.progress) * fw * 0.55;
      const y = anchor.y - badgeH * 0.35 - riseOffset;
      const alpha =
        anim.phase === 'fading' ? anim.progress : Math.min(1, anim.progress + 0.15);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(anchor.x, y);
      ctx.rotate(player.headRoll * 0.35);
      ctx.drawImage(img, -badgeW / 2, -badgeH, badgeW, badgeH);
      ctx.restore();
    }
  }
}
