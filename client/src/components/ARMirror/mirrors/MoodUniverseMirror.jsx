import { useEffect, useRef, useState, useCallback } from 'react';
import { createMediaPipeTracker, getEmotionFromBlendshapes } from '../mediaPipeTracker.js';
import {
  createOffscreenCanvas,
  drawMirroredVideo,
  drawBackgroundOnly,
  getCategoryMask,
  initCamera,
} from '../shared/mirrorUtils.js';
import {
  createMoodUniverseScene,
  drawMoodLabel,
} from '../shared/moodUniverseScene.js';
import { MirrorShell } from '../shared/MirrorShell.jsx';
import '../ARMirrorCanvas.css';

export default function MoodUniverseMirror({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const trackerRef = useRef(null);
  const sceneRef = useRef(null);
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

    async function init() {
      try {
        const video = videoRef.current;
        const { width, height, stop } = await initCamera(video);
        stopCamera = stop;
        if (disposed) return;

        trackerRef.current = await createMediaPipeTracker({
          face: true,
          pose: false,
          segmentation: true,
          blendshapes: true,
        });

        const scene = createMoodUniverseScene(width, height);
        sceneRef.current = scene;
        bgRef.current?.appendChild(scene.renderer.domElement);

        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        function render(timestamp) {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(render);
          if (video.readyState < 2) return;

          const results = trackerRef.current.detect(video, timestamp);
          const blendshapes = results.face?.faceBlendshapes;
          const emotion = getEmotionFromBlendshapes(blendshapes);
          const mask = getCategoryMask(results.segmentation);

          scene.update(emotion, timestamp);

          ctx.clearRect(0, 0, width, height);

          // 1. Clean live video (full frame — no silhouette cutout)
          drawMirroredVideo(ctx, video, width, height);

          // 2. Reactive universe layered on background areas only
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          drawBackgroundOnly(ctx, scene.renderer.domElement, mask, width, height);
          ctx.restore();

          // 3. Extra bloom on background when expressive
          const intensity = 0.25 + emotion.smile * 0.4 + emotion.surprise * 0.5;
          if (intensity > 0.35) {
            const bloom = createOffscreenCanvas(width, height);
            const bctx = bloom.getContext('2d');
            bctx.drawImage(scene.renderer.domElement, 0, 0);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = intensity;
            drawBackgroundOnly(ctx, bloom, mask, width, height);
            ctx.restore();
          }

          // 4. Emotion tint around the edges (background only)
          if (emotion.smile > 0.3 || emotion.frown > 0.3 || emotion.surprise > 0.3) {
            const tint = createOffscreenCanvas(width, height);
            const tctx = tint.getContext('2d');
            const g = tctx.createRadialGradient(
              width / 2,
              height / 2,
              height * 0.25,
              width / 2,
              height / 2,
              height * 0.75
            );
            if (emotion.smile > emotion.frown && emotion.smile > emotion.surprise * 0.8) {
              g.addColorStop(0, 'rgba(255,213,79,0)');
              g.addColorStop(1, `rgba(255,180,0,${emotion.smile * 0.45})`);
            } else if (emotion.frown > 0.3) {
              g.addColorStop(0, 'rgba(80,0,120,0)');
              g.addColorStop(1, `rgba(40,0,60,${emotion.frown * 0.5})`);
            } else {
              g.addColorStop(0, 'rgba(180,80,255,0)');
              g.addColorStop(1, `rgba(120,40,255,${emotion.surprise * 0.5})`);
            }
            tctx.fillStyle = g;
            tctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            drawBackgroundOnly(ctx, tint, mask, width, height);
            ctx.restore();
          }

          drawMoodLabel(ctx, emotion, width);
        }

        rafRef.current = requestAnimationFrame(render);
        setStatus('ready');
      } catch (err) {
        setError(err.message || 'Failed to start Mood Universe');
        setStatus('error');
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      stopCamera();
      trackerRef.current?.close();
      sceneRef.current?.dispose();
      sceneRef.current?.renderer.domElement?.remove();
    };
  }, []);

  return (
    <MirrorShell
      videoRef={videoRef}
      canvasRef={canvasRef}
      bgRef={bgRef}
      status={status}
      error={error}
      hint="Smile for sunbursts · frown for storms · surprise to explode the galaxy."
    />
  );
}
