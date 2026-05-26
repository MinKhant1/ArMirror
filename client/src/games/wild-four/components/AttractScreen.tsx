import type { CSSProperties } from 'react';
import { EVENT_NAME, FONTS, UI_COLORS, ANIMAL_CONFIG, ANIMALS } from '../config';

export function AttractScreen() {
  return (
    <div className="wild-four__screen wild-four__screen--attract wild-four__attract">
      <h1 className="wild-four__title wild-four__title--lg" style={{ fontFamily: FONTS.display }}>
        {EVENT_NAME}
      </h1>
      <p className="wild-four__subtitle" style={{ fontFamily: FONTS.body }}>
        Step closer to discover your animal
      </p>
      <div className="wild-four__orbit">
        {ANIMALS.map((id, i) => (
          <span
            key={id}
            className="wild-four__orbit-emoji"
            style={
              {
                '--i': i,
                '--color': ANIMAL_CONFIG[id].color,
              } as CSSProperties
            }
          >
            {ANIMAL_CONFIG[id].emoji}
          </span>
        ))}
      </div>
      <p className="wild-four__hint" style={{ color: UI_COLORS.textMuted, fontFamily: FONTS.body }}>
        Up to 4 players
      </p>
    </div>
  );
}
