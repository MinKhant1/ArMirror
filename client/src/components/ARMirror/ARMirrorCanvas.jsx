import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  createMediaPipeTracker,
  getFaceCenter,
} from './mediaPipeTracker.js';
import {
  createThemeOverlay,
  updateOverlayTransform,
  createThemedBackground,
  applySegmentationMask,
} from './themeOverlays.js';
import './ARMirrorCanvas.css';

export default function ARMirrorCanvas({ theme, onCapture }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const trackerRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const capturePhoto = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  useEffect(() => {
    if (onCapture) {
      onCapture(capturePhoto);
    }
  }, [onCapture, capturePhoto]);

  useEffect(() => {
    let disposed = false;
    let renderer;
    let scene;
    let camera;
    let overlayGroup;
    let backgroundCanvas;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        backgroundCanvas = createThemedBackground(theme, width, height);

        trackerRef.current = await createMediaPipeTracker();

        const container = containerRef.current;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(
          -width / 2,
          width / 2,
          height / 2,
          -height / 2,
          0.1,
          1000
        );
        camera.position.z = 10;

        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        const directional = new THREE.DirectionalLight(0xffffff, 1);
        directional.position.set(0, 0, 5);
        scene.add(ambient, directional);

        overlayGroup = createThemeOverlay(theme);
        scene.add(overlayGroup);

        const compositeCanvas = compositeCanvasRef.current;
        compositeCanvas.width = width;
        compositeCanvas.height = height;
        const compositeCtx = compositeCanvas.getContext('2d');

        let lastTimestamp = 0;

        function renderFrame(timestamp) {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(renderFrame);

          if (video.readyState < 2) return;

          const delta = timestamp - lastTimestamp;
          if (delta < 16) return;
          lastTimestamp = timestamp;

          const results = trackerRef.current.detect(video, timestamp);
          const landmarks = results.face?.faceLandmarks?.[0];
          const face = getFaceCenter(landmarks);

          if (face) {
            updateOverlayTransform(overlayGroup, face, width, height);
          }

          applySegmentationMask(
            compositeCtx,
            video,
            results.segmentation?.categoryMask,
            backgroundCanvas,
            width,
            height
          );

          renderer.render(scene, camera);

          compositeCtx.drawImage(renderer.domElement, 0, 0, width, height);
        }

        rafRef.current = requestAnimationFrame(renderFrame);
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to start camera or AR tracking');
        setStatus('error');
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);

      const video = videoRef.current;
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach((t) => t.stop());
      }

      trackerRef.current?.close();

      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
    };
  }, [theme]);

  return (
    <div className="ar-mirror">
      <video ref={videoRef} className="ar-mirror__video" playsInline muted />
      <div ref={containerRef} className="ar-mirror__three" />
      <canvas ref={compositeCanvasRef} className="ar-mirror__composite" />

      {status === 'loading' && (
        <div className="ar-mirror__overlay-msg">
          <div className="ar-mirror__spinner" />
          <p>Loading AI models &amp; camera…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="ar-mirror__overlay-msg ar-mirror__overlay-msg--error">
          <p>{error}</p>
          <p className="ar-mirror__hint">Allow camera access and use HTTPS or localhost.</p>
        </div>
      )}
    </div>
  );
}
