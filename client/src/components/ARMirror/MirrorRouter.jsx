import GalacticUniverseMirror from './mirrors/GalacticUniverseMirror.jsx';
import WildFourMirror from './mirrors/WildFourMirror.jsx';
import ShatterGameMirror from './mirrors/ShatterGameMirror.jsx';

const MIRROR_MAP = {
  'galactic-universe': GalacticUniverseMirror,
  'soul-echo': GalacticUniverseMirror,
  'smile-strike': GalacticUniverseMirror,
  'wild-four': WildFourMirror,
  'four-of-a-kind': WildFourMirror,
  'mood-universe': WildFourMirror,
  'shatter-game': ShatterGameMirror,
};

export default function MirrorRouter({ theme, onCapture }) {
  const Mirror = MIRROR_MAP[theme.mirrorType] ?? GalacticUniverseMirror;
  return <Mirror onCapture={onCapture} />;
}
