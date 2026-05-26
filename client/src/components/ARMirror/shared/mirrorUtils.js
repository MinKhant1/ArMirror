export class RingBuffer {
  constructor(maxAgeMs = 10000) {
    this.maxAgeMs = maxAgeMs;
    this.frames = [];
  }

  push(timestamp, canvas) {
    this.frames.push({ timestamp, canvas });
    this.prune(timestamp);
  }

  prune(now) {
    this.frames = this.frames.filter((f) => now - f.timestamp <= this.maxAgeMs);
  }

  getAtAge(now, targetAgeMs) {
    if (!this.frames.length) return null;
    let best = null;
    let bestDiff = Infinity;
    for (const frame of this.frames) {
      const age = now - frame.timestamp;
      const diff = Math.abs(age - targetAgeMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = frame;
      }
    }
    return best;
  }

  getAll(now) {
    this.prune(now);
    return [...this.frames].sort((a, b) => a.timestamp - b.timestamp);
  }

  clear() {
    this.frames = [];
  }
}

export function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getCategoryMask(segmentation) {
  return segmentation?.categoryMask ?? null;
}

export function parseMask(mask) {
  if (!mask) return null;
  return {
    data: mask.getAsUint8Array(),
    width: mask.width,
    height: mask.height,
  };
}

function isPersonPixel(maskInfo, x, y, frameW, frameH) {
  const mx = Math.min(maskInfo.width - 1, Math.floor((x / frameW) * maskInfo.width));
  const my = Math.min(maskInfo.height - 1, Math.floor((y / frameH) * maskInfo.height));
  return maskInfo.data[my * maskInfo.width + mx] > 0;
}

function samplePersonAlpha(maskInfo, x, y, frameW, frameH, feather) {
  if (!maskInfo) return 255;
  if (feather <= 0) {
    return isPersonPixel(maskInfo, x, y, frameW, frameH) ? 255 : 0;
  }

  let sum = 0;
  let count = 0;
  for (let dy = -feather; dy <= feather; dy += 2) {
    for (let dx = -feather; dx <= feather; dx += 2) {
      sum += isPersonPixel(maskInfo, x + dx, y + dy, frameW, frameH) ? 1 : 0;
      count += 1;
    }
  }
  const coverage = sum / count;
  return Math.round(Math.min(1, Math.max(0, (coverage - 0.15) / 0.7)) * 255);
}

export function drawMirroredVideo(ctx, video, width, height) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();
}

/**
 * Draw only the person cutout (for ghost/trail layers).
 */
export function drawSegmentedPerson(ctx, video, mask, width, height, options = {}) {
  const { mirror = true, feather = 2, alpha = 1 } =
    typeof options === 'boolean' ? { mirror: options } : options;

  const maskInfo = parseMask(mask);
  if (!maskInfo) return;

  const temp = createOffscreenCanvas(width, height);
  const tctx = temp.getContext('2d');

  tctx.save();
  if (mirror) {
    tctx.translate(width, 0);
    tctx.scale(-1, 1);
  }
  tctx.drawImage(video, 0, 0, width, height);
  tctx.restore();

  const imageData = tctx.getImageData(0, 0, width, height);
  const px = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = samplePersonAlpha(maskInfo, x, y, width, height, feather);
      const i = (y * width + x) * 4;
      px[i + 3] = Math.round((px[i + 3] * a) / 255);
    }
  }

  tctx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(temp, 0, 0);
  ctx.restore();
}

/**
 * Draw reactive layer only where the background is (not on the person).
 */
export function drawBackgroundOnly(ctx, sourceCanvas, mask, width, height) {
  const maskInfo = parseMask(mask);
  if (!maskInfo) {
    ctx.drawImage(sourceCanvas, 0, 0);
    return;
  }

  const temp = createOffscreenCanvas(width, height);
  const tctx = temp.getContext('2d');
  tctx.drawImage(sourceCanvas, 0, 0);

  const imageData = tctx.getImageData(0, 0, width, height);
  const px = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPersonPixel(maskInfo, x, y, width, height)) {
        const i = (y * width + x) * 4;
        px[i + 3] = 0;
      }
    }
  }

  tctx.putImageData(imageData, 0, 0);
  ctx.drawImage(temp, 0, 0);
}

export function drawDarkBackground(ctx, width, height, hue = 220) {
  const g = ctx.createRadialGradient(width / 2, height * 0.6, 0, width / 2, height / 2, width * 0.7);
  g.addColorStop(0, `hsla(${hue}, 40%, 18%, 1)`);
  g.addColorStop(0.5, `hsla(${hue + 40}, 50%, 8%, 1)`);
  g.addColorStop(1, '#020408');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export function isRecoverableCameraError(err) {
  if (!err) return false;
  if (err.recoverable === true) return true;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || err);
  return /interrupted|removed from the document|play\(\) request was interrupted|not in document/i.test(
    msg
  );
}

async function safePlayVideo(video) {
  if (!video.isConnected) {
    const e = new Error('Video element not in document');
    e.recoverable = true;
    throw e;
  }
  try {
    await video.play();
  } catch (err) {
    if (isRecoverableCameraError(err)) {
      const e = new Error(err.message || 'Video play interrupted');
      e.recoverable = true;
      throw e;
    }
    throw err;
  }
}

export async function initCamera(video, ideal = { width: 1280, height: 720 }) {
  if (!video?.isConnected) {
    const e = new Error('Video element not in document');
    e.recoverable = true;
    throw e;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: ideal.width }, height: { ideal: ideal.height } },
    audio: false,
  });

  try {
    if (!video.isConnected) {
      const e = new Error('Video element removed before camera start');
      e.recoverable = true;
      throw e;
    }
    video.srcObject = stream;
    await safePlayVideo(video);
    return {
      width: video.videoWidth || ideal.width,
      height: video.videoHeight || ideal.height,
      stop: () => {
        stream.getTracks().forEach((t) => t.stop());
        if (video.srcObject === stream) video.srcObject = null;
      },
    };
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    if (video.srcObject === stream) video.srcObject = null;
    if (isRecoverableCameraError(err)) {
      const e = new Error(err.message || 'Camera start interrupted');
      e.recoverable = true;
      throw e;
    }
    throw err;
  }
}
