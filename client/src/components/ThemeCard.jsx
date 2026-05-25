import './ThemeCard.css';

export default function ThemeCard({ theme, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`theme-card ${selected ? 'theme-card--selected' : ''}`}
      onClick={onSelect}
      style={{
        '--accent': theme.accent,
        '--secondary': theme.secondary,
        '--border-glow': theme.borderGlow,
      }}
    >
      <div className="theme-card__frame">
        <div className="theme-card__icons">
          <span>{theme.icons[0]}</span>
          <span>{theme.icons[1]}</span>
        </div>

        <h2 className="theme-card__title">{theme.title}</h2>
        <p className="theme-card__subtitle">{theme.subtitle}</p>

        <div className="theme-card__preview" style={theme.previewStyle}>
          <div className="theme-card__preview-silhouettes">
            {theme.mirrorType === 'soul-echo' && (
              <>
                <span>👥</span>
                <span>😁</span>
                <span>👾</span>
              </>
            )}
            {theme.mirrorType === 'four-of-a-kind' && (
              <>
                <span>🔥</span>
                <span>🌊</span>
                <span>⚡</span>
              </>
            )}
            {theme.mirrorType === 'shatter-game' && (
              <>
                <span>🧍</span>
                <span>🪞</span>
                <span>💥</span>
              </>
            )}
          </div>
          <div className="theme-card__preview-gather" />
        </div>
      </div>

      {selected && <span className="theme-card__check">✓</span>}
    </button>
  );
}
