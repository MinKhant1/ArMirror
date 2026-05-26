import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initCamera,
  isRecoverableCameraError,
} from '../components/ARMirror/shared/mirrorUtils.js';

const MAX_CAMERA_RETRIES = 10;
const RETRY_MS = 250;

export function useWebcam() {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const [size, setSize] = useState({ width: 1280, height: 720 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearRetryTimer();
    stopRef.current?.();
    stopRef.current = null;
    const el = videoElRef.current;
    if (el?.srcObject) el.srcObject = null;
  }, [clearRetryTimer]);

  const startCamera = useCallback(
    async (el: HTMLVideoElement, session: number) => {
      try {
        const { width, height, stop } = await initCamera(el);
        if (session !== sessionRef.current || videoElRef.current !== el) {
          stop();
          return;
        }
        stopRef.current = stop;
        retryCountRef.current = 0;
        setSize({ width, height });
        setReady(true);
        setError(null);
      } catch (err) {
        if (session !== sessionRef.current || videoElRef.current !== el) return;

        const recoverable = isRecoverableCameraError(err);
        if (recoverable && el.isConnected && retryCountRef.current < MAX_CAMERA_RETRIES) {
          retryCountRef.current += 1;
          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => {
            if (session === sessionRef.current && videoElRef.current === el) {
              void startCamera(el, session);
            }
          }, RETRY_MS);
          return;
        }

        setError(err instanceof Error ? err.message : 'Camera failed');
        setReady(false);
      }
    },
    [clearRetryTimer]
  );

  const bindVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      clearRetryTimer();
      videoElRef.current = el;
      sessionRef.current += 1;

      if (!el) {
        stopCamera();
        retryCountRef.current = 0;
        setReady(false);
        return;
      }

      const session = sessionRef.current;
      stopCamera();
      retryCountRef.current = 0;
      setReady(false);
      setError(null);
      void startCamera(el, session);
    },
    [clearRetryTimer, startCamera, stopCamera]
  );

  const retryCamera = useCallback(() => {
    const el = videoElRef.current;
    if (!el) return;
    clearRetryTimer();
    sessionRef.current += 1;
    const session = sessionRef.current;
    stopCamera();
    retryCountRef.current = 0;
    setError(null);
    setReady(false);
    void startCamera(el, session);
  }, [clearRetryTimer, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      stopCamera();
    };
  }, [stopCamera]);

  return {
    bindVideo,
    videoRef: videoElRef,
    width: size.width,
    height: size.height,
    ready,
    error,
    retryCamera,
  };
}
