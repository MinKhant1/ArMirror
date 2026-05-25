import { useEffect, useRef, useState, useCallback } from 'react';
import { createMediaPipeTracker, computePoseVelocities } from '../mediaPipeTracker.js';
import {
  createOffscreenCanvas,
  drawMirroredVideo,
  initCamera,
} from '../shared/mirrorUtils.js';
import {
  CrackSystem,
  applyGlitchDistortion,
  drawMercuryHeal,
  drawShatterHUD,
  useShatterStore,
} from '../shared/shatterEffects.js';
import { MirrorShell } from '../shared/MirrorShell.jsx';
import '../ARMirrorCanvas.css';

const VELOCITY_THRESHOLD = 1.2;
const STILL_THRESHOLD = 0.15;
const STILL_HEAL_MS = 800;
const SPAWN_COOLDOWN_MS = 120;

export default function ShatterGameMirror({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackerRef = useRef(null);
  const crackSystemRef = useRef(new CrackSystem());
  const prevPoseRef = useRef(null);
  const prevTimeRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const capturePhoto = useCallback(() => canvasRef.current?.toDataURL('image/png') ?? null, []);

  useEffect(() => {
    onCapture?.(capturePhoto);
  }, [onCapture, capturePhoto]);

  useEffect(() => {
    let disposed = false;
    let stopCamera = () => {};
    let scoreInterval;

    async function init() {
      try {
        useShatterStore.getState().reset();
        crackSystemRef.current.clear();

        const video = videoRef.current;
        const { width, height, stop } = await initCamera(video);
        stopCamera = stop;
        if (disposed) return;

        trackerRef.current = await createMediaPipeTracker({
          pose: true,
          face: false,
          segmentation: false,
        });

        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        scoreInterval = setInterval(() => {
          if (useShatterStore.getState().gameState === 'playing') {
            useShatterStore.getState().tickScore();
          }
        }, 100);

        function render(timestamp) {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(render);
          if (video.readyState < 2) return;

          const dt = prevTimeRef.current ? timestamp - prevTimeRef.current : 16;
          prevTimeRef.current = timestamp;

          const state = useShatterStore.getState();
          const results = trackerRef.current.detect(video, timestamp);
          const pose = results.pose?.landmarks?.[0] ?? null;

          const velocity = computePoseVelocities(pose, prevPoseRef.current, dt / 1000);
          prevPoseRef.current = pose;

          if (state.gameState === 'playing') {
            state.updateStillness(velocity.avgVelocity < STILL_THRESHOLD, dt);

            const stillness = useShatterStore.getState().stillnessTime;
            if (velocity.avgVelocity < STILL_THRESHOLD && stillness > STILL_HEAL_MS) {
              if (state.crackCount > 0 && Math.random() < 0.06) {
                state.healCracks(1);
                crackSystemRef.current.healAll(16);
              }
            }

            if (timestamp - lastSpawnRef.current > SPAWN_COOLDOWN_MS) {
              for (const hot of velocity.hotspots) {
                if (hot.velocity > VELOCITY_THRESHOLD) {
                  const px = (1 - hot.x) * width;
                  const py = hot.y * height;
                  crackSystemRef.current.spawn(px, py, hot.velocity / 3);
                  state.addCrack();
                  lastSpawnRef.current = timestamp;
                  break;
                }
              }
            }
          }

          crackSystemRef.current.update(dt);

          const base = createOffscreenCanvas(width, height);
          const bctx = base.getContext('2d');
          bctx.fillStyle = '#0a0a12';
          bctx.fillRect(0, 0, width, height);
          drawMirroredVideo(bctx, video, width, height);

          const current = useShatterStore.getState();
          applyGlitchDistortion(ctx, base, width, height, current.distortion);
          crackSystemRef.current.draw(ctx, width, height);

          if (velocity.avgVelocity < STILL_THRESHOLD && current.stillnessTime > STILL_HEAL_MS) {
            drawMercuryHeal(ctx, width, height, Math.min(1, current.stillnessTime / 2000));
          }

          if (current.gameState === 'shattered') {
            crackSystemRef.current.drawVoronoiShatter(ctx, width, height, 1);
          }

          drawShatterHUD(
            ctx,
            {
              score: current.score,
              crackCount: current.crackCount,
              gameState: current.gameState,
              distortion: current.distortion,
            },
            width
          );
        }

        rafRef.current = requestAnimationFrame(render);
        setStatus('ready');
      } catch (err) {
        setError(err.message || 'Failed to start Shatter Game');
        setStatus('error');
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      clearInterval(scoreInterval);
      stopCamera();
      trackerRef.current?.close();
    };
  }, []);

  return (
    <MirrorShell
      videoRef={videoRef}
      canvasRef={canvasRef}
      status={status}
      error={error}
      hint="Move fast to crack the mirror. Hold still to heal. Survive as long as you can."
    />
  );
}

export { useShatterStore };
