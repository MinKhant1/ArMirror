export type HandLandmark = { x: number; y: number; z?: number };

function dist(a: HandLandmark, b: HandLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Finger extended when tip is farther from wrist than the pip joint. */
function isFingerExtended(lm: HandLandmark[], tip: number, pip: number): boolean {
  const wrist = lm[0];
  const tipLm = lm[tip];
  const pipLm = lm[pip];
  if (!wrist || !tipLm || !pipLm) return false;
  const byLength = dist(tipLm, wrist) > dist(pipLm, wrist) * 1.02;
  const byHeight = tipLm.y < pipLm.y - 0.015;
  return byLength || byHeight;
}

/** Victory / peace sign: index + middle up, ring + pinky down. */
export function isPeaceSignHand(lm: HandLandmark[] | undefined): boolean {
  if (!lm || lm.length < 21) return false;
  const indexUp = isFingerExtended(lm, 8, 6);
  const middleUp = isFingerExtended(lm, 12, 10);
  const ringUp = isFingerExtended(lm, 16, 14);
  const pinkyUp = isFingerExtended(lm, 20, 18);
  return indexUp && middleUp && !ringUp && !pinkyUp;
}

export function detectPeaceSign(
  hands: HandLandmark[][] | undefined | null
): boolean {
  if (!hands?.length) return false;
  return hands.some(isPeaceSignHand);
}
