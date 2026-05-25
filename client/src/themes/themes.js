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
    id: 'four-of-a-kind',
    mirrorType: 'four-of-a-kind',
    title: 'FOUR OF A KIND',
    subtitle: '4-PERSON AR ART MIRROR · PURE VISUAL MAGIC',
    accent: '#FF4500',
    secondary: '#7B2FBE',
    gradient: 'linear-gradient(160deg, #05050F 0%, #1a0a2e 45%, #0d1b2a 100%)',
    borderGlow: 'rgba(255, 180, 71, 0.45)',
    icons: ['🔥', '⚡'],
    previewStyle: {
      background:
        'radial-gradient(circle at 30% 50%, #FF4500 0%, transparent 40%), radial-gradient(circle at 70% 50%, #7B2FBE 0%, #05050F 70%)',
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
  const resolved = id === 'mood-universe' ? 'four-of-a-kind' : id;
  return THEMES.find((theme) => theme.id === resolved) ?? THEMES[0];
}
