export function drawVirtualBackground(ctx, width, height, time) {
  const t = time * 0.001;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#020818');
  sky.addColorStop(0.45, '#0a1a3e');
  sky.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 97 + Math.sin(t + i) * 50) % width + width) % width;
    const sy = ((i * 53 + t * 30) % height);
    ctx.fillStyle = i % 3 === 0 ? '#4fc3f7' : '#fff';
    ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
  }
  ctx.restore();

  drawPerspectiveGrid(ctx, width, height, t);
  drawNeonCity(ctx, width, height, t);
}

function drawPerspectiveGrid(ctx, width, height, t) {
  const horizon = height * 0.42;
  const cx = width / 2;

  ctx.save();
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.25)';
  ctx.lineWidth = 1;

  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 40, horizon);
    ctx.lineTo(cx + i * 180, height);
    ctx.stroke();
  }

  for (let row = 0; row < 12; row++) {
    const y = horizon + ((row + (t * 2) % 1) / 12) * (height - horizon);
  const spread = (y - horizon) / (height - horizon);
    ctx.beginPath();
    ctx.moveTo(cx - width * spread, y);
    ctx.lineTo(cx + width * spread, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNeonCity(ctx, width, height, t) {
  const horizon = height * 0.42;
  ctx.save();

  for (let i = 0; i < 14; i++) {
    const bx = (i / 14) * width + Math.sin(t * 0.5 + i) * 8;
    const bh = 40 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 80;
    const bw = width / 16;

    ctx.fillStyle = `rgba(${20 + i * 8}, ${10 + i * 5}, ${40 + i * 10}, 0.85)`;
    ctx.fillRect(bx, horizon - bh, bw, bh);

    const glow = i % 3 === 0 ? '#4fc3f7' : i % 3 === 1 ? '#e040fb' : '#ffd54f';
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.3;
    for (let w = 0; w < 3; w++) {
      ctx.fillRect(bx + 4, horizon - bh + 10 + w * 18, bw - 8, 6);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
