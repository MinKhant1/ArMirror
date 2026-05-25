import SmileStrikeMirror from './mirrors/SmileStrikeMirror.jsx';
import FourOfAKindMirror from './mirrors/FourOfAKindMirror.jsx';
import ShatterGameMirror from './mirrors/ShatterGameMirror.jsx';

const MIRROR_MAP = {
  'soul-echo': SmileStrikeMirror,
  'smile-strike': SmileStrikeMirror,
  'four-of-a-kind': FourOfAKindMirror,
  'mood-universe': FourOfAKindMirror,
  'shatter-game': ShatterGameMirror,
};

export default function MirrorRouter({ theme, onCapture }) {
  const Mirror = MIRROR_MAP[theme.mirrorType] ?? SmileStrikeMirror;
  return <Mirror onCapture={onCapture} />;
}
