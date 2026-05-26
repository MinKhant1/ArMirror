import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { THEMES } from '../themes/themes.js';
import ThemeCard from '../components/ThemeCard.jsx';
import backgroundImg from '../components/site/background.png';
import './ThemeSelection.css';

export default function ThemeSelection() {
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();

  const handleStart = () => {
    if (selectedId) {
      navigate(`/mirror/${selectedId}`);
    }
  };

  return (
    <div className="theme-selection">
      <div
        className="theme-selection__bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />

      <header className="theme-selection__header">
        <div className="theme-selection__logo">
          <img
            src="/grand-royal-logo.png"
            alt="Signature — Shal Lit Moments"
            className="theme-selection__logo-img"
            width={640}
            height={400}
          />
        </div>
      </header>

      <main className="theme-selection__main">
        <div className="theme-selection__cards">
          {THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={selectedId === theme.id}
              onSelect={() => setSelectedId(theme.id)}
            />
          ))}
        </div>
      </main>

      <footer className="theme-selection__footer">
        <button
          type="button"
          className={`theme-selection__cta ${selectedId ? 'theme-selection__cta--active' : ''}`}
          onClick={handleStart}
          disabled={!selectedId}
        >
          {selectedId
            ? 'Enter the Mirror'
            : 'Select an AI mirror to begin'}
        </button>
      </footer>
    </div>
  );
}
