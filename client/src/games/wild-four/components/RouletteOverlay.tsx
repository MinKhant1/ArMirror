import { ANIMAL_CONFIG, type AnimalId } from '../config';
import type { RoulettePhase } from '../hooks/useRoulette';

type Props = {
  displayAnimal: AnimalId | null;
  pool: AnimalId[];
  phase: RoulettePhase;
  locked: boolean;
};

export function RouletteOverlay({ displayAnimal, pool, phase, locked }: Props) {
  return (
    <div className={`wild-four__roulette ${locked ? 'wild-four__roulette--locked' : ''}`}>
      <div className="wild-four__roulette-cards">
        {pool.map((id) => {
          const cfg = ANIMAL_CONFIG[id];
          const active = displayAnimal === id;
          return (
            <div
              key={id}
              className={`wild-four__roulette-card ${active ? 'wild-four__roulette-card--active' : ''}`}
              style={{
                background: `${cfg.color}26`,
                borderColor: `${cfg.color}99`,
                boxShadow: active ? `0 0 24px ${cfg.color}88` : 'none',
              }}
            >
              <span className="wild-four__roulette-emoji">{cfg.emoji}</span>
              <span className="wild-four__roulette-label" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
      {phase >= 3 && displayAnimal && (
        <p
          className="wild-four__roulette-lock"
          style={{ color: ANIMAL_CONFIG[displayAnimal].color }}
        >
          {ANIMAL_CONFIG[displayAnimal].label}!
        </p>
      )}
    </div>
  );
}
