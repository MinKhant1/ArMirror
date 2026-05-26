import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import './FallingFlowers.css';

const BASE = '/assets/animal-kingdom/accessory';
const FLOWER_COUNT = 14;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

type FlowerSpec = {
  id: number;
  src: string;
  style: CSSProperties;
};

function buildFlowerSpecs(): FlowerSpec[] {
  return Array.from({ length: FLOWER_COUNT }, (_, id) => {
    const src = id % 2 === 0 ? `${BASE}/flower1.png` : `${BASE}/flower2.png`;
    const drift = rand(-140, 140);
    const rotStart = rand(-35, 35);
    const rotEnd = rotStart + rand(-55, 55);

    return {
      id,
      src,
      style: {
        '--left': `${rand(2, 98)}%`,
        '--size': `${rand(48, 96)}px`,
        '--delay': `${rand(0, 14)}s`,
        '--duration': `${rand(11, 20)}s`,
        '--drift': `${drift}px`,
        '--drift-mid': `${drift * rand(0.35, 0.65)}px`,
        '--rot-start': `${rotStart}deg`,
        '--rot-mid': `${(rotStart + rotEnd) / 2 + rand(-20, 20)}deg`,
        '--rot-end': `${rotEnd}deg`,
      } as CSSProperties,
    };
  });
}

export function FallingFlowers() {
  const flowers = useMemo(() => buildFlowerSpecs(), []);

  return (
    <div className="wild-four-falling-flowers" aria-hidden="true">
      {flowers.map((f) => (
        <img
          key={f.id}
          className="wild-four-falling-flowers__petal"
          src={f.src}
          alt=""
          draggable={false}
          style={f.style}
        />
      ))}
    </div>
  );
}
