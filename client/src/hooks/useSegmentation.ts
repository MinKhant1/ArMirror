import { useEffect, useRef, useState } from 'react';
import { createMediaPipeTracker } from '../components/ARMirror/mediaPipeTracker.js';
import { getCategoryMask } from '../components/ARMirror/shared/mirrorUtils.js';

type Tracker = Awaited<ReturnType<typeof createMediaPipeTracker>>;

export function useSegmentation(enabled: boolean) {
  const trackerRef = useRef<Tracker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    createMediaPipeTracker({
      face: false,
      pose: false,
      segmentation: true,
    })
      .then((tracker) => {
        if (disposed) {
          tracker.close();
          return;
        }
        trackerRef.current = tracker;
        setReady(true);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      trackerRef.current?.close();
      trackerRef.current = null;
    };
  }, [enabled]);

  const segment = (video: HTMLVideoElement, timestamp: number) => {
    const results = trackerRef.current?.detect(video, timestamp);
    return getCategoryMask(results?.segmentation ?? null);
  };

  return { segment, ready };
}
