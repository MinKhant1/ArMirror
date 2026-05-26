export const THEMES = [
  {
    id: 'soul-echo',
    mirrorType: 'soul-echo',
    title: 'SMILE STRIKE',
    subtitle: 'SMILE TO SHOOT · DEFEND WITH YOUR CREW',
    accent: '#00e5ff',
    secondary: '#ff4081',
    gradient: 'linear-gradient(160deg, #020818 0%, #0a1a3e 40%, #1a0a2e 100%)',
    borderGlow: 'rgba(0, 229, 255, 0.55)',
    icons: ['😁', '🔫'],
    previewStyle: {
      background:
        'radial-gradient(circle at 50% 60%, #00e5ff 0%, #e040fb 35%, #020818 75%)',
    },
  },
  {
    id: 'wild-four',
    mirrorType: 'wild-four',
    title: 'WILD FOUR',
    subtitle: 'DISCOVER YOUR ANIMAL · UP TO 4 PLAYERS',
    accent: '#C9956C',
    secondary: '#9C7EC4',
    gradient: 'linear-gradient(160deg, #06080A 0%, #1A3A2A 45%, #0D1F15 100%)',
    borderGlow: 'rgba(201, 149, 108, 0.5)',
    icons: ['🐱', '🦊'],
    previewStyle: {
      background:
        'radial-gradient(circle at 25% 50%, #C9956C 0%, transparent 45%), radial-gradient(circle at 75% 50%, #9C7EC4 0%, #06080A 70%)',
    },
  },
  {
    id: 'shatter-game',
    mirrorType: 'shatter-game',
    title: 'SHATTER GAME',
    subtitle: 'STAY STILL OR BREAK THE MIRROR',
    accent: '#ef5350',
    secondary: '#42a5f5',
    gradient: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)',
    borderGlow: 'rgba(239, 83, 80, 0.55)',
    icons: ['🎮', '💥'],
    previewStyle: {
      background:
        'radial-gradient(circle at 50% 40%, #ef5350 0%, #37474f 40%, #0a0a0a 75%)',
    },
  },
];

export function getThemeById(id) {
  const resolved =
    id === 'mood-universe' || id === 'four-of-a-kind' ? 'wild-four' : id;
  return THEMES.find((theme) => theme.id === resolved) ?? THEMES[0];
}
