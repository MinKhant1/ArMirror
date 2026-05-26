import { useEffect, useRef, useState } from 'react';
import { createMediaPipeTracker } from '../components/ARMirror/mediaPipeTracker.js';

type Tracker = Awaited<ReturnType<typeof createMediaPipeTracker>>;

export type UseMediaPipeOptions = {
  segmentation?: boolean;
  pose?: boolean;
  numFaces?: number;
};

export function useMediaPipe(enabled: boolean, options: UseMediaPipeOptions = {}) {
  const trackerRef = useRef<Tracker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { segmentation = false, pose = false, numFaces = 4 } = options;

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    createMediaPipeTracker({
      face: true,
      pose,
      segmentation,
      blendshapes: true,
      faceTransform: true,
      numFaces,
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
  }, [enabled, segmentation, pose, numFaces]);

  const detect = (video: HTMLVideoElement, timestamp: number) =>
    trackerRef.current?.detect(video, timestamp) ?? {};

  return { detect, ready, error };
}
