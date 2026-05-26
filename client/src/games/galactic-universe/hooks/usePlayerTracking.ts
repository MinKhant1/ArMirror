import { useRef } from 'react';
import {
  FACE_RETURN_PX,
  MAX_PLAYERS,
  pickRandomMask,
  SMILE_THRESHOLD,
} from '../config';
import {
  distLm,
  extractHeadAngles,
  getBlendshapeMap,
  mirrorX,
} from '../../wild-four/utils/landmarkHelpers';
import type { TrackedPlayer } from '../utils/maskRenderer';
import { useGalacticStore, type PlayerSlot } from '../store/galacticStore';

type Landmark = { x: number; y: number; z?: number };

function playersChanged(next: PlayerSlot[], prev: PlayerSlot[]) {
  if (next.length !== prev.length) return true;
  for (const n of next) {
    const p = prev.find((x) => x.slot === n.slot);
    if (!p) return true;
    if (
      p.mask !== n.mask ||
      p.centerX !== n.centerX ||
      p.centerY !== n.centerY ||
      Math.abs(p.lastSeen - n.lastSeen) > 50
    ) {
      return true;
    }
  }
  return false;
}

export function usePlayerTracking() {
  const prevCentersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPacketRef = useRef<
    Map<
      number,
      {
        timestamp: number;
        centerX: number;
        centerY: number;
        landmarks: Landmark[];
        blendshapes: Record<string, number>;
        matrix?: { data: Float32Array | number[] };
      }
    >
  >(new Map());

  const processFrame = (
    faceLandmarks: Landmark[][],
    blendshapeList: unknown[],
    matrices: unknown[],
    timestamp: number,
    width: number,
    height: number
  ) => {
    const packets: {
      slot: number;
      centerX: number;
      centerY: number;
      landmarks: Landmark[];
      blendshapes: Record<string, number>;
      matrix?: { data: Float32Array | number[] };
    }[] = [];

    const sorted = faceLandmarks
      .map((landmarks, faceIndex) => ({ landmarks, faceIndex }))
      .filter(({ landmarks }) => landmarks?.length > 10)
      .slice(0, MAX_PLAYERS);

    sorted.sort((a, b) => {
      const ax = mirrorX(a.landmarks[1]?.x ?? 0.5, width);
      const bx = mirrorX(b.landmarks[1]?.x ?? 0.5, width);
      return ax - bx;
    });

    sorted.forEach(({ landmarks, faceIndex }, slot) => {
      const l1 = landmarks[1];
      const l234 = landmarks[234];
      const l454 = landmarks[454];
      if (!l1 || !l234 || !l454) return;

      const centerX = mirrorX(l1.x, width);
      const centerY = l1.y * height;
      const categories = (blendshapeList[faceIndex] as { categories?: unknown[] })?.categories;
      const blendshapes = getBlendshapeMap(
        categories as { categoryName?: string; displayName?: string; score?: number }[]
      );
      const matrix = (matrices[faceIndex] ?? matrices[slot]) as
        | { data: Float32Array }
        | undefined;

      prevCentersRef.current.set(slot, { x: centerX, y: centerY });
      packets.push({ slot, centerX, centerY, landmarks, blendshapes, matrix });
      lastPacketRef.current.set(slot, {
        timestamp,
        centerX,
        centerY,
        landmarks,
        blendshapes,
        matrix,
      });
    });

    const store = useGalacticStore.getState();
    let players: PlayerSlot[] = [...store.players];

    const PACKET_GRACE_MS = 450;
    const bySlot = new Map(packets.map((p) => [p.slot, p]));
    const slotsToUse = new Map<number, (typeof packets)[number]>();

    for (let slot = 0; slot < MAX_PLAYERS; slot += 1) {
      const cur = bySlot.get(slot);
      if (cur) {
        slotsToUse.set(slot, cur);
        continue;
      }
      const cached = lastPacketRef.current.get(slot);
      if (cached && timestamp - cached.timestamp <= PACKET_GRACE_MS) {
        slotsToUse.set(slot, {
          slot,
          centerX: cached.centerX,
          centerY: cached.centerY,
          landmarks: cached.landmarks,
          blendshapes: cached.blendshapes,
          matrix: cached.matrix,
        });
      }
    }

    for (const p of slotsToUse.values()) {
      let existing = players.find((pl) => pl.slot === p.slot);
      if (!existing) {
        const reclaimed = players.find(
          (pl) =>
            !pl.mask &&
            Math.hypot(pl.centerX - p.centerX, pl.centerY - p.centerY) < FACE_RETURN_PX
        );
        if (reclaimed) {
          const mask = reclaimed.mask ?? pickRandomMask();
          if (!reclaimed.mask) store.assignMask(reclaimed.slot, mask);
          existing = {
            ...reclaimed,
            mask,
            centerX: p.centerX,
            centerY: p.centerY,
            lastSeen: timestamp,
          };
          players = players.map((pl) => (pl.slot === reclaimed!.slot ? existing! : pl));
        } else {
          existing = {
            slot: p.slot,
            faceId: `face-${p.slot}`,
            mask: pickRandomMask(),
            centerX: p.centerX,
            centerY: p.centerY,
            lastSeen: timestamp,
          };
          players.push(existing);
        }
      } else {
        if (!existing.mask) {
          const mask = pickRandomMask();
          store.assignMask(p.slot, mask);
          existing = { ...existing, mask };
        }
        existing = {
          ...existing,
          centerX: p.centerX,
          centerY: p.centerY,
          lastSeen: timestamp,
        };
        players = players.map((pl) => (pl.slot === p.slot ? existing! : pl));
      }
    }

    players = players.filter((pl) => slotsToUse.has(pl.slot));

    const tracked: TrackedPlayer[] = [];

    for (const p of slotsToUse.values()) {
      const mask = players.find((pl) => pl.slot === p.slot)?.mask;
      if (!mask) continue;

      const smile =
        ((p.blendshapes.mouthSmileLeft ?? 0) + (p.blendshapes.mouthSmileRight ?? 0)) / 2;
      const { roll } = extractHeadAngles(p.matrix);
      const faceWidth = distLm(
        p.landmarks[234] as Landmark,
        p.landmarks[454] as Landmark,
        width,
        height
      );
      const l10 = p.landmarks[10];
      const l152 = p.landmarks[152] ?? p.landmarks[17];
      const faceHeight =
        l10 && l152
          ? distLm(l10 as Landmark, l152 as Landmark, width, height)
          : faceWidth * 1.1;

      tracked.push({
        slot: p.slot,
        mask,
        landmarks: p.landmarks,
        faceWidth,
        faceHeight,
        faceCenterX: p.centerX,
        faceCenterY: p.centerY,
        headRoll: roll,
        isSmiling: smile > SMILE_THRESHOLD,
      });
    }

    if (playersChanged(players, store.players)) {
      store.setPlayers(players);
    }

    return { tracked, faceCount: packets.length };
  };

  return { processFrame };
}
