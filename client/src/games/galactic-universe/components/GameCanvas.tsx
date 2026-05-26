import { forwardRef } from 'react';

type Props = {
  bindVideo: (el: HTMLVideoElement | null) => void;
  segCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  flyCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  filterCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  fxCanvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export const GameCanvas = forwardRef<HTMLDivElement, Props>(function GameCanvas(
  { bindVideo, segCanvasRef, flyCanvasRef, filterCanvasRef, fxCanvasRef },
  ref
) {
  return (
    <div ref={ref} className="galactic__stage">
      <video ref={bindVideo} className="galactic__video" playsInline muted />
      <canvas ref={segCanvasRef} className="galactic__layer galactic__seg" />
      <canvas ref={flyCanvasRef} className="galactic__layer galactic__fly" />
      <canvas ref={filterCanvasRef} className="galactic__layer galactic__filter" />
      <canvas ref={fxCanvasRef} className="galactic__layer galactic__fx" />
    </div>
  );
});
