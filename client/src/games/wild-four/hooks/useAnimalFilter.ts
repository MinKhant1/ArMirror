import { useRef } from 'react';
import {
  computeAnimationState,
  drawAnimalFilter,
  drawAnimalAccessories,
  drawAnimalEars,
  type AnimationState,
  type TrackedPlayer,
} from '../utils/filterRenderer';

const defaultAnim = (): AnimationState => ({
  earTwitch: 0,
  earSwing: 0,
  earsPerk: 0,
  headTiltBoost: 0,
});

export function useAnimalFilter() {
  const animRef = useRef<Map<number, AnimationState>>(new Map());

  const render = (
    ctx: CanvasRenderingContext2D,
    images: Map<string, HTMLImageElement>,
    players: TrackedPlayer[],
    width: number,
    height: number,
    time: number
  ) => {
    for (const player of players) {
      const prev = animRef.current.get(player.slot) ?? defaultAnim();
      const next = computeAnimationState(player.animal, time, player, prev);
      animRef.current.set(player.slot, next);

      const halfW = player.faceWidth * 0.85;
      const boxTop = player.faceCenterY - player.faceHeight * 0.55;
      const boxH = player.faceHeight * 1.35;
      ctx.save();
      ctx.beginPath();
      ctx.rect(player.faceCenterX - halfW, boxTop, halfW * 2, boxH);
      ctx.clip();
      drawAnimalFilter(ctx, images, player, next, width, height);
      ctx.restore();

      // Side/top features extend past the clip when the head turns
      drawAnimalAccessories(ctx, images, player, next, width, height);
      drawAnimalEars(ctx, images, player, next, width, height);
    }
  };

  return { render };
}
