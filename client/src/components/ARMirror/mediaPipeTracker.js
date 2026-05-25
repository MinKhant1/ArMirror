const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';

const MODEL_CDN = 'https://storage.googleapis.com/mediapipe-models';

let visionModule = null;

async function loadVision() {
  if (!visionModule) {
    visionModule = await import('@mediapipe/tasks-vision');
  }
  return visionModule;
}

export async function createMediaPipeTracker(options = {}) {
  const {
    face = true,
    pose = true,
    segmentation = true,
    blendshapes = false,
    numFaces = 1,
    numPoses = 1,
    faceTransform = false,
  } = options;

  const { FilesetResolver, FaceLandmarker, PoseLandmarker, ImageSegmenter } =
    await loadVision();

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const tasks = [];
  const result = { detect: null, close: () => {} };

  let faceLandmarker = null;
  let poseLandmarker = null;
  let imageSegmenter = null;

  if (face) {
    tasks.push(
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${MODEL_CDN}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces,
        outputFaceBlendshapes: blendshapes,
        outputFacialTransformationMatrixes: faceTransform,
      }).then((lm) => {
        faceLandmarker = lm;
      })
    );
  }

  if (pose) {
    tasks.push(
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${MODEL_CDN}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses,
      }).then((lm) => {
        poseLandmarker = lm;
      })
    );
  }

  if (segmentation) {
    tasks.push(
      ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${MODEL_CDN}/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite`,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      }).then((seg) => {
        imageSegmenter = seg;
      })
    );
  }

  await Promise.all(tasks);

  result.detect = (video, timestamp) => {
    const out = {};
    if (faceLandmarker) out.face = faceLandmarker.detectForVideo(video, timestamp);
    if (poseLandmarker) out.pose = poseLandmarker.detectForVideo(video, timestamp);
    if (imageSegmenter) out.segmentation = imageSegmenter.segmentForVideo(video, timestamp);
    return out;
  };

  result.close = () => {
    faceLandmarker?.close();
    poseLandmarker?.close();
    imageSegmenter?.close();
  };

  return result;
}

export function getBlendshapeScore(blendshapes, names) {
  if (!blendshapes?.length) return 0;
  const categories = blendshapes[0]?.categories ?? blendshapes;
  if (!categories?.length) return 0;

  let total = 0;
  let count = 0;
  for (const name of names) {
    const match = categories.find((c) => c.categoryName === name || c.displayName === name);
    if (match) {
      total += match.score ?? 0;
      count += 1;
    }
  }
  return count ? total / count : 0;
}

export function getFaceSmile(blendshapes, faceIndex = 0) {
  if (!blendshapes?.[faceIndex]) return 0;
  const smile = getBlendshapeScore([blendshapes[faceIndex]], [
    'mouthSmileLeft',
    'mouthSmileRight',
  ]);
  return Math.min(1, smile * 1.5);
}

export function getEmotionFromBlendshapes(blendshapes) {
  const smile = getBlendshapeScore(blendshapes, [
    'mouthSmileLeft',
    'mouthSmileRight',
  ]);
  const frown = getBlendshapeScore(blendshapes, [
    'browDownLeft',
    'browDownRight',
    'mouthFrownLeft',
    'mouthFrownRight',
  ]);
  const surprise = getBlendshapeScore(blendshapes, [
    'eyeWideLeft',
    'eyeWideRight',
    'jawOpen',
  ]);

  return {
    smile: Math.min(1, smile * 1.4),
    frown: Math.min(1, frown * 1.4),
    surprise: Math.min(1, surprise * 1.2),
  };
}

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
];

export function computePoseVelocities(current, previous, dt) {
  if (!current?.length || !previous?.length || dt <= 0) {
    return { landmarks: current, avgVelocity: 0, maxVelocity: 0, hotspots: [] };
  }

  let total = 0;
  let max = 0;
  const hotspots = [];

  for (let i = 0; i < current.length; i++) {
    const c = current[i];
    const p = previous[i];
    if (!c || !p) continue;

    const dx = (c.x - p.x) / dt;
    const dy = (c.y - p.y) / dt;
    const v = Math.hypot(dx, dy);
    total += v;
    if (v > max) max = v;
    if (v > 0.8) hotspots.push({ index: i, x: c.x, y: c.y, velocity: v });
  }

  return {
    landmarks: current,
    avgVelocity: total / current.length,
    maxVelocity: max,
    hotspots,
  };
}

export { POSE_CONNECTIONS };
