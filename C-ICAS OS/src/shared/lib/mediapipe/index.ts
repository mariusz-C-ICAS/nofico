// MediaPipe Tasks Vision — client-side ML inference
// Uses dynamic import to avoid SSR issues

export interface FaceDetectionResult {
  detected: boolean;
  boundingBoxes: Array<{ x: number; y: number; width: number; height: number }>;
  score?: number;
}

export interface ObjectDetectionResult {
  objects: Array<{
    label: string;
    score: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
}

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';

let _faceDetector: any = null;
let _objectDetector: any = null;

export async function initFaceDetector(): Promise<void> {
  const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  _faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite' },
    runningMode: 'IMAGE',
  });
}

export async function detectFaces(imageElement: HTMLImageElement | HTMLVideoElement): Promise<FaceDetectionResult> {
  if (!_faceDetector) await initFaceDetector();
  const result = _faceDetector.detect(imageElement);
  return {
    detected: result.detections.length > 0,
    boundingBoxes: result.detections.map((d: any) => d.boundingBox),
    score: result.detections[0]?.categories[0]?.score,
  };
}

export async function initObjectDetector(): Promise<void> {
  const { ObjectDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  _objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite' },
    runningMode: 'IMAGE',
    maxResults: 5,
    scoreThreshold: 0.5,
  });
}

export async function detectObjects(imageElement: HTMLImageElement | HTMLVideoElement): Promise<ObjectDetectionResult> {
  if (!_objectDetector) await initObjectDetector();
  const result = _objectDetector.detect(imageElement);
  return {
    objects: result.detections.map((d: any) => ({
      label: d.categories[0]?.categoryName ?? 'unknown',
      score: d.categories[0]?.score ?? 0,
      boundingBox: d.boundingBox,
    })),
  };
}
