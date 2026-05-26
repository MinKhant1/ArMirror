import './ThemeCard.css';

export default function ThemeCard({ theme, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`theme-card ${selected ? 'theme-card--selected' : ''}`}
      onClick={onSelect}
      style={{
        '--accent': theme.accent,
        '--border-glow': theme.borderGlow,
      }}
    >
      <img
        src={theme.cardImage}
        alt={theme.title}
        className="theme-card__image"
        draggable={false}
      />
      {selected && <span className="theme-card__check">✓</span>}
    </button>
  );
}
