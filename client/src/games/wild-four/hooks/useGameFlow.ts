import { useEffect, useRef } from 'react';
import {
  FREE_PLAY_DURATION_SEC,
  GROUP_MOMENT_MS,
  QR_RESET_MS,
  MAX_PLAYERS,
} from '../config';
import { useWildFourStore } from '../store/wildFourStore';

export function useGameFlow(assetsReady: boolean) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!assetsReady || initRef.current) return;
    initRef.current = true;
    useWildFourStore.getState().initAnimalPool();
    useWildFourStore.getState().setGameState('attract');
  }, [assetsReady]);

  const tick = (timestamp: number, faceCount: number, onStartRoulette: (slot: number) => void) => {
    const store = useWildFourStore.getState();
    const { gameState, players, availableAnimals, playingStartedAt, groupMomentPlayed } =
      store;

    if (gameState === 'attract' && faceCount > 0) {
      store.setGameState('detecting');
    }

    if (gameState === 'playing' && playingStartedAt) {
      const assigned = players.filter((p) => p.animal).length;
      if (assigned === MAX_PLAYERS && !groupMomentPlayed) {
        store.setGameState('group');
        store.setGroupMomentPlayed(true);
        setTimeout(() => {
          const s = useWildFourStore.getState();
          if (s.gameState === 'group') s.setGameState('playing');
        }, GROUP_MOMENT_MS);
      }

      const elapsed = (timestamp - playingStartedAt) / 1000;
      if (elapsed >= FREE_PLAY_DURATION_SEC) {
        store.setGameState('capture');
      }
    }

    if (gameState === 'qr' && store.qrShownAt && timestamp - store.qrShownAt > QR_RESET_MS) {
      store.resetGame();
    }
  };

  return { tick };
}
