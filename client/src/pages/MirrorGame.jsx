import { useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getThemeById } from '../themes/themes.js';
import MirrorRouter from '../components/ARMirror/MirrorRouter.jsx';
import { BorderAccessories } from '../games/wild-four/components/BorderAccessories';
import { useShatterStore } from '../components/ARMirror/mirrors/ShatterGameMirror.jsx';
import './MirrorGame.css';

export default function MirrorGame() {
  const { themeId } = useParams();
  const navigate = useNavigate();
  const theme = getThemeById(themeId);
  const captureRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mirrorKey, setMirrorKey] = useState(0);

  const isShatter = theme.mirrorType === 'shatter-game';
  const isGalactic = theme.mirrorType === 'galactic-universe';
  const isWildFour = theme.mirrorType === 'wild-four';
  const shatterState = useShatterStore((s) => s.gameState);
  const resetShatter = useShatterStore((s) => s.reset);

  const gameOver = isShatter && shatterState === 'shattered';

  const handleCaptureRef = useCallback((captureFn) => {
    captureRef.current = captureFn;
  }, []);

  const handleTakePhoto = async () => {
    const dataUrl = captureRef.current?.();
    if (!dataUrl) return;

    setSaving(true);
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.id, imageData: dataUrl }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      const link = document.createElement('a');
      link.download = `${theme.id}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    if (isShatter) resetShatter();
    setMirrorKey((k) => k + 1);
  };

  return (
    <div
      className={`mirror-game mirror-game--${theme.mirrorType}`}
      style={{ '--accent': theme.accent, '--secondary': theme.secondary }}
    >
      <div className="mirror-game__bg" aria-hidden="true" />

      {isWildFour && <BorderAccessories />}

      <header className="mirror-game__header">
        <button type="button" className="mirror-game__back" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div className="mirror-game__title-block">
          <span className="mirror-game__theme-label">{theme.title}</span>
          <span className="mirror-game__theme-sub">{theme.subtitle}</span>
        </div>
      </header>

      <main className="mirror-game__main">
        <MirrorRouter key={mirrorKey} theme={theme} onCapture={handleCaptureRef} />
      </main>

      {!isWildFour && !isGalactic && (
        <footer className="mirror-game__footer">
          {gameOver ? (
            <button type="button" className="mirror-game__capture" onClick={handleRestart}>
              Restart Game
            </button>
          ) : (
            <button
              type="button"
              className="mirror-game__capture"
              onClick={handleTakePhoto}
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : saved
                  ? 'Photo Saved!'
                  : isGalactic || isShatter
                    ? 'Capture Moment'
                    : 'Take Photo'}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
