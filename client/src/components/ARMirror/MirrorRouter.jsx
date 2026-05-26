import SmileStrikeMirror from './mirrors/SmileStrikeMirror.jsx';
import WildFourMirror from './mirrors/WildFourMirror.jsx';
import ShatterGameMirror from './mirrors/ShatterGameMirror.jsx';

const MIRROR_MAP = {
  'soul-echo': SmileStrikeMirror,
  'smile-strike': SmileStrikeMirror,
  'wild-four': WildFourMirror,
  'four-of-a-kind': WildFourMirror,
  'mood-universe': WildFourMirror,
  'shatter-game': ShatterGameMirror,
};

export default function MirrorRouter({ theme, onCapture }) {
  const Mirror = MIRROR_MAP[theme.mirrorType] ?? SmileStrikeMirror;
  return <Mirror onCapture={onCapture} />;
}
