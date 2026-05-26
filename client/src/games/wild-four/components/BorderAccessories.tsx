import type { CSSProperties } from 'react';
import { FallingFlowers } from './FallingFlowers';
import './BorderAccessories.css';

const BASE = '/assets/animal-kingdom/accessory';

const PIECES = [
  {
    id: 'top-left',
    src: `${BASE}/top-left-corner.png`,
    alt: '',
    wrapClass: 'wild-four-border-acc__wrap--top-left',
    imgClass: 'wild-four-border-acc__img--top-left',
    flyDelay: '0s',
  },
  {
    id: 'right-top',
    src: `${BASE}/right-top-corner.png`,
    alt: '',
    wrapClass: 'wild-four-border-acc__wrap--right-top',
    imgClass: 'wild-four-border-acc__img--right-top',
    flyDelay: '0.18s',
  },
  {
    id: 'middle-left',
    src: `${BASE}/middle-left-corner.png`,
    alt: '',
    wrapClass: 'wild-four-border-acc__wrap--middle-left',
    imgClass: 'wild-four-border-acc__img--middle-left',
    flyDelay: '0.36s',
  },
  {
    id: 'bottom-right',
    src: `${BASE}/bottom-right-cornor.png`,
    alt: '',
    wrapClass: 'wild-four-border-acc__wrap--bottom-right',
    imgClass: 'wild-four-border-acc__img--bottom-right',
    flyDelay: '0.54s',
  },
] as const;

export function BorderAccessories() {
  return (
    <div className="wild-four-border-acc" aria-hidden="true">
      <FallingFlowers />
      {PIECES.map((piece) => (
        <div
          key={piece.id}
          className={`wild-four-border-acc__wrap ${piece.wrapClass}`}
          style={
            { '--fly-delay': piece.flyDelay } as CSSProperties
          }
        >
          <img className={`wild-four-border-acc__img ${piece.imgClass}`} src={piece.src} alt={piece.alt} />
        </div>
      ))}
    </div>
  );
}
