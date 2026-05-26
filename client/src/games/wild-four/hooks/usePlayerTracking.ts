import { useRef } from 'react';
import {
  EYE_WIDE_THRESHOLD,
  FACE_RETURN_PX,
  JAW_OPEN_THRESHOLD,
  MAX_PLAYERS,
  SMILE_THRESHOLD,
  type AnimalId,
} from '../config';
import {
  distLm,
  extractHeadAngles,
  getBlendshapeMap,
  mirrorX,
} from '../utils/landmarkHelpers';
import type { TrackedPlayer } from '../utils/filterRenderer';
import type { VisibleFace } from '../utils/headCharacterAnimations';
import { useWildFourStore, type PlayerSlot } from '../store/wildFourStore';

type Landmark = { x: number; y: number; z?: number };

function playersChanged(next: PlayerSlot[], prev: PlayerSlot[]) {
  if (next.length !== prev.length) return true;
  for (const n of next) {
    const p = prev.find((x) => x.slot === n.slot);
    if (!p) return true;
    if (
      p.animal !== n.animal ||
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
  const velocityRef = useRef<Map<number, number>>(new Map());

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
      const l10 = landmarks[10];
      const l152 = landmarks[152];
      if (!l1 || !l234 || !l454 || !l10 || !l152) return;

      const centerX = mirrorX(l1.x, width);
      const centerY = l1.y * height;
      const categories = (blendshapeList[faceIndex] as { categories?: unknown[] })?.categories;
      const blendshapes = getBlendshapeMap(
        categories as { categoryName?: string; displayName?: string; score?: number }[]
      );
      const matrix = matrices[slot] as { data: Float32Array } | undefined;

      const prev = prevCentersRef.current.get(slot);
      const vel = prev
        ? Math.hypot(centerX - prev.x, centerY - prev.y) / Math.max(width, 1)
        : 0;
      velocityRef.current.set(slot, vel);
      prevCentersRef.current.set(slot, { x: centerX, y: centerY });

      packets.push({ slot, centerX, centerY, landmarks, blendshapes, matrix });
    });

    const store = useWildFourStore.getState();
    let players: PlayerSlot[] = [...store.players];

    for (const p of packets) {
      let existing = players.find((pl) => pl.slot === p.slot);
      if (!existing) {
        const reclaimed = players.find(
          (pl) =>
            !pl.animal &&
            Math.hypot(pl.centerX - p.centerX, pl.centerY - p.centerY) < FACE_RETURN_PX
        );
        if (reclaimed) {
          existing = { ...reclaimed, centerX: p.centerX, centerY: p.centerY, lastSeen: timestamp };
          players = players.map((pl) => (pl.slot === reclaimed!.slot ? existing! : pl));
        } else {
          existing = {
            slot: p.slot,
            faceId: `face-${p.slot}`,
            animal: null,
            centerX: p.centerX,
            centerY: p.centerY,
            lastSeen: timestamp,
          };
          players.push(existing);
        }
      } else {
        existing = {
          ...existing,
          centerX: p.centerX,
          centerY: p.centerY,
          lastSeen: timestamp,
        };
        players = players.map((pl) => (pl.slot === p.slot ? existing! : pl));
      }
    }

    players = players.filter((pl) => packets.some((p) => p.slot === pl.slot));

    const tracked: TrackedPlayer[] = [];
    const visibleFaces: VisibleFace[] = [];

    for (const p of packets) {
      const assigned = players.find((pl) => pl.slot === p.slot)?.animal ?? null;
      const smile =
        ((p.blendshapes.mouthSmileLeft ?? 0) + (p.blendshapes.mouthSmileRight ?? 0)) / 2;
      const surprise =
        ((p.blendshapes.eyeWideLeft ?? 0) + (p.blendshapes.eyeWideRight ?? 0)) / 2;
      const { roll } = extractHeadAngles(p.matrix);
      const faceWidth = distLm(
        p.landmarks[234] as Landmark,
        p.landmarks[454] as Landmark,
        width,
        height
      );
      const faceHeight = distLm(
        p.landmarks[10] as Landmark,
        p.landmarks[152] as Landmark,
        width,
        height
      );

      visibleFaces.push({
        slot: p.slot,
        animal: assigned,
        landmarks: p.landmarks as VisibleFace['landmarks'],
        faceWidth,
        faceHeight,
        faceCenterX: p.centerX,
        faceCenterY: p.centerY,
        headRoll: roll,
      });

      if (!assigned) continue;

      tracked.push({
        slot: p.slot,
        animal: assigned as AnimalId,
        landmarks: p.landmarks as TrackedPlayer['landmarks'],
        faceWidth,
        faceHeight,
        faceCenterX: p.centerX,
        faceCenterY: p.centerY,
        headRoll: roll,
        isSmiling: smile > SMILE_THRESHOLD,
        isJawOpen: (p.blendshapes.jawOpen ?? 0) > JAW_OPEN_THRESHOLD,
        isSurprised: surprise > EYE_WIDE_THRESHOLD,
        movementVelocity: velocityRef.current.get(p.slot) ?? 0,
      });
    }

    if (playersChanged(players, store.players)) {
      store.setPlayers(players);
    }

    return {
      tracked,
      visibleFaces,
      faceCount: packets.length,
      needsRoulette: players.some((pl) => !pl.animal),
    };
  };

  return { processFrame };
}
