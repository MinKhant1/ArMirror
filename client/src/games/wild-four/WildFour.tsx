import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackedPlayer } from './utils/filterRenderer';
import { FACE_STABLE_MS } from './config';
import { useWebcam } from '../../hooks/useWebcam';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useSegmentation } from '../../hooks/useSegmentation';
import { drawWildFourFrame, resetMaskCalibration } from './utils/compositeFrame';
import { useAnimalAssets } from './hooks/useAnimalAssets';
import { usePlayerTracking } from './hooks/usePlayerTracking';
import { useAnimalFilter } from './hooks/useAnimalFilter';
import { useRoulette } from './hooks/useRoulette';
import { useGameFlow } from './hooks/useGameFlow';
import { useWildFourStore } from './store/wildFourStore';
import { ForestBackground, type ForestHandle } from './components/ForestBackground';
import { GameCanvas } from './components/GameCanvas';
import { LoadingScreen } from './components/LoadingScreen';
import { AttractScreen } from './components/AttractScreen';
import { RouletteOverlay } from './components/RouletteOverlay';
import { PlayerBadges } from './components/PlayerBadges';
import { GroupMoment } from './components/GroupMoment';
import { CaptureScreen } from './components/CaptureScreen';
import { QrScreen } from './components/QrScreen';
import { CAPTURE_COUNTDOWN_SEC, MAX_PLAYERS, type AnimalId } from './config';
import { captureGameScreen, generateQrDataUrl } from './utils/photoCapture';
import './wild-four.css';

export const WILD_FOUR_PATH = '/wild-four';

export default function WildFour() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const forestRef = useRef<ForestHandle>(null);
  const segRef = useRef<HTMLCanvasElement>(null);
  const filterRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastDetectRef = useRef(0);
  const groupStartRef = useRef(0);
  const rouletteActiveRef = useRef(false);
  const faceStableSinceRef = useRef<number | null>(null);
  const trackedRef = useRef<TrackedPlayer[]>([]);
  const [uiFrame, setUiFrame] = useState(0);

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
  const mpReady = assets.ready && camReady;
  const { detect, ready: faceReady, error: faceError } = useMediaPipe(mpReady);
  const { segment, ready: segReady } = useSegmentation(mpReady);
  const { processFrame } = usePlayerTracking(width, height);
  const { render: renderFilters } = useAnimalFilter();
  const roulette = useRoulette();
  const { tick: tickFlow } = useGameFlow(assets.ready);

  const gameState = useWildFourStore((s) => s.gameState);
  const players = useWildFourStore((s) => s.players);
  const availableAnimals = useWildFourStore((s) => s.availableAnimals);
  const captureCountdown = useWildFourStore((s) => s.captureCountdown);
  const artworkUrl = useWildFourStore((s) => s.artworkUrl);
  const qrDataUrl = useWildFourStore((s) => s.qrDataUrl);
  const qrShownAt = useWildFourStore((s) => s.qrShownAt);

  const assigned = players.map((p) => p.animal).filter(Boolean) as AnimalId[];
  const fullBloom = assigned.length === MAX_PLAYERS;

  const onRouletteComplete = useCallback((animal: AnimalId, slot: number) => {
    rouletteActiveRef.current = false;
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
      roulette.start(slot, pool, (animal) => onRouletteComplete(animal, slot));
    },
    [roulette, onRouletteComplete]
  );

  useEffect(() => {
    resetMaskCalibration();
    useWildFourStore.getState().initAnimalPool();
    useWildFourStore.getState().setGameState('loading');
  }, []);

  useEffect(() => {
    if (!assets.ready) {
      useWildFourStore.getState().setGameState('loading');
      return;
    }
    if (useWildFourStore.getState().gameState === 'loading') {
      useWildFourStore.getState().setGameState('attract');
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
      useWildFourStore.getState().setArtwork(url);
      const qr = await generateQrDataUrl(url);
      useWildFourStore.getState().setQr(qr);
      useWildFourStore.getState().setGameState('qr');
      useWildFourStore.getState().setCaptureCountdown(null);
    })();
  }, [gameState, captureCountdown]);

  useEffect(() => {
    if (gameState === 'group' && !groupStartRef.current) {
      groupStartRef.current = performance.now();
    }
    if (gameState !== 'group') groupStartRef.current = 0;
  }, [gameState]);

  useEffect(() => {
    if (!camReady) return;

    const video = videoRef.current;
    const segCanvas = segRef.current;
    const filterCanvas = filterRef.current;
    const fxCanvas = fxRef.current;
    if (!video || !segCanvas || !filterCanvas || !fxCanvas) return;

    let disposed = false;
    let frame = 0;

    const loop = (timestamp: number) => {
      if (disposed) return;
      rafRef.current = requestAnimationFrame(loop);
      if (video.readyState < 2) return;

      const displayW = segCanvas.clientWidth || width;
      const displayH = segCanvas.clientHeight || height;
      if (segCanvas.width !== displayW || segCanvas.height !== displayH) {
        segCanvas.width = displayW;
        segCanvas.height = displayH;
        filterCanvas.width = displayW;
        filterCanvas.height = displayH;
        fxCanvas.width = displayW;
        fxCanvas.height = displayH;
      }

      frame += 1;
      const runDetect =
        faceReady && (timestamp - lastDetectRef.current > 33 || frame < 2);
      if (runDetect) lastDetectRef.current = timestamp;

      let faceResults: ReturnType<typeof detect> = {};
      if (runDetect) faceResults = detect(video, timestamp);

      const faces = faceResults.face?.faceLandmarks ?? [];
      const blendshapes = faceResults.face?.faceBlendshapes ?? [];
      const matrices = faceResults.face?.facialTransformationMatrixes ?? [];

      const mask = segReady && mpReady ? segment(video, timestamp) : null;

      const { tracked, faceCount, needsRoulette } = processFrame(
        faces,
        blendshapes,
        matrices,
        timestamp
      );
      trackedRef.current = tracked;
      if (frame % 8 === 0) setUiFrame((f) => f + 1);

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

      if (
        ['detecting', 'playing'].includes(store.gameState) &&
        needsRoulette &&
        stableMs >= FACE_STABLE_MS &&
        store.availableAnimals.length > 0 &&
        !rouletteActiveRef.current
      ) {
        const unassigned = store.players.find((p) => !p.animal);
        if (unassigned) startRoulette(unassigned.slot);
      }

      forestRef.current?.draw(timestamp);

      const segCtx = segCanvas.getContext('2d')!;
      const filterCtx = filterCanvas.getContext('2d')!;
      const fxCtx = fxCanvas.getContext('2d')!;
      const w = segCanvas.width;
      const h = segCanvas.height;

      segCtx.clearRect(0, 0, w, h);
      const forestCanvas = forestRef.current?.getCanvas() ?? null;
      drawWildFourFrame(segCtx, video, forestCanvas, mask, w, h);

      filterCtx.clearRect(0, 0, w, h);
      if (['playing', 'group', 'capture'].includes(store.gameState)) {
        renderFilters(
          filterCtx,
          assets.imagesRef.current,
          tracked,
          w,
          h,
          timestamp
        );
      }

      fxCtx.clearRect(0, 0, w, h);
      if (store.gameState === 'group' || fullBloom) {
        tracked.forEach((p) => {
          const g = fxCtx.createRadialGradient(
            p.faceCenterX,
            p.faceCenterY,
            10,
            p.faceCenterX,
            p.faceCenterY,
            p.faceWidth
          );
          const color = useWildFourStore
            .getState()
            .players.find((pl) => pl.slot === p.slot)?.animal;
          if (!color) return;
          g.addColorStop(0, 'rgba(255,255,255,0.2)');
          g.addColorStop(1, 'transparent');
          fxCtx.fillStyle = g;
          fxCtx.beginPath();
          fxCtx.arc(p.faceCenterX, p.faceCenterY, p.faceWidth * 0.9, 0, Math.PI * 2);
          fxCtx.fill();
        });
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    mpReady,
    faceReady,
    camReady,
    segReady,
    width,
    height,
    detect,
    segment,
    processFrame,
    tickFlow,
    startRoulette,
    renderFilters,
    assets.imagesRef,
    fullBloom,
    videoRef,
    assets.ready,
  ]);

  const groupProgress = groupStartRef.current
    ? Math.min(1, (performance.now() - groupStartRef.current) / 4000)
    : 0;

  return (
    <div className="wild-four" ref={wrapperRef}>
      <ForestBackground
        ref={forestRef}
        width={width}
        height={height}
        assigned={assigned}
        fullBloom={fullBloom}
      />
      <GameCanvas
        bindVideo={bindVideo}
        segCanvasRef={segRef}
        filterCanvasRef={filterRef}
        fxCanvasRef={fxRef}
      />

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

      <div className="wild-four__ui">
        {gameState === 'loading' && <LoadingScreen progress={assets.progress} />}
        {gameState === 'attract' && <AttractScreen />}
        {gameState === 'roulette' && (
          <RouletteOverlay
            displayAnimal={roulette.displayAnimal}
            pool={availableAnimals}
            phase={roulette.phase}
            locked={roulette.locked}
          />
        )}
        {['playing', 'group', 'capture'].includes(gameState) && (
          <PlayerBadges tracked={trackedRef.current} key={uiFrame} />
        )}
        <GroupMoment active={gameState === 'group'} progress={groupProgress} />
        {gameState === 'capture' && <CaptureScreen countdown={captureCountdown} />}
        {gameState === 'qr' && (
          <QrScreen
            artworkUrl={artworkUrl}
            qrDataUrl={qrDataUrl}
            qrShownAt={qrShownAt}
            onReset={() => useWildFourStore.getState().resetGame()}
          />
        )}
      </div>
    </div>
  );
}
