import { useEffect, useRef } from 'react';
import { GROUP_MOMENT_MS, QR_RESET_MS, MAX_PLAYERS } from '../config';
import { useWildFourStore } from '../store/wildFourStore';

export function useGameFlow(assetsReady: boolean) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!assetsReady || initRef.current) return;
    initRef.current = true;
    useWildFourStore.getState().initAnimalPool();
    useWildFourStore.getState().setGameState('detecting');
  }, [assetsReady]);

  const tick = (timestamp: number, faceCount: number, onStartRoulette: (slot: number) => void) => {
    const store = useWildFourStore.getState();
    const { gameState, players, playingStartedAt, groupMomentPlayed } = store;

    if (['attract', 'loading'].includes(gameState) && faceCount > 0) {
      if (gameState !== 'detecting') store.setGameState('detecting');
    }

    if (gameState === 'playing' && playingStartedAt) {
      const assigned = players.filter((p) => p.animal).length;
      if (assigned === MAX_PLAYERS && !groupMomentPlayed) {
        if (gameState !== 'group') store.setGameState('group');
        store.setGroupMomentPlayed(true);
        setTimeout(() => {
          const s = useWildFourStore.getState();
          if (s.gameState === 'group') s.setGameState('playing');
        }, GROUP_MOMENT_MS);
      }

    }

    if (gameState === 'qr' && store.qrShownAt && timestamp - store.qrShownAt > QR_RESET_MS) {
      store.resetGame();
    }

    if (gameState === 'capture' && store.artworkUrl && store.qrShownAt) {
      if (timestamp - store.qrShownAt > QR_RESET_MS) store.resetGame();
    }
  };

  return { tick };
}
