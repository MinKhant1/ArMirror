import { useCallback, useEffect, useRef } from 'react';
import { useWebcam } from '../../hooks/useWebcam';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import {
  syncMirrorCanvas,
  applySharpCanvasContext,
  getCategoryMask,
} from '../../components/ARMirror/shared/mirrorUtils.js';
import { useGalacticAssets } from './hooks/useGalacticAssets';
import { usePlayerTracking } from './hooks/usePlayerTracking';
import { GameCanvas } from './components/GameCanvas';
import { FlyingSprites } from './utils/flyingSprites';
import { drawGalacticScene } from './utils/galacticScene';
import { drawAllMasks } from './utils/maskRenderer';
import { FriendshipAnimator } from './utils/friendshipAnimator';
import { captureGalacticFrame } from './utils/captureFrame';
import './galactic-universe.css';

type GalacticUniverseProps = {
  onCaptureReady?: (capture: () => string | null) => void;
};

export default function GalacticUniverse({ onCaptureReady }: GalacticUniverseProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLCanvasElement>(null);
  const flyRef = useRef<HTMLCanvasElement>(null);
  const filterRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastDetectRef = useRef(0);
  const lastMaskRef = useRef<ReturnType<typeof getCategoryMask>>(null);
  const flyingRef = useRef(new FlyingSprites());
  const friendshipRef = useRef(new FriendshipAnimator());

  const {
    bindVideo,
    videoRef,
    width,
    height,
    ready: camReady,
    error: camError,
    retryCamera,
  } = useWebcam();
  const assets = useGalacticAssets();
  const { detect, ready: faceReady, error: faceError } = useMediaPipe(camReady, {
    segmentation: true,
  });
  const { processFrame } = usePlayerTracking();

  const capturePhoto = useCallback(() => {
    const seg = segRef.current;
    const fly = flyRef.current;
    const filter = filterRef.current;
    const fx = fxRef.current;
    if (!seg || !fly || !filter || !fx) return null;
    return captureGalacticFrame(seg, fly, filter, fx);
  }, []);

  useEffect(() => {
    onCaptureReady?.(capturePhoto);
  }, [onCaptureReady, capturePhoto]);

  useEffect(() => {
    const segCanvas = segRef.current;
    const flyCanvas = flyRef.current;
    const filterCanvas = filterRef.current;
    const fxCanvas = fxRef.current;
    if (!segCanvas || !flyCanvas || !filterCanvas || !fxCanvas) return;

    let disposed = false;
    let frame = 0;

    const loop = (timestamp: number) => {
      if (disposed) return;
      rafRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      const videoReady = Boolean(video && video.readyState >= 2);
      let w = width;
      let h = height;

      if (videoReady && video) {
        const synced = syncMirrorCanvas(segCanvas, video);
        w = synced.width;
        h = synced.height;
        for (const c of [flyCanvas, filterCanvas, fxCanvas]) {
          if (c.width !== w || c.height !== h) {
            c.width = w;
            c.height = h;
          }
        }
      } else {
        const cssW = Math.max(2, segCanvas.clientWidth || width);
        const cssH = Math.max(2, segCanvas.clientHeight || height);
        w = cssW;
        h = cssH;
        for (const c of [segCanvas, flyCanvas, filterCanvas, fxCanvas]) {
          if (c.width !== w || c.height !== h) {
            c.width = w;
            c.height = h;
          }
        }
      }

      frame += 1;
      const runDetect =
        faceReady && assets.ready && (timestamp - lastDetectRef.current > 33 || frame < 2);
      if (runDetect) lastDetectRef.current = timestamp;

      let faceResults: ReturnType<typeof detect> = {};
      if (runDetect && videoReady && video) {
        faceResults = detect(video, timestamp);
        const mask = getCategoryMask(faceResults.segmentation);
        if (mask) lastMaskRef.current = mask;
      }

      const faces = faceResults.face?.faceLandmarks ?? [];
      const blendshapes = faceResults.face?.faceBlendshapes ?? [];
      const matrices = faceResults.face?.facialTransformationMatrixes ?? [];
      const personMask = lastMaskRef.current;

      const { tracked } = processFrame(faces, blendshapes, matrices, timestamp, w, h);

      const segCtx = segCanvas.getContext('2d')!;
      const flyCtx = flyCanvas.getContext('2d')!;
      const filterCtx = filterCanvas.getContext('2d')!;
      const fxCtx = fxCanvas.getContext('2d')!;
      applySharpCanvasContext(segCtx);
      applySharpCanvasContext(flyCtx);
      applySharpCanvasContext(filterCtx);
      applySharpCanvasContext(fxCtx);

      if (camReady && videoReady && video) {
        drawGalacticScene(segCtx, video, personMask, w, h);
      } else {
        segCtx.clearRect(0, 0, w, h);
        segCtx.fillStyle = '#0a0018';
        segCtx.fillRect(0, 0, w, h);
      }

      if (assets.ready && tracked.length > 0) {
        drawAllMasks(filterCtx, assets.imagesRef.current, tracked, w, h);
      } else {
        filterCtx.clearRect(0, 0, w, h);
      }

      flyCtx.clearRect(0, 0, w, h);
      if (assets.ready) {
        flyingRef.current.update(timestamp, w, h);
        flyingRef.current.draw(flyCtx, assets.imagesRef.current);
      }

      const friendshipImg = assets.imagesRef.current.get('friendship');
      if (friendshipImg && tracked.length > 0) {
        friendshipRef.current.update(tracked, timestamp);
        friendshipRef.current.draw(fxCtx, friendshipImg, tracked, w, h, timestamp);
      } else {
        fxCtx.clearRect(0, 0, w, h);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    camReady,
    faceReady,
    width,
    height,
    detect,
    processFrame,
    assets.imagesRef,
    assets.ready,
    videoRef,
  ]);

  const loading = !assets.ready || !camReady || !faceReady;

  return (
    <div className="galactic" ref={wrapperRef}>
      <GameCanvas
        bindVideo={bindVideo}
        segCanvasRef={segRef}
        flyCanvasRef={flyRef}
        filterCanvasRef={filterRef}
        fxCanvasRef={fxRef}
      />

      <div className="galactic__ui">
        {loading && (
          <div className="galactic__loading">
            <p>Loading Galactic Universe…</p>
            <div className="galactic__loading-bar">
              <div
                className="galactic__loading-fill"
                style={{ width: `${Math.round(assets.progress * 100)}%` }}
              />
            </div>
          </div>
        )}
        {!loading && (
          <p className="galactic__hint">Smile to summon the Friendship badge on your head</p>
        )}
      </div>

      {(camError || faceError) && (
        <div className="galactic__error-overlay" role="alert">
          <p>{camError || faceError}</p>
          {camError && (
            <button type="button" className="galactic__error-retry" onClick={retryCamera}>
              Retry camera
            </button>
          )}
        </div>
      )}
    </div>
  );
}
