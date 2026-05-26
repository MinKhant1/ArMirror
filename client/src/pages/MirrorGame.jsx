import { useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getThemeById } from '../themes/themes.js';
import MirrorRouter from '../components/ARMirror/MirrorRouter.jsx';
import { useShatterStore } from '../components/ARMirror/mirrors/ShatterGameMirror.jsx';
import { useSmileStrikeStore } from '../components/ARMirror/mirrors/SmileStrikeMirror.jsx';
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
  const isSmileStrike = theme.mirrorType === 'soul-echo';
  const isWildFour = theme.mirrorType === 'wild-four';
  const shatterState = useShatterStore((s) => s.gameState);
  const smileState = useSmileStrikeStore((s) => s.gameState);
  const resetShatter = useShatterStore((s) => s.reset);
  const resetSmile = useSmileStrikeStore((s) => s.reset);

  const gameOver =
    (isShatter && shatterState === 'shattered') || (isSmileStrike && smileState === 'over');

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
    if (isSmileStrike) resetSmile();
    setMirrorKey((k) => k + 1);
  };

  return (
    <div
      className={`mirror-game mirror-game--${theme.mirrorType}`}
      style={{ '--accent': theme.accent, '--secondary': theme.secondary }}
    >
      <div className="mirror-game__bg" aria-hidden="true" />

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

      {!isWildFour && (
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
                  : isSmileStrike || isShatter
                    ? 'Capture Moment'
                    : 'Take Photo'}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
