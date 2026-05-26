export const ANIMALS = ['cat', 'dog', 'fox', 'rabbit'] as const;
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
  cat: {
    id: 'cat',
    color: '#C9956C',
    label: 'CAT',
    emoji: '🐱',
    parts: ['ear', 'nose', 'whiskers-left', 'whiskers-right', 'blush'],
    idleAnimation: 'earTwitch',
    smileReaction: 'earsPerk',
    jawOpenReaction: 'sparklesBurst',
  },
  dog: {
    id: 'dog',
    color: '#D4A03A',
    label: 'DOG',
    emoji: '🐶',
    parts: ['ear', 'nose', 'blush', 'eyepatch'],
    conditionalParts: {
      tongue: { showWhen: 'jawOpen', threshold: 0.5 },
    },
    idleAnimation: 'earSwing',
    smileReaction: 'tongueAppear',
    headTiltReaction: 'earPhysicsSwing',
  },
  fox: {
    id: 'fox',
    color: '#E05C2A',
    label: 'FOX',
    emoji: '🦊',
    parts: ['ear', 'nose', 'markings-left', 'markings-right'],
    idleAnimation: 'tailSwish',
    surprisedReaction: 'earsFlatten',
    movementReaction: 'markingsGlow',
  },
  rabbit: {
    id: 'rabbit',
    color: '#9C7EC4',
    label: 'RABBIT',
    emoji: '🐰',
    parts: ['ear', 'nose', 'whiskers-left', 'whiskers-right', 'blush'],
    conditionalParts: {
      teeth: { showWhen: 'jawOpen', threshold: 0.5 },
    },
    idleAnimation: 'noseTwitch',
    smileReaction: 'cheeksPuff',
    jumpReaction: 'earsFlyUp',
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
  'cat/ear': '/assets/animal-kingdom/cat/cat_ear.png',
  'cat/nose': '/assets/animal-kingdom/cat/cat_nose.png',
  'cat/whiskers-left': '/assets/animal-kingdom/cat/cat_whiskers_left.png',
  'cat/whiskers-right': '/assets/animal-kingdom/cat/cat_whiskers_right.png',
  'cat/blush': '/assets/animal-kingdom/cat/cat_blush.png',
  'dog/ear': '/assets/animal-kingdom/dog/dog_ear.png',
  'dog/nose': '/assets/animal-kingdom/dog/dog_nose.png',
  'dog/tongue': '/assets/animal-kingdom/dog/dog_tongue.png',
  'dog/eyepatch': '/assets/animal-kingdom/dog/dog_eyepatch.png',
  'dog/blush': '/assets/animal-kingdom/dog/dog_blush.png',
  'fox/ear': '/assets/animal-kingdom/fox/fox_ear.png',
  'fox/nose': '/assets/animal-kingdom/fox/fox_nose.png',
  'fox/markings-left': '/assets/animal-kingdom/fox/fox_markings_left.png',
  'fox/markings-right': '/assets/animal-kingdom/fox/fox_markings_right.png',
  'rabbit/ear': '/assets/animal-kingdom/rabbit/rabbit_ear.png',
  'rabbit/nose': '/assets/animal-kingdom/rabbit/rabbit_nose.png',
  'rabbit/whiskers-left': '/assets/animal-kingdom/rabbit/rabbit_whiskers_left.png',
  'rabbit/whiskers-right': '/assets/animal-kingdom/rabbit/rabbit_whiskers_right.png',
  'rabbit/blush': '/assets/animal-kingdom/rabbit/rabbit_blush.png',
  'rabbit/teeth': '/assets/animal-kingdom/rabbit/rabbit_teeth.png',
};

export const ASSET_KEYS = Object.keys(ASSET_PATHS);
