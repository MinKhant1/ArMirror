/** Large centered countdown overlay for peace-sign photo capture. */
export function drawCaptureCountdown(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  countdown: number | null,
  prompt = 'Peace sign — hold still…'
) {
  if (countdown == null || countdown < 0) return;
  ctx.save();
  ctx.font = `bold ${Math.min(w, h) * 0.08}px "Cinzel Decorative", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14;
  ctx.fillText(prompt, w / 2, h * 0.08);
  if (countdown > 0) {
    ctx.font = `bold ${Math.min(w, h) * 0.14}px "Cinzel Decorative", serif`;
    ctx.fillText(String(countdown), w / 2, h * 0.18);
  }
  ctx.restore();
}
