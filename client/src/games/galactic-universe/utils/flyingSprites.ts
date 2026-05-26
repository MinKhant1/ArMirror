import { FLYING_KEYS } from '../config';

type FlySprite = {
  id: number;
  key: string;
  x: number;
  y: number;
  vx: number;
  size: number;
  angle: number;
  spin: number;
};

const MAX_SPRITES = 8;
const SPAWN_INTERVAL_MS = 2600;
const ROTATING_KEYS = new Set(['9', '10']);

export class FlyingSprites {
  private sprites: FlySprite[] = [];
  private nextId = 0;
  private lastSpawn = -SPAWN_INTERVAL_MS;
  private lastUpdate = 0;
  private seeded = false;

  seed(width: number, height: number) {
    if (this.seeded || width < 2 || height < 2) return;
    this.seeded = true;
    for (let i = 0; i < 4; i += 1) {
      this.spawn(width, height);
      const s = this.sprites[this.sprites.length - 1]!;
      s.x = width * (0.1 + Math.random() * 0.8);
    }
  }

  update(timestamp: number, width: number, height: number) {
    if (width < 2 || height < 2) return;

    this.seed(width, height);

    const dt = this.lastUpdate
      ? Math.min(0.05, (timestamp - this.lastUpdate) / 1000)
      : 1 / 60;
    this.lastUpdate = timestamp;

    if (
      timestamp - this.lastSpawn > SPAWN_INTERVAL_MS &&
      this.sprites.length < MAX_SPRITES
    ) {
      this.spawn(width, height);
      this.lastSpawn = timestamp;
    }

    this.sprites = this.sprites.filter((s) => {
      s.x += s.vx * dt;
      if (s.spin !== 0) s.angle += s.spin * dt;
      const margin = s.size * 1.5;
      if (s.vx > 0) return s.x < width + margin;
      return s.x > -margin;
    });
  }

  private spawn(width: number, height: number) {
    const fromLeft = Math.random() < 0.5;
    const size = width * (0.09 + Math.random() * 0.12);
    const key = FLYING_KEYS[Math.floor(Math.random() * FLYING_KEYS.length)]!;
    const y = height * (0.08 + Math.random() * 0.84);
    const speed = width * (0.05 + Math.random() * 0.06);
    const spins = ROTATING_KEYS.has(key);

    this.sprites.push({
      id: this.nextId++,
      key,
      x: fromLeft ? -size * 0.5 : width + size * 0.5,
      y,
      vx: fromLeft ? speed : -speed,
      size,
      angle: spins ? Math.random() * Math.PI * 2 : 0,
      spin: spins ? (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.35) : 0,
    });
  }

  draw(ctx: CanvasRenderingContext2D, images: Map<string, HTMLImageElement>) {
    for (const s of this.sprites) {
      const img = images.get(s.key);
      if (!img) continue;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) continue;
      const h = s.size * (ih / iw);
      const wobble = Math.sin(s.id * 0.9 + s.y * 0.012) * 8;
      const cx = s.x;
      const cy = s.y + wobble;

      ctx.save();
      ctx.globalAlpha = 0.92;
      if (s.spin !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate(s.angle);
        ctx.drawImage(img, -s.size / 2, -h / 2, s.size, h);
      } else {
        ctx.drawImage(img, cx - s.size / 2, cy - h / 2, s.size, h);
      }
      ctx.restore();
    }
  }
}
