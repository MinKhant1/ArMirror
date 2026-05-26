import { useEffect, useRef, useState } from 'react';
import { ASSET_KEYS, ASSET_PATHS } from '../config';

function placeholderImage(): HTMLImageElement {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,0,255,0.01)';
  ctx.fillRect(0, 0, 4, 4);
  const img = new Image();
  img.src = c.toDataURL();
  return img;
}

export function useGalacticAssets() {
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const total = ASSET_KEYS.length;
    let loaded = 0;
    let cancelled = false;

    const bump = () => {
      loaded += 1;
      if (!cancelled) setProgress(loaded / total);
      if (loaded >= total && !cancelled) setReady(true);
    };

    ASSET_KEYS.forEach((key) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imagesRef.current.set(key, img);
        bump();
      };
      img.onerror = () => {
        imagesRef.current.set(key, placeholderImage());
        bump();
      };
      img.src = ASSET_PATHS[key];
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { imagesRef, progress, ready };
}
