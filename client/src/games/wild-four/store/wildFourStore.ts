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
  groupMomentPlayed: false,
  playingStartedAt: null,
  captureCountdown: null,
  artworkUrl: null,
  qrDataUrl: null,
  qrShownAt: null,

  setGameState: (gameState) => set({ gameState }),

  initAnimalPool: () =>
    set({
      availableAnimals: [...ANIMALS],
      players: [],
      rouletteSlot: null,
      rouletteWinner: null,
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

  setPlayers: (players) => set({ players }),

  setRoulette: (rouletteSlot, winner = null) =>
    set({ rouletteSlot, rouletteWinner: winner }),

  setGroupMomentPlayed: (groupMomentPlayed) => set({ groupMomentPlayed }),

  setPlayingStartedAt: (playingStartedAt) => set({ playingStartedAt }),

  setCaptureCountdown: (captureCountdown) => set({ captureCountdown }),

  setArtwork: (artworkUrl) => set({ artworkUrl }),

  setQr: (qrDataUrl, qrShownAt = Date.now()) => set({ qrDataUrl, qrShownAt }),

  resetGame: () => {
    get().initAnimalPool();
    set({ gameState: 'attract' });
  },
}));
