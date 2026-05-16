import { initFaceDetector, detectFaces } from '../mediapipe';

export interface BlurOptions {
  blurRadius?: number;
  padding?: number;
}

export async function autoBlurFaces(
  source: HTMLImageElement | HTMLVideoElement,
  options: BlurOptions = {}
): Promise<Blob> {
  const { blurRadius = 20, padding = 10 } = options;

  const result = await detectFaces(source);

  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.videoWidth;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.videoHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(source, 0, 0, w, h);

  if (result.detected) {
    for (const box of result.boundingBoxes) {
      const x = Math.max(0, box.x - padding);
      const y = Math.max(0, box.y - padding);
      const bw = Math.min(w - x, box.width + padding * 2);
      const bh = Math.min(h - y, box.height + padding * 2);

      ctx.save();
      ctx.filter = `blur(${blurRadius}px)`;
      ctx.drawImage(canvas, x, y, bw, bh, x, y, bw, bh);
      ctx.restore();

      ctx.save();
      ctx.filter = `blur(${blurRadius}px)`;
      ctx.drawImage(canvas, x, y, bw, bh, x, y, bw, bh);
      ctx.restore();
    }
  }

  return new Promise(resolve =>
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.92)
  );
}

export async function autoBlurFromFile(file: File, options?: BlurOptions): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await new Promise<void>(resolve => { img.onload = () => resolve(); });
  const blob = await autoBlurFaces(img, options);
  URL.revokeObjectURL(url);
  return blob;
}
