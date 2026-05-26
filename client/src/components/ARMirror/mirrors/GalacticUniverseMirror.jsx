import { useCallback, useEffect, useRef } from 'react';
import GalacticUniverse from '../../../games/galactic-universe/GalacticUniverse.tsx';
import '../../../games/galactic-universe/galactic-universe.css';

export default function GalacticUniverseMirror({ onCapture }) {
  const captureFnRef = useRef(() => null);

  const capturePhoto = useCallback(() => captureFnRef.current?.() ?? null, []);

  useEffect(() => {
    onCapture?.(capturePhoto);
  }, [onCapture, capturePhoto]);

  return (
    <GalacticUniverse
      onCaptureReady={(fn) => {
        captureFnRef.current = fn;
      }}
    />
  );
}
