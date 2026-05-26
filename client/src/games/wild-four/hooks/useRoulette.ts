import { useRef, useState } from 'react';
import { ROULETTE_DURATION_MS, type AnimalId } from '../config';
import { useWildFourStore } from '../store/wildFourStore';

export type RoulettePhase = 1 | 2 | 3 | 4;

export function useRoulette() {
  const [phase, setPhase] = useState<RoulettePhase>(1);
  const startRef = useRef(0);
  const winnerRef = useRef<AnimalId | null>(null);
  const poolRef = useRef<AnimalId[]>([]);
  const rafRef = useRef(0);

  const clearPreview = () => {
    useWildFourStore.getState().setRoulettePreview(null, false);
  };

  const start = (
    slot: number,
    pool: AnimalId[],
    onComplete: (animal: AnimalId) => void,
    onAbort?: () => void
  ): boolean => {
    if (!pool.length) {
      onAbort?.();
      return false;
    }

    cancelAnimationFrame(rafRef.current);
    poolRef.current = [...pool];
    startRef.current = performance.now();
    winnerRef.current = pool[Math.floor(Math.random() * pool.length)];
    setPhase(1);
    useWildFourStore.getState().setRoulette(slot, null);
    useWildFourStore.getState().setRoulettePreview(pool[0], false);

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const poolNow = poolRef.current;
      const winner = winnerRef.current;
      if (!poolNow.length || !winner) {
        clearPreview();
        onAbort?.();
        return;
      }

      const store = useWildFourStore.getState();

      if (elapsed < 1500) {
        setPhase(1);
        const idx = Math.floor(elapsed / 125) % poolNow.length;
        store.setRoulettePreview(poolNow[idx], false);
      } else if (elapsed < 3500) {
        setPhase(2);
        const t = (elapsed - 1500) / 2000;
        const interval = 125 + t * 875;
        const idx = Math.floor(elapsed / interval) % poolNow.length;
        store.setRoulettePreview(poolNow[idx], false);
      } else if (elapsed < 4500) {
        setPhase(3);
        store.setRoulettePreview(winner, false);
      } else if (elapsed < ROULETTE_DURATION_MS) {
        setPhase(4);
        store.setRoulettePreview(winner, true);
      } else {
        store.setRoulette(null, winner);
        clearPreview();
        onComplete(winner);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return true;
  };

  return { phase, start, clearPreview };
}
