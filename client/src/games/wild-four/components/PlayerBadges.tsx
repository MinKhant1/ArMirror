import { ANIMAL_CONFIG, MAX_PLAYERS } from '../config';
import { useWildFourStore } from '../store/wildFourStore';
import type { TrackedPlayer } from '../utils/filterRenderer';

type Props = { tracked: TrackedPlayer[] };

export function PlayerBadges({ tracked }: Props) {
  const players = useWildFourStore((s) => s.players);

  return (
    <div className="wild-four__badges">
      {Array.from({ length: MAX_PLAYERS }, (_, slot) => {
        const p = players.find((pl) => pl.slot === slot);
        const live = tracked.find((t) => t.slot === slot);
        const animal = p?.animal;
        const cfg = animal ? ANIMAL_CONFIG[animal] : null;
        const smiling = live?.isSmiling;

        return (
          <div
            key={slot}
            className={`wild-four__badge ${smiling ? 'wild-four__badge--smile' : ''} ${!animal ? 'wild-four__badge--empty' : ''}`}
            style={
              cfg
                ? { borderColor: cfg.color, boxShadow: smiling ? `0 0 12px ${cfg.color}` : undefined }
                : undefined
            }
          >
            {cfg ? (
              <>
                <span>{cfg.emoji}</span>
                <span style={{ color: cfg.color }}>{cfg.label}</span>
              </>
            ) : (
              <span>?</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
