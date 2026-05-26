import { create } from 'zustand';
import { ANIMALS, type AnimalId } from '../config';

export type GameState =
  | 'loading'
  | 'attract'
  | 'detecting'
  | 'roulette'
  | 'playing'
  | 'group'
  | 'capture'
  | 'qr'
  | 'reset';

export type PlayerSlot = {
  slot: number;
  faceId: string;
  animal: AnimalId | null;
  centerX: number;
  centerY: number;
  lastSeen: number;
};

type WildFourState = {
  gameState: GameState;
  availableAnimals: AnimalId[];
  players: PlayerSlot[];
  rouletteSlot: number | null;
  rouletteWinner: AnimalId | null;
  roulettePreview: AnimalId | null;
  rouletteLocked: boolean;
  groupMomentPlayed: boolean;
  playingStartedAt: number | null;
  captureCountdown: number | null;
  artworkUrl: string | null;
  qrDataUrl: string | null;
  qrShownAt: number | null;
  setGameState: (s: GameState) => void;
  initAnimalPool: () => void;
  assignAnimal: (slot: number, animal: AnimalId) => void;
  setPlayers: (players: PlayerSlot[]) => void;
  setRoulette: (slot: number | null, winner?: AnimalId | null) => void;
  setRoulettePreview: (animal: AnimalId | null, locked?: boolean) => void;
  setGroupMomentPlayed: (v: boolean) => void;
  setPlayingStartedAt: (t: number | null) => void;
  setCaptureCountdown: (n: number | null) => void;
  setArtwork: (url: string | null) => void;
  setQr: (url: string | null, shownAt?: number | null) => void;
  resetGame: () => void;
};

export const useWildFourStore = create<WildFourState>((set, get) => ({
  gameState: 'loading',
  availableAnimals: [...ANIMALS],
  players: [],
  rouletteSlot: null,
  rouletteWinner: null,
  roulettePreview: null,
  rouletteLocked: false,
  groupMomentPlayed: false,
  playingStartedAt: null,
  captureCountdown: null,
  artworkUrl: null,
  qrDataUrl: null,
  qrShownAt: null,

  setGameState: (gameState) => {
    if (get().gameState === gameState) return;
    set({ gameState });
  },

  initAnimalPool: () =>
    set({
      availableAnimals: [...ANIMALS],
      players: [],
      rouletteSlot: null,
      rouletteWinner: null,
      roulettePreview: null,
      rouletteLocked: false,
      groupMomentPlayed: false,
      playingStartedAt: null,
      captureCountdown: null,
      artworkUrl: null,
      qrDataUrl: null,
      qrShownAt: null,
    }),

  assignAnimal: (slot, animal) => {
    const pool = get().availableAnimals.filter((a) => a !== animal);
    set((s) => ({
      availableAnimals: pool,
      players: s.players.map((p) => (p.slot === slot ? { ...p, animal } : p)),
      rouletteWinner: animal,
    }));
  },

  setPlayers: (players) => {
    const prev = get().players;
    if (prev === players) return;
    if (
      prev.length === players.length &&
      prev.every((p, i) => {
        const n = players[i];
        return (
          n &&
          p.slot === n.slot &&
          p.animal === n.animal &&
          p.centerX === n.centerX &&
          p.centerY === n.centerY
        );
      })
    ) {
      return;
    }
    set({ players });
  },

  setRoulette: (rouletteSlot, winner = null) =>
    set({ rouletteSlot, rouletteWinner: winner }),

  setRoulettePreview: (roulettePreview, rouletteLocked = false) =>
    set({ roulettePreview, rouletteLocked }),

  setGroupMomentPlayed: (groupMomentPlayed) => set({ groupMomentPlayed }),

  setPlayingStartedAt: (playingStartedAt) => set({ playingStartedAt }),

  setCaptureCountdown: (captureCountdown) => set({ captureCountdown }),

  setArtwork: (artworkUrl) => set({ artworkUrl }),

  setQr: (qrDataUrl, qrShownAt = Date.now()) => set({ qrDataUrl, qrShownAt }),

  resetGame: () => {
    get().initAnimalPool();
    set({ gameState: 'detecting' });
  },
}));
