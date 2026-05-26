import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ANIMAL_CONFIG, UI_COLORS, type AnimalId } from '../config';

type Props = {
  width: number;
  height: number;
  assigned: AnimalId[];
  fullBloom: boolean;
};

export type ForestHandle = {
  draw: (time: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
  resize: (w: number, h: number) => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: 'leaf' | 'firefly' | 'pollen';
  rot: number;
};

export const ForestBackground = forwardRef<ForestHandle, Props>(function ForestBackground(
  { width, height, assigned, fullBloom },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dirtyRef = useRef(true);

  const initParticles = (w: number, h: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      particles.push({
        type: 'leaf',
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.3 + Math.random() * 0.5,
        life: 1,
        rot: Math.random() * Math.PI,
      });
    }
    for (let i = 0; i < 20; i++) {
      particles.push({
        type: 'firefly',
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        life: Math.random(),
        rot: 0,
      });
    }
    for (let i = 0; i < 30; i++) {
      particles.push({
        type: 'pollen',
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -0.1 - Math.random() * 0.2,
        life: 0.4,
        rot: 0,
      });
    }
    particlesRef.current = particles;
    dirtyRef.current = true;
  };

  const draw = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width < 2 || height < 2) return;

    const fireflyCount = assigned.includes('cat') || fullBloom ? 40 : 20;
    const leafBoost = assigned.includes('dog') || fullBloom ? 1.6 : 1;
    const pollenBoost = assigned.includes('rabbit') || fullBloom ? 1.8 : 1;

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, UI_COLORS.forestDark);
    sky.addColorStop(0.5, UI_COLORS.forestGreen);
    sky.addColorStop(1, '#0a1810');
    if (assigned.includes('rabbit') || fullBloom) {
      sky.addColorStop(0.3, 'rgba(156, 126, 196, 0.15)');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = `rgba(5, 20, 12, ${0.35 + layer * 0.15})`;
      const h = height * (0.35 + layer * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 40) {
        const y = height - h + Math.sin(x * 0.01 + layer + time * 0.0002) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }

    if (assigned.includes('fox') || fullBloom) {
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#E05C2A';
        ctx.beginPath();
        ctx.moveTo(width * (0.2 + i * 0.2), 0);
        ctx.lineTo(width * (0.3 + i * 0.2), height * 0.7);
        ctx.lineTo(width * (0.1 + i * 0.2), height * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const particles = particlesRef.current;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'leaf') {
        p.rot += 0.02;
        if (p.y > height) p.y = -10;
        if (Math.random() < 0.01 * leafBoost) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = Math.random() > 0.5 ? '#8B5E3C' : '#C8A45A';
          ctx.fillRect(-4, -2, 8, 4);
          ctx.restore();
        }
      } else if (p.type === 'firefly' && particles.indexOf(p) < fireflyCount) {
        p.life = 0.3 + Math.sin(time * 0.005 + p.x) * 0.3 + 0.4;
        ctx.fillStyle = `rgba(255, 229, 102, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      } else if (p.type === 'pollen' && Math.random() < 0.3 * pollenBoost) {
        ctx.fillStyle = 'rgba(245, 230, 163, 0.4)';
        ctx.fillRect(p.x, p.y, 2, 2);
        if (p.y < 0) p.y = height;
      }
    }

    ctx.fillStyle = 'rgba(10, 30, 18, 0.85)';
    ctx.fillRect(0, height - 40, width, 40);

    if (fullBloom) {
      assigned.forEach((a, i) => {
        const c = ANIMAL_CONFIG[a].color;
        ctx.strokeStyle = c + '55';
        ctx.lineWidth = 4;
        if (i === 0) ctx.strokeRect(0, 0, width, height);
      });
    }

    dirtyRef.current = false;
  };

  const resize = (w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas || w < 2 || h < 2) return;
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    initParticles(w, h);
  };

  useImperativeHandle(ref, () => ({
    draw,
    getCanvas: () => canvasRef.current,
    resize,
  }));

  useEffect(() => {
    resize(width, height);
  }, [width, height]);

  return <canvas ref={canvasRef} className="wild-four__layer wild-four__forest" aria-hidden />;
});
