/** Holds last peace-sign result between MediaPipe detect frames (~30fps). */
export function updatePeaceSignHeld(
  heldRef: { current: boolean },
  detectedThisFrame: boolean | null
): boolean {
  if (detectedThisFrame !== null) {
    heldRef.current = detectedThisFrame;
  }
  return heldRef.current;
}

export type PeaceCountdownTick = {
  timestamp: number;
  peaceHeld: boolean;
  countdownSec: number;
  countdown: number | null;
  startedAt: number;
  cooldownUntil: number;
};

export type PeaceCountdownResult = {
  countdown: number | null;
  startedAt: number;
  cooldownUntil: number;
  /** Call once when countdown reaches 0 while peace is still held */
  shouldCapture: boolean;
};

/**
 * Drive a peace-sign photo countdown. Returns updated state each animation frame.
 */
export function tickPeaceCountdown(input: PeaceCountdownTick): PeaceCountdownResult {
  const { timestamp, peaceHeld, countdownSec, cooldownUntil } = input;
  let { countdown, startedAt } = input;
  let nextCooldown = cooldownUntil;
  let shouldCapture = false;

  if (timestamp < cooldownUntil) {
    return { countdown: null, startedAt, cooldownUntil: nextCooldown, shouldCapture: false };
  }

  if (!peaceHeld) {
    if (countdown != null && countdown > 0) {
      countdown = null;
    }
    return { countdown, startedAt, cooldownUntil: nextCooldown, shouldCapture: false };
  }

  if (countdown === null) {
    countdown = countdownSec;
    startedAt = timestamp;
    return { countdown, startedAt, cooldownUntil: nextCooldown, shouldCapture: false };
  }

  if (countdown > 0) {
    const elapsedSec = (timestamp - startedAt) / 1000;
    const remaining = Math.max(0, countdownSec - Math.floor(elapsedSec));
    countdown = remaining;
    if (remaining === 0) {
      shouldCapture = true;
      countdown = null;
      nextCooldown = timestamp + 3000;
    }
  }

  return { countdown, startedAt, cooldownUntil: nextCooldown, shouldCapture };
}
