export interface DeskewResult {
  blob: Blob;
  angleDegrees: number;
  wasRotated: boolean;
}

function detectSkewAngle(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const angles: number[] = [];

  const step = Math.max(1, Math.floor(height / 40));

  for (let y = step; y < height - step; y += step) {
    let firstDark = -1;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 128) { firstDark = x; break; }
    }
    if (firstDark < 0) continue;

    let firstDarkBelow = -1;
    for (let x = 0; x < width; x++) {
      const i = ((y + step) * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 128) { firstDarkBelow = x; break; }
    }
    if (firstDarkBelow < 0) continue;

    const dx = firstDarkBelow - firstDark;
    const dy = step;
    angles.push(Math.atan2(dx, dy) * (180 / Math.PI));
  }

  if (angles.length === 0) return 0;
  angles.sort((a, b) => a - b);
  return angles[Math.floor(angles.length / 2)];
}

export async function deskewImage(source: HTMLImageElement | File): Promise<DeskewResult> {
  let img: HTMLImageElement;
  let objectUrl: string | null = null;

  if (source instanceof File) {
    objectUrl = URL.createObjectURL(source);
    img = new Image();
    img.src = objectUrl;
    await new Promise<void>(resolve => { img.onload = () => resolve(); });
  } else {
    img = source;
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const octx = offscreen.getContext('2d')!;
  octx.drawImage(img, 0, 0);
  const imageData = octx.getImageData(0, 0, w, h);
  const angle = detectSkewAngle(imageData);

  if (objectUrl) URL.revokeObjectURL(objectUrl);

  const THRESHOLD = 0.5;
  if (Math.abs(angle) < THRESHOLD) {
    const blob = await new Promise<Blob>(resolve =>
      offscreen.toBlob(b => resolve(b!), 'image/jpeg', 0.95)
    );
    return { blob, angleDegrees: 0, wasRotated: false };
  }

  const rad = (-angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newW = Math.ceil(w * cos + h * sin);
  const newH = Math.ceil(h * cos + w * sin);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -w / 2, -h / 2);

  const blob = await new Promise<Blob>(resolve =>
    canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.95)
  );

  return { blob, angleDegrees: angle, wasRotated: true };
}
