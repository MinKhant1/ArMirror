import { forwardRef } from 'react';

type Props = {
  bindVideo: (el: HTMLVideoElement | null) => void;
  segCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  filterCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  fxCanvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export const GameCanvas = forwardRef<HTMLDivElement, Props>(function GameCanvas(
  { bindVideo, segCanvasRef, filterCanvasRef, fxCanvasRef },
  ref
) {
  return (
    <div ref={ref} className="wild-four__stage">
      <video ref={bindVideo} className="wild-four__video" playsInline muted />
      <canvas ref={segCanvasRef} className="wild-four__layer wild-four__seg" />
      <canvas ref={filterCanvasRef} className="wild-four__layer wild-four__filter" />
      <canvas ref={fxCanvasRef} className="wild-four__layer wild-four__fx" />
    </div>
  );
});
