import { drawMirroredVideo } from '../../../components/ARMirror/shared/mirrorUtils.js';

/** Full mirrored camera feed (no segmentation cutout). */
export function drawWildFourFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number
) {
  drawMirroredVideo(ctx, video, w, h);
}
