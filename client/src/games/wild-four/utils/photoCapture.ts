import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import {
  ARTWORK_HEIGHT,
  ARTWORK_WIDTH,
  BRAND_WATERMARK,
  EVENT_NAME,
  FONTS,
  ANIMAL_CONFIG,
  type AnimalId,
} from '../config';

export async function captureGameScreen(wrapper: HTMLElement): Promise<string> {
  const canvas = await html2canvas(wrapper, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#06080A',
    scale: Math.min(2, ARTWORK_WIDTH / wrapper.clientWidth),
  });

  const out = document.createElement('canvas');
  out.width = ARTWORK_WIDTH;
  out.height = ARTWORK_HEIGHT;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, ARTWORK_WIDTH, ARTWORK_HEIGHT);

  const grad = ctx.createLinearGradient(0, 0, ARTWORK_WIDTH, ARTWORK_HEIGHT);
  const animals: AnimalId[] = ['cat', 'dog', 'fox', 'rabbit'];
  animals.forEach((a, i) => grad.addColorStop(i / 3, ANIMAL_CONFIG[a].color));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, ARTWORK_WIDTH - 8, ARTWORK_HEIGHT - 8);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F5F0E8';
  ctx.font = `700 42px ${FONTS.display}`;
  ctx.letterSpacing = '0.2em';
  ctx.fillText(EVENT_NAME, ARTWORK_WIDTH / 2, 72);

  ctx.textAlign = 'left';
  ctx.font = `300 18px ${FONTS.body}`;
  ctx.fillStyle = '#8A8A9A';
  ctx.fillText(new Date().toLocaleDateString(), 32, ARTWORK_HEIGHT - 32);

  ctx.textAlign = 'right';
  ctx.fillText(BRAND_WATERMARK, ARTWORK_WIDTH - 32, ARTWORK_HEIGHT - 32);

  return out.toDataURL('image/png');
}

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 200,
    margin: 2,
    color: { dark: '#F5F0E8', light: '#06080A' },
  });
}
