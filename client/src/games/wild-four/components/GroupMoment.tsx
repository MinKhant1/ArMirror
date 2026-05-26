import type { CSSProperties } from 'react';
import { ANIMALS, ANIMAL_CONFIG, EVENT_NAME, FONTS } from '../config';

type Props = { active: boolean; progress: number };

export function GroupMoment({ active, progress }: Props) {
  if (!active) return null;

  const titleOpacity = Math.min(1, Math.max(0, (progress - 0.2) / 0.3));
  const subtitleOpacity = Math.min(1, Math.max(0, (progress - 0.65) / 0.2));

  return (
    <div className="wild-four__group">
      <div className="wild-four__group-overlay" style={{ opacity: Math.min(0.85, progress * 2) }} />
      <h2
        className="wild-four__group-title"
        style={{ fontFamily: FONTS.display, opacity: titleOpacity }}
      >
        THE {EVENT_NAME}
      </h2>
      <div className="wild-four__group-parade">
        {ANIMALS.map((id, i) => (
          <span
            key={id}
            className="wild-four__group-runner"
            style={
              {
                '--delay': `${i * 0.3}s`,
                '--color': ANIMAL_CONFIG[id].color,
              } as CSSProperties
            }
          >
            {ANIMAL_CONFIG[id].emoji}
          </span>
        ))}
      </div>
      <p
        className="wild-four__group-sub"
        style={{ fontFamily: FONTS.body, opacity: subtitleOpacity }}
      >
        Enjoy your wild side!
      </p>
    </div>
  );
}
