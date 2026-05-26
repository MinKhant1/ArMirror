import { useEffect, useRef, useState, useCallback } from 'react';
import { createMediaPipeTracker } from '../mediaPipeTracker.js';
import {
  applySharpCanvasContext,
  getCategoryMask,
  initCamera,
  syncMirrorCanvas,
} from '../shared/mirrorUtils.js';
import { drawVirtualBackground } from '../shared/virtualBackground.js';
import { drawMultiPersonScene } from '../shared/multiPersonComposite.js';
import {
  useSmileStrikeStore,
  buildLasersFromFaces,
  processLaserHits,
  drawRunners,
  drawExplosions,
  drawEyeLasers,
  drawSmileStrikeHUD,
} from '../shared/smileStrikeGame.js';
import { MirrorShell } from '../shared/MirrorShell.jsx';
import '../ARMirrorCanvas.css';

const MAX_FACES = 4;
const MAX_POSES = 4;

export default function SmileStrikeMirror({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackerRef = useRef(null);
  const rafRef = useRef(null);
  const lastFrameRef = useRef(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const capturePhoto = useCallback(() => canvasRef.current?.toDataURL('image/png') ?? null, []);

  useEffect(() => {
    onCapture?.(capturePhoto);
  }, [onCapture, capturePhoto]);

  useEffect(() => {
    useSmileStrikeStore.getState().reset();
  }, []);

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
          pose: true,
          segmentation: true,
          blendshapes: true,
          faceTransform: true,
          numFaces: MAX_FACES,
          numPoses: MAX_POSES,
        });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        applySharpCanvasContext(ctx);

        function render(timestamp) {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(render);
          if (video.readyState < 2) return;

          const { width: w, height: h } = syncMirrorCanvas(canvas, video);

          const dt = lastFrameRef.current ? timestamp - lastFrameRef.current : 16;
          lastFrameRef.current = timestamp;

          const results = trackerRef.current.detect(video, timestamp);
          const faces = results.face?.faceLandmarks ?? [];
          const blendshapes = results.face?.faceBlendshapes ?? [];
          const poses = results.pose?.landmarks ?? [];
          const mask = getCategoryMask(results.segmentation);

          const store = useSmileStrikeStore.getState();
          store.tick(dt, timestamp);

          const state = useSmileStrikeStore.getState();

          drawVirtualBackground(ctx, w, h, timestamp);
          drawRunners(ctx, state.runners, w, h, timestamp);
          drawMultiPersonScene(ctx, video, faces, poses, mask, w, h);

          const transformMatrices = results.face?.facialTransformationMatrixes ?? [];
          const lasers = buildLasersFromFaces(
            faces,
            blendshapes,
            w,
            h,
            transformMatrices
          );
          processLaserHits(lasers, w, h);
          drawEyeLasers(ctx, lasers, timestamp);
          drawExplosions(ctx, state.explosions, timestamp);

          drawSmileStrikeHUD(
            ctx,
            {
              score: state.score,
              lives: state.lives,
              gameState: state.gameState,
              faceCount: faces.length,
            },
            w,
            h
          );
        }

        rafRef.current = requestAnimationFrame(render);
        setStatus('ready');
      } catch (err) {
        setError(err.message || 'Failed to start Smile Strike');
        setStatus('error');
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
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
      hint="Smile — laser shoots straight out from the center of your face!"
    />
  );
}

export { useSmileStrikeStore };
