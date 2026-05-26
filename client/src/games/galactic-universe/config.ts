export const ALIEN_MASKS = ['alien1', 'alien2'] as const;
export type AlienMaskId = (typeof ALIEN_MASKS)[number];

export const SMILE_THRESHOLD = 0.55;
export const CAPTURE_COUNTDOWN_SEC = 5;
export const MAX_PLAYERS = 4;
export const FACE_RETURN_PX = 200;

export const ASSET_BASE = '/assets/galatic-squad';

/** Global multiplier for face mask draw size. */
export const MASK_SIZE_SCALE = 1.3;

export const MASK_PATHS: Record<AlienMaskId, string> = {
  alien1: `${ASSET_BASE}/alien1.png`,
  alien2: `${ASSET_BASE}/alien2.png`,
};

export type MaskEyeLayout = {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  scaleMul?: number;
  lift?: number;
};

/** alien1 — align PNG eye holes to the player's eyes. */
export const MASK_EYE_LAYOUT: Partial<Record<AlienMaskId, MaskEyeLayout>> = {
  alien1: {
    leftEye: { x: 0.36, y: 0.7 },
    rightEye: { x: 0.64, y: 0.7 },
    scaleMul: 1.08,
    lift: 0.05,
  },
};

export type MaskFaceCenterLayout = {
  /** Normalized center of the visor / face opening in the PNG */
  center: { x: number; y: number };
  /** Opening width as fraction of image width — used to scale over the player's face */
  openingWidthFrac: number;
  openingHeightFrac: number;
  /** Upward nudge as fraction of face height */
  liftY?: number;
  /** Per-mask size tweak (1 = default) */
  scaleMul?: number;
};

/** alien2 — helmet centered on face; visor opening covers the whole face. */
export const MASK_FACE_LAYOUT: Partial<Record<AlienMaskId, MaskFaceCenterLayout>> = {
  alien2: {
    center: { x: 0.5, y: 0.44 },
    openingWidthFrac: 0.5,
    openingHeightFrac: 0.48,
    liftY: 0.14,
    scaleMul: 0.76,
  },
};

export function pickRandomMask(): AlienMaskId {
  return ALIEN_MASKS[Math.floor(Math.random() * ALIEN_MASKS.length)]!;
}

export const FRIENDSHIP_PATH = `${ASSET_BASE}/friendship.png`;

export const FLYING_SPRITE_PATHS: Record<string, string> = {
  '5': `${ASSET_BASE}/5.png`,
  '7': `${ASSET_BASE}/7.png`,
  '8': `${ASSET_BASE}/8.png`,
  '9': `${ASSET_BASE}/9.png`,
  '10': `${ASSET_BASE}/10.png`,
};

export const FLYING_KEYS = Object.keys(FLYING_SPRITE_PATHS);
export const ASSET_KEYS = [
  ...Object.keys(MASK_PATHS),
  'friendship',
  ...FLYING_KEYS,
] as const;

export const ASSET_PATHS: Record<string, string> = {
  ...MASK_PATHS,
  friendship: FRIENDSHIP_PATH,
  ...FLYING_SPRITE_PATHS,
};
