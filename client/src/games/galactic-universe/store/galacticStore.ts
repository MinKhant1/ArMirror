import { create } from 'zustand';
import type { AlienMaskId } from '../config';

export type PlayerSlot = {
  slot: number;
  faceId: string;
  mask: AlienMaskId | null;
  centerX: number;
  centerY: number;
  lastSeen: number;
};

type GalacticState = {
  ready: boolean;
  players: PlayerSlot[];
  setReady: (v: boolean) => void;
  setPlayers: (players: PlayerSlot[]) => void;
  assignMask: (slot: number, mask: AlienMaskId) => void;
};

export const useGalacticStore = create<GalacticState>((set, get) => ({
  ready: false,
  players: [],

  setReady: (ready) => set({ ready }),

  assignMask: (slot, mask) =>
    set((s) => ({
      players: s.players.map((p) => (p.slot === slot ? { ...p, mask } : p)),
    })),

  setPlayers: (players) => {
    const prev = get().players;
    if (
      prev.length === players.length &&
      prev.every((p, i) => {
        const n = players[i];
        return (
          n &&
          p.slot === n.slot &&
          p.mask === n.mask &&
          p.centerX === n.centerX &&
          p.centerY === n.centerY
        );
      })
    ) {
      return;
    }
    set({ players });
  },
}));
