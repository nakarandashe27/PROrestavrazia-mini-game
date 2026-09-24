// Общие утилиты мозаики: детерминированный рандом, шум, easing, цвет.
export type RGB = [number, number, number];

export function mulberry32(seed: number) {
 let a = seed >>> 0;
 return () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

export function hash1(n: number) {
 let x = (n | 0) ^ 0x9e3779b9;
 x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
 x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
 x ^= x >>> 16;
 return (x >>> 0) / 4294967296;
}

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export function easeOutBack(t: number, s = 1.70158) { const u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; }

export function noise2(x: number, y: number, seed = 0) {
 const xi = Math.floor(x), yi = Math.floor(y);
 const u = smooth(x - xi), v = smooth(y - yi);
 const h = (i: number, j: number) => hash1((i * 73856093) ^ (j * 19349663) ^ (seed * 83492791));
 return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

export function hexToRgb(h: string): RGB {
 const n = parseInt(h.replace('#', ''), 16);
 return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export function desat(c: RGB, k: number): RGB {
 const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
 return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
}

export function makeCanvas(w: number, h: number) {
 const c = document.createElement('canvas');
 c.width = w; c.height = h;
 return c;
}
