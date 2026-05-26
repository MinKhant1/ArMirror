type Landmark = { x: number; y: number; z?: number; visibility?: number };

export function mirrorX(x: number, width: number) {
  return (1 - x) * width;
}

export function lmToPx(lm: Landmark, width: number, height: number) {
  return { x: mirrorX(lm.x, width), y: lm.y * height };
}

export function distLm(a: Landmark, b: Landmark, w: number, h: number) {
  const pa = lmToPx(a, w, h);
  const pb = lmToPx(b, w, h);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

export function extractHeadAngles(matrix?: { data: Float32Array | number[] }) {
  if (!matrix?.data || matrix.data.length < 16) {
    return { roll: 0, yaw: 0, pitch: 0 };
  }
  const m = matrix.data;
  const roll = Math.atan2(m[1], m[0]);
  const yaw = Math.atan2(m[8], m[10]);
  const pitch = Math.asin(Math.max(-1, Math.min(1, -m[9])));
  return { roll, yaw, pitch };
}

export function getBlendshapeMap(
  categories: { categoryName?: string; displayName?: string; score?: number }[] | undefined
) {
  const map: Record<string, number> = {};
  if (!categories) return map;
  for (const c of categories) {
    const name = c.categoryName ?? c.displayName ?? '';
    if (name) map[name] = c.score ?? 0;
  }
  return map;
}

export function midpointLm(a: Landmark, b: Landmark, width: number, height: number) {
  return {
    x: mirrorX((a.x + b.x) / 2, width),
    y: ((a.y + b.y) / 2) * height,
  };
}

/** Blend two landmarks in screen space (t=0 → a, t=1 → b). */
export function blendLmToPx(
  a: Landmark,
  b: Landmark,
  width: number,
  height: number,
  t: number
) {
  const pa = lmToPx(a, width, height);
  const pb = lmToPx(b, width, height);
  return {
    x: pa.x + (pb.x - pa.x) * t,
    y: pa.y + (pb.y - pa.y) * t,
  };
}

/** Center of open mouth (between upper lip and chin). */
export function mouthCenterLm(
  lm: Landmark[],
  width: number,
  height: number
): { x: number; y: number } | null {
  const upperL = lm[13];
  const upperR = lm[14];
  const chin = lm[152] ?? lm[17];
  if (!upperL || !upperR) return null;
  const upper = midpointLm(upperL, upperR, width, height);
  if (!chin) return upper;
  const chinPx = lmToPx(chin, width, height);
  return {
    x: upper.x,
    y: upper.y * 0.55 + chinPx.y * 0.45,
  };
}

/**
 * Top-of-head ear anchors (forehead + outer brow), not side temple points.
 * Returns screen-left and screen-right positions.
 */
export function earAnchorPointsLm(
  lm: Landmark[],
  width: number,
  height: number,
  faceWidth: number
): { left: { x: number; y: number }; right: { x: number; y: number } } | null {
  const forehead = lm[10];
  if (!forehead) return null;
  const top = lmToPx(forehead, width, height);

  const spread = faceWidth * 0.3;
  let left = lm[21] ? lmToPx(lm[21], width, height) : { x: top.x - spread, y: top.y };
  let right = lm[251] ? lmToPx(lm[251], width, height) : { x: top.x + spread, y: top.y };

  if (left.x > right.x) {
    const swap = left;
    left = right;
    right = swap;
  }

  const anchorY = Math.min(top.y, left.y, right.y);
  return {
    left: { x: left.x, y: anchorY },
    right: { x: right.x, y: anchorY },
  };
}

/** Upper lip line center (for rabbit teeth). */
export function upperLipCenterLm(
  lm: Landmark[],
  width: number,
  height: number
): { x: number; y: number } | null {
  const upperL = lm[13];
  const upperR = lm[14];
  if (!upperL || !upperR) return null;
  const mid = midpointLm(upperL, upperR, width, height);
  const top = lm[0];
  if (top) {
    const topPx = lmToPx(top, width, height);
    return { x: mid.x, y: mid.y * 0.65 + topPx.y * 0.35 };
  }
  return mid;
}
