export const ANIMALS = ['dog', 'cow', 'coala'] as const;
export type AnimalId = (typeof ANIMALS)[number];

export type AnimalConfig = {
  id: AnimalId;
  color: string;
  label: string;
  emoji: string;
  parts: string[];
  conditionalParts?: Record<string, { showWhen: 'jawOpen'; threshold?: number }>;
  idleAnimation: string;
  smileReaction?: string;
  jawOpenReaction?: string;
  headTiltReaction?: string;
  surprisedReaction?: string;
  movementReaction?: string;
  jumpReaction?: string;
};

export const ANIMAL_CONFIG: Record<AnimalId, AnimalConfig> = {
  dog: {
    id: 'dog',
    color: '#D4A03A',
    label: 'DOG',
    emoji: '🐶',
    parts: ['ear', 'nose'],
    conditionalParts: {
      tongue: { showWhen: 'jawOpen', threshold: 0.5 },
    },
    idleAnimation: 'earSwing',
    smileReaction: 'tongueAppear',
    headTiltReaction: 'earPhysicsSwing',
  },
  cow: {
    id: 'cow',
    color: '#F4F0E8',
    label: 'COW',
    emoji: '🐮',
    parts: ['ear', 'nose', 'horn-left', 'horn-right'],
    idleAnimation: 'hornBop',
  },
  coala: {
    id: 'coala',
    color: '#8B939C',
    label: 'KOALA',
    emoji: '🐨',
    parts: ['ear-left', 'ear-right', 'nose'],
    idleAnimation: 'earTwitch',
    smileReaction: 'earsPerk',
  },
};

export const SMILE_THRESHOLD = 0.55;
export const JAW_OPEN_THRESHOLD = 0.5;
export const EYE_WIDE_THRESHOLD = 0.7;
export const MAX_PLAYERS = 4;
export const ROULETTE_DURATION_MS = 5000;
export const FACE_STABLE_MS = 1000;
export const FREE_PLAY_DURATION_SEC = 60;
export const GROUP_MOMENT_MS = 4000;
export const QR_RESET_MS = 15000;
export const EVENT_NAME = 'WILD FOUR';
export const BRAND_WATERMARK = 'wildfour';
export const CAPTURE_COUNTDOWN_SEC = 5;
export const ARTWORK_WIDTH = 1920;
export const ARTWORK_HEIGHT = 1080;
export const FACE_RETURN_PX = 200;

export const FONTS = {
  display: '"Cinzel Decorative", serif',
  body: '"Raleway", sans-serif',
};

export const UI_COLORS = {
  background: '#06080A',
  textPrimary: '#F5F0E8',
  textMuted: '#8A8A9A',
  forestGreen: '#1A3A2A',
  forestDark: '#0D1F15',
};

export const ASSET_PATHS: Record<string, string> = {
  // Dog assets were renamed; current files are left/right ear, mouth, and tongue.
  'dog/ear': '/assets/animal-kingdom/dog/left-ear.png',
  'dog/nose': '/assets/animal-kingdom/dog/mouth.png',
  'dog/tongue': '/assets/animal-kingdom/dog/tongue.png',
  'cow/ear': '/assets/animal-kingdom/cow/left-ear.png',
  'cow/nose': '/assets/animal-kingdom/cow/mouth.png',
  'cow/horn-left': '/assets/animal-kingdom/cow/left-horn.png',
  'cow/horn-right': '/assets/animal-kingdom/cow/right-horn.png',
  'coala/ear-left': '/assets/animal-kingdom/coala/left-ear.png',
  'coala/ear-right': '/assets/animal-kingdom/coala/right-ear.png',
  'coala/nose': '/assets/animal-kingdom/coala/nose.png',
};

export const ASSET_KEYS = Object.keys(ASSET_PATHS);
