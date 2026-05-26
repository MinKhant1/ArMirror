import { useCallback, useEffect, useRef } from 'react';
import type { TrackedPlayer } from './utils/filterRenderer';
import { FACE_STABLE_MS } from './config';
import { useWebcam } from '../../hooks/useWebcam';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import {
  syncMirrorCanvas,
  applySharpCanvasContext,
} from '../../components/ARMirror/shared/mirrorUtils.js';
import { drawWildFourFrame } from './utils/compositeFrame';
import { useAnimalAssets } from './hooks/useAnimalAssets';
import { usePlayerTracking } from './hooks/usePlayerTracking';
import { useAnimalFilter } from './hooks/useAnimalFilter';
import { useRoulette } from './hooks/useRoulette';
import { useGameFlow } from './hooks/useGameFlow';
import { useWildFourStore } from './store/wildFourStore';
import { GameCanvas } from './components/GameCanvas';
import { CAPTURE_COUNTDOWN_SEC, type AnimalId } from './config';
import { LoadingScreen } from './components/LoadingScreen';
import { PlayerBadges } from './components/PlayerBadges';
import { captureGameScreen, generateQrDataUrl } from './utils/photoCapture';
import {
  HeadCharacterAnimator,
  drawCaptureCountdown,
  type VisibleFace,
} from './utils/headCharacterAnimations';
import './wild-four.css';

export const WILD_FOUR_PATH = '/wild-four';

export default function WildFour() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLCanvasElement>(null);
  const filterRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastDetectRef = useRef(0);
  const faceStableSinceRef = useRef<number | null>(null);
  const trackedRef = useRef<TrackedPlayer[]>([]);
  const visibleFacesRef = useRef<VisibleFace[]>([]);
  const headAnimRef = useRef(new HeadCharacterAnimator());
  const rouletteActiveRef = useRef(false);

  const {
    bindVideo,
    videoRef,
    width,
    height,
    ready: camReady,
    error: camError,
    retryCamera,
  } = useWebcam();
  const assets = useAnimalAssets();
  const { detect, ready: faceReady, error: faceError } = useMediaPipe(camReady);
  const { processFrame } = usePlayerTracking();
  const { render: renderFilters } = useAnimalFilter();
  const roulette = useRoulette();
  const { tick: tickFlow } = useGameFlow(assets.ready);

  const gameState = useWildFourStore((s) => s.gameState);
  const captureCountdown = useWildFourStore((s) => s.captureCountdown);
  const players = useWildFourStore((s) => s.players);

  const onRouletteComplete = useCallback((animal: AnimalId, slot: number) => {
    rouletteActiveRef.current = false;
    headAnimRef.current.clearRoulette();
    const store = useWildFourStore.getState();
    store.assignAnimal(slot, animal);
    if (!store.playingStartedAt) store.setPlayingStartedAt(performance.now());
    store.setGameState('playing');
  }, []);

  const startRoulette = useCallback(
    (slot: number) => {
      if (rouletteActiveRef.current) return;
      const pool = useWildFourStore.getState().availableAnimals;
      if (!pool.length) return;

      rouletteActiveRef.current = true;
      useWildFourStore.getState().setGameState('roulette');

      const started = roulette.start(
        slot,
        pool,
        (animal) => onRouletteComplete(animal, slot),
        () => {
          rouletteActiveRef.current = false;
          headAnimRef.current.clearRoulette();
          roulette.clearPreview();
          const s = useWildFourStore.getState();
          if (s.gameState === 'roulette') s.setGameState('detecting');
        }
      );

      if (!started) {
        rouletteActiveRef.current = false;
      }
    },
    [roulette, onRouletteComplete]
  );

  useEffect(() => {
    useWildFourStore.getState().setGameState('loading');
  }, []);

  useEffect(() => {
    if (!assets.ready) return;
    const store = useWildFourStore.getState();
    if (store.gameState === 'loading') {
      store.setGameState('detecting');
    }
  }, [assets.ready]);

  useEffect(() => {
    if (gameState !== 'capture' || captureCountdown != null) return;
    useWildFourStore.getState().setCaptureCountdown(CAPTURE_COUNTDOWN_SEC);
  }, [gameState, captureCountdown]);

  useEffect(() => {
    if (gameState !== 'capture' || captureCountdown == null) return;
    if (captureCountdown <= 0) return;
    const t = setTimeout(() => {
      const next = captureCountdown - 1;
      useWildFourStore.getState().setCaptureCountdown(next > 0 ? next : 0);
    }, 1000);
    return () => clearTimeout(t);
  }, [gameState, captureCountdown]);

  useEffect(() => {
    if (gameState !== 'capture' || captureCountdown !== 0) return;
    if (!wrapperRef.current) return;

    (async () => {
      const url = await captureGameScreen(wrapperRef.current!);
      const store = useWildFourStore.getState();
      store.setArtwork(url);
      await generateQrDataUrl(url);
      store.setQr(null, Date.now());
      store.setCaptureCountdown(null);
      store.setGameState('qr');
    })();
  }, [gameState, captureCountdown]);

  useEffect(() => {
    const segCanvas = segRef.current;
    const filterCanvas = filterRef.current;
    const fxCanvas = fxRef.current;
    if (!segCanvas || !filterCanvas || !fxCanvas) return;

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
        if (filterCanvas.width !== w || filterCanvas.height !== h) {
          filterCanvas.width = w;
          filterCanvas.height = h;
          fxCanvas.width = w;
          fxCanvas.height = h;
        }
      } else {
        const cssW = Math.max(2, segCanvas.clientWidth || width);
        const cssH = Math.max(2, segCanvas.clientHeight || height);
        w = cssW;
        h = cssH;
        if (segCanvas.width !== w || segCanvas.height !== h) {
          segCanvas.width = w;
          segCanvas.height = h;
          filterCanvas.width = w;
          filterCanvas.height = h;
          fxCanvas.width = w;
          fxCanvas.height = h;
        }
      }

      frame += 1;
      const runDetect =
        faceReady && (timestamp - lastDetectRef.current > 33 || frame < 2);
      if (runDetect) lastDetectRef.current = timestamp;

      let faceResults: ReturnType<typeof detect> = {};
      if (runDetect && videoReady) faceResults = detect(video!, timestamp);

      const faces = faceResults.face?.faceLandmarks ?? [];
      const blendshapes = faceResults.face?.faceBlendshapes ?? [];
      const matrices = faceResults.face?.facialTransformationMatrixes ?? [];

      const { tracked, visibleFaces, faceCount, needsRoulette } = processFrame(
        faces,
        blendshapes,
        matrices,
        timestamp,
        w,
        h
      );
      trackedRef.current = tracked;
      visibleFacesRef.current = visibleFaces;

      const store = useWildFourStore.getState();
      tickFlow(timestamp, faceCount, startRoulette);

      if (faceCount > 0) {
        if (!faceStableSinceRef.current) faceStableSinceRef.current = timestamp;
      } else {
        faceStableSinceRef.current = null;
      }

      const stableMs = faceStableSinceRef.current
        ? timestamp - faceStableSinceRef.current
        : 0;

      if (rouletteActiveRef.current && store.gameState !== 'roulette') {
        rouletteActiveRef.current = false;
        roulette.clearPreview();
      }

      if (
        needsRoulette &&
        stableMs >= FACE_STABLE_MS &&
        store.availableAnimals.length > 0 &&
        !rouletteActiveRef.current &&
        ['detecting', 'playing', 'roulette'].includes(store.gameState)
      ) {
        const unassigned = store.players.find((p) => !p.animal);
        if (unassigned) startRoulette(unassigned.slot);
      }

      const segCtx = segCanvas.getContext('2d')!;
      const filterCtx = filterCanvas.getContext('2d')!;
      const fxCtx = fxCanvas.getContext('2d')!;
      applySharpCanvasContext(segCtx);
      applySharpCanvasContext(filterCtx);
      applySharpCanvasContext(fxCtx);

      segCtx.clearRect(0, 0, w, h);

      if (camReady && videoReady && video) {
        drawWildFourFrame(segCtx, video, w, h);
      } else {
        segCtx.fillStyle = '#000';
        segCtx.fillRect(0, 0, w, h);
      }

      filterCtx.clearRect(0, 0, w, h);
      if (
        assets.ready &&
        ['detecting', 'playing', 'group', 'capture', 'roulette'].includes(store.gameState)
      ) {
        // PNG filters only after roulette — not during forehead randomizer.
        if (store.gameState !== 'roulette') {
          renderFilters(
            filterCtx,
            assets.imagesRef.current,
            tracked,
            w,
            h,
            timestamp
          );
        }
      }

      fxCtx.clearRect(0, 0, w, h);
      if (store.gameState === 'roulette' && visibleFaces.length > 0) {
        const rouletteDraw =
          store.rouletteSlot != null
            ? {
                slot: store.rouletteSlot,
                displayAnimal: store.roulettePreview,
                locked: store.rouletteLocked,
              }
            : undefined;
        headAnimRef.current.draw(fxCtx, visibleFaces, w, h, timestamp, rouletteDraw);
      }

      if (store.gameState === 'capture') {
        drawCaptureCountdown(fxCtx, w, h, store.captureCountdown);
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
    tickFlow,
    startRoulette,
    renderFilters,
    assets.imagesRef,
    assets.ready,
    videoRef,
  ]);

  return (
    <div className="wild-four" ref={wrapperRef}>
      <GameCanvas
        bindVideo={bindVideo}
        segCanvasRef={segRef}
        filterCanvasRef={filterRef}
        fxCanvasRef={fxRef}
      />

      <div className="wild-four__ui">
        {gameState === 'loading' && <LoadingScreen progress={assets.progress} />}
        {['detecting', 'playing', 'roulette'].includes(gameState) && <PlayerBadges tracked={[]} />}
        {gameState === 'detecting' && faceReady && assets.ready && players.length > 0 && (
          <p className="wild-four__hint wild-four__hint--detect">Hold still — choosing your animal…</p>
        )}
      </div>

      {(camError || faceError) && (
        <div className="wild-four__error-overlay" role="alert">
          <p>{camError || faceError}</p>
          {camError && (
            <button type="button" className="wild-four__error-retry" onClick={retryCamera}>
              Retry camera
            </button>
          )}
        </div>
      )}
    </div>
  );
}
