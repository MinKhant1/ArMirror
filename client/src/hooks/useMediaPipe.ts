import { useEffect, useRef, useState } from 'react';
import { createMediaPipeTracker } from '../components/ARMirror/mediaPipeTracker.js';

type Tracker = Awaited<ReturnType<typeof createMediaPipeTracker>>;

export function useMediaPipe(enabled: boolean) {
  const trackerRef = useRef<Tracker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    createMediaPipeTracker({
      face: true,
      pose: false,
      segmentation: false,
      blendshapes: true,
      faceTransform: true,
      numFaces: 4,
    })
      .then((tracker) => {
        if (disposed) {
          tracker.close();
          return;
        }
        trackerRef.current = tracker;
        setReady(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'MediaPipe failed');
      });

    return () => {
      disposed = true;
      trackerRef.current?.close();
      trackerRef.current = null;
    };
  }, [enabled]);

  const detect = (video: HTMLVideoElement, timestamp: number) =>
    trackerRef.current?.detect(video, timestamp) ?? {};

  return { detect, ready, error };
}
