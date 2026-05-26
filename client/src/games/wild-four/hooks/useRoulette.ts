import { useRef, useState } from 'react';
import { ROULETTE_DURATION_MS, type AnimalId } from '../config';
import { useWildFourStore } from '../store/wildFourStore';

export type RoulettePhase = 1 | 2 | 3 | 4;

export function useRoulette() {
  const [displayAnimal, setDisplayAnimal] = useState<AnimalId | null>(null);
  const [phase, setPhase] = useState<RoulettePhase>(1);
  const [locked, setLocked] = useState(false);
  const startRef = useRef(0);
  const winnerRef = useRef<AnimalId | null>(null);

  const start = (slot: number, pool: AnimalId[], onComplete: (animal: AnimalId) => void) => {
    if (!pool.length) return;
    startRef.current = performance.now();
    winnerRef.current = pool[Math.floor(Math.random() * pool.length)];
    setLocked(false);
    setPhase(1);
    useWildFourStore.getState().setRoulette(slot, null);

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const poolNow = useWildFourStore.getState().availableAnimals;
      if (!poolNow.length) return;

      if (elapsed < 1500) {
        setPhase(1);
        const idx = Math.floor(elapsed / 125) % poolNow.length;
        setDisplayAnimal(poolNow[idx]);
      } else if (elapsed < 3500) {
        setPhase(2);
        const t = (elapsed - 1500) / 2000;
        const interval = 125 + t * 875;
        const idx = Math.floor(elapsed / interval) % poolNow.length;
        setDisplayAnimal(poolNow[idx]);
      } else if (elapsed < 4500) {
        setPhase(3);
        const w = winnerRef.current!;
        setDisplayAnimal(w);
      } else if (elapsed < ROULETTE_DURATION_MS) {
        setPhase(4);
        setLocked(true);
        setDisplayAnimal(winnerRef.current);
      } else {
        const w = winnerRef.current!;
        useWildFourStore.getState().assignAnimal(slot, w);
        useWildFourStore.getState().setRoulette(null, w);
        onComplete(w);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return { displayAnimal, phase, locked, start };
}
