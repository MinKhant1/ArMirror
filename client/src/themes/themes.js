import galaticImg from '../components/site/galatic.png';
import animalPartyImg from '../components/site/animal-party.png';
import powerRangerImg from '../components/site/power-ranger.png';

export const THEMES = [
  {
    id: 'soul-echo',
    mirrorType: 'soul-echo',
    title: 'SMILE STRIKE',
    subtitle: 'SMILE TO SHOOT · DEFEND WITH YOUR CREW',
    accent: '#00e5ff',
    secondary: '#ff4081',
    borderGlow: 'rgba(0, 229, 255, 0.55)',
    cardImage: galaticImg,
  },
  {
    id: 'wild-four',
    mirrorType: 'wild-four',
    title: 'WILD FOUR',
    subtitle: 'DISCOVER YOUR ANIMAL · UP TO 4 PLAYERS',
    accent: '#C9956C',
    secondary: '#9C7EC4',
    borderGlow: 'rgba(201, 149, 108, 0.5)',
    cardImage: animalPartyImg,
  },
  {
    id: 'shatter-game',
    mirrorType: 'shatter-game',
    title: 'SHATTER GAME',
    subtitle: 'STAY STILL OR BREAK THE MIRROR',
    accent: '#ef5350',
    secondary: '#42a5f5',
    borderGlow: 'rgba(239, 83, 80, 0.55)',
    cardImage: powerRangerImg,
  },
];

export function getThemeById(id) {
  const resolved =
    id === 'mood-universe' || id === 'four-of-a-kind' ? 'wild-four' : id;
  return THEMES.find((theme) => theme.id === resolved) ?? THEMES[0];
}
