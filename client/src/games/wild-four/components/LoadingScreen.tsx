import { EVENT_NAME, FONTS, UI_COLORS } from '../config';

type Props = { progress: number };

export function LoadingScreen({ progress }: Props) {
  const pct = Math.round(progress * 100);
  const colors = ['#D4A03A', '#F4F0E8'];

  return (
    <div className="wild-four__screen wild-four__loading">
      <h1 className="wild-four__title" style={{ fontFamily: FONTS.display }}>
        {EVENT_NAME}
      </h1>
      <div className="wild-four__progress-track">
        <div
          className="wild-four__progress-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${colors.join(', ')})`,
          }}
        />
      </div>
      <p className="wild-four__subtitle" style={{ fontFamily: FONTS.body, color: UI_COLORS.textMuted }}>
        Loading animals… {pct}%
      </p>
    </div>
  );
}
