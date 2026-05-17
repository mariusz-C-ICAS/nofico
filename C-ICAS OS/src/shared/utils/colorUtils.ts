export const DEFAULT_BRAND_COLOR = '#4f46e5'; // indigo-600

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
    case g: h = ((b - r) / d + 2) * 60; break;
    default: h = ((r - g) / d + 4) * 60; break;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Applies brand color CSS vars to :root — updates all brand-* utilities instantly. */
export function applyBrandColor(hex: string) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    applyBrandColor(DEFAULT_BRAND_COLOR);
    return;
  }
  const { h, s } = hexToHsl(hex);
  const root = document.documentElement;
  root.style.setProperty('--brand-h', String(h));
  root.style.setProperty('--brand-s', `${s}%`);
}

/** Returns a preview hex for a given shade index (0=50…9=900) from a base hex color. */
export function brandShadeHex(hex: string, shade: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) hex = DEFAULT_BRAND_COLOR;
  const { h, s } = hexToHsl(hex);
  const lightnessMap: Record<number, number> = {
    50: 97, 100: 94, 200: 88, 300: 78, 400: 67,
    500: 57, 600: 47, 700: 38, 800: 28, 900: 19,
  };
  const l = lightnessMap[shade] ?? 47;
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
