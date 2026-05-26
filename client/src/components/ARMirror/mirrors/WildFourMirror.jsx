import { useCallback, useEffect } from 'react';
import WildFour from '../../../games/wild-four/WildFour.tsx';
import { useWildFourStore } from '../../../games/wild-four/store/wildFourStore';
import '../../../games/wild-four/wild-four.css';
import './WildFourMirror.css'; // mirror shell layout overrides

export default function WildFourMirror({ onCapture }) {
  const capturePhoto = useCallback(
    () => useWildFourStore.getState().artworkUrl ?? null,
    []
  );

  useEffect(() => {
    onCapture?.(capturePhoto);
  }, [onCapture, capturePhoto]);

  return <WildFour />;
}
