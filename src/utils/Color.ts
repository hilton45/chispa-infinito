/**
 * HSL and RGB color utilities for dynamic era palettes and shaders.
 */

export function hslToRgbNormalized(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hue < 60) {
    r1 = c;
    g1 = x;
  } else if (hue < 120) {
    r1 = x;
    g1 = c;
  } else if (hue < 180) {
    g1 = c;
    b1 = x;
  } else if (hue < 240) {
    g1 = x;
    b1 = c;
  } else if (hue < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return [r1 + m, g1 + m, b1 + m];
}

export function hslToHexNumber(h: number, s: number, l: number): number {
  const [r, g, b] = hslToRgbNormalized(h, s, l);
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return (ri << 16) | (gi << 8) | bi;
}

/**
 * Shortest-path angular interpolation between two hues in degrees (0-360).
 */
export function lerpHue(h1: number, h2: number, t: number): number {
  const diff = ((((h2 - h1) % 360) + 540) % 360) - 180;
  return (((h1 + diff * t) % 360) + 360) % 360;
}
