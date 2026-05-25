import { useEffect, useRef, useState, useCallback } from 'react';
import { createMediaPipeTracker } from '../mediaPipeTracker.js';
import { getCategoryMask, initCamera } from '../shared/mirrorUtils.js';
import { createFourOfAKindGame } from '../shared/fourOfAKindGame.js';
import { MirrorShell } from '../shared/MirrorShell.jsx';
import '../ARMirrorCanvas.css';
import './FourOfAKind.css';

const MAX_FACES = 4;
const MAX_POSES = 4;

export default function FourOfAKindMirror({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackerRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const lastFrameRef = useRef(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const capturePhoto = useCallback(
    () => gameRef.current?.getCaptureDataUrl?.() ?? canvasRef.current?.toDataURL('image/png') ?? null,
    []
  );

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
          pose: true,
          segmentation: true,
          blendshapes: true,
          numFaces: MAX_FACES,
          numPoses: MAX_POSES,
        });

        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const game = createFourOfAKindGame(width, height, {
          onArtwork: (dataUrl) => onCapture?.(() => dataUrl),
          uploadArtwork: async (dataUrl) => {
            try {
              const res = await fetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ themeId: 'four-of-a-kind', imageData: dataUrl }),
              });
              if (res.ok) {
                const { id } = await res.json();
                return `${window.location.origin}/api/photos/${id}`;
              }
            } catch {
              /* local fallback */
            }
            return dataUrl;
          },
        });
        gameRef.current = game;

        function render(timestamp) {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(render);
          if (video.readyState < 2) return;

          const dt = lastFrameRef.current ? timestamp - lastFrameRef.current : 16;
          lastFrameRef.current = timestamp;

          const results = trackerRef.current.detect(video, timestamp);
          const tracking = {
            faces: results.face?.faceLandmarks ?? [],
            blendshapes: results.face?.faceBlendshapes ?? [],
            poses: results.pose?.landmarks ?? [],
          };
          const mask = getCategoryMask(results.segmentation);

          game.update(tracking, dt, timestamp);
          game.tickCapture(ctx, video, mask, timestamp);
          game.draw(ctx, video, mask, timestamp);
        }

        rafRef.current = requestAnimationFrame(render);
        setStatus('ready');
      } catch (err) {
        setError(err.message || 'Failed to start Four of a Kind');
        setStatus('error');
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      stopCamera();
      trackerRef.current?.close();
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, [onCapture]);

  return (
    <MirrorShell
      videoRef={videoRef}
      canvasRef={canvasRef}
      status={status}
      error={error}
      hint={null}
    />
  );
}
