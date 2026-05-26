export function captureGalacticFrame(
  seg: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  fly: HTMLCanvasElement,
  fx: HTMLCanvasElement
): string | null {
  const w = seg.width;
  const h = seg.height;
  if (w < 2 || h < 2) return null;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(seg, 0, 0);
  ctx.drawImage(mask, 0, 0);
  ctx.drawImage(fly, 0, 0);
  ctx.drawImage(fx, 0, 0);
  return out.toDataURL('image/png');
}
