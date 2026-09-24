// Мозаичный движок (перенесён из промо-ролика «ПРО реставрацию»).
// 1) Дизайн рисуется «метками»: каждая область — свой уникальный цвет.
// 2) По меткам строится карта контуров и поле расстояний (EDT, Felzenszwalb).
// 3) Смальта укладывается рядами вдоль контуров (andamento), дальше — перевязка «в разбежку».
// 4) Остатки заполняются подрезанными кусочками меньшего размера.
// Геометрия плиток статична; цвет берётся из палитр (день/ночь/огни) и анимируется в сцене.
import { hash1, makeCanvas, mulberry32, type RGB } from './util';

const INF = 1e20;

export type Flow = { bands?: number; skip?: boolean };
export type Painter = {
 ctx: CanvasRenderingContext2D;
 label: boolean;
 col(key: string): string;
 grad(keyA: string, keyB: string, x0: number, y0: number, x1: number, y1: number, stops?: [number, string][]): string | CanvasGradient;
};
export type Design = { W: number; H: number; draw(p: Painter): void; flow?(key: string): Flow };
export type Tile = {
 id: number; x: number; y: number; a: number; L: number; w: number; kind: number;
 key: string; pts: Float32Array; rnd: number; rnd2: number; size: number;
 col: Record<string, RGB>;
};
export type Mosaic = { W: number; H: number; tiles: Tile[]; regionTiles: Map<string, Tile[]>; buildMs: number; sample(name: string, colorOf: (key: string) => string): void };

class LabelPalette {
 keys: string[] = [];
 byKey = new Map<string, number>();
 byColor = new Map<number, number>();
 css: string[] = [];
 color(key: string) {
  let idx = this.byKey.get(key);
  if (idx === undefined) {
   idx = this.keys.length;
   let n = idx + 1, rgb: number[];
   do { rgb = [(n * 53 + 17) & 255, (n * 97 + 31) & 255, (n * 151 + 67) & 255]; n += 257; }
   while (this.byColor.has((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]));
   this.keys.push(key); this.byKey.set(key, idx);
   this.byColor.set((rgb[0] << 16) | (rgb[1] << 8) | rgb[2], idx);
   this.css[idx] = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }
  return this.css[idx];
 }
}

// В режиме меток градиенты плоские, иначе области «поплывут».
export function makePainter(ctx: CanvasRenderingContext2D, colorOf: (key: string) => string, isLabel: boolean): Painter {
 return {
  ctx, label: isLabel, col: colorOf,
  grad(keyA, keyB, x0, y0, x1, y1, stops) {
   if (isLabel) return colorOf(keyA);
   const g = ctx.createLinearGradient(x0, y0, x1, y1);
   if (stops) stops.forEach(([o, k]) => g.addColorStop(o, colorOf(k)));
   else { g.addColorStop(0, colorOf(keyA)); g.addColorStop(1, colorOf(keyB)); }
   return g;
  },
 };
}

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
 let k = 0;
 v[0] = 0; z[0] = -INF; z[1] = INF;
 for (let q = 1; q < n; q++) {
  let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
  while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
  k++; v[k] = q; z[k] = s; z[k + 1] = INF;
 }
 k = 0;
 for (let q = 0; q < n; q++) {
  while (z[k + 1] < q) k++;
  const dq = q - v[k];
  d[q] = dq * dq + f[v[k]];
 }
}

function edt2d(grid: Float32Array, W: number, H: number) {
 const n = Math.max(W, H);
 const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
 for (let x = 0; x < W; x++) {
  for (let y = 0; y < H; y++) f[y] = grid[y * W + x];
  edt1d(f, H, d, v, z);
  for (let y = 0; y < H; y++) grid[y * W + x] = d[y];
 }
 for (let y = 0; y < H; y++) {
  const o = y * W;
  for (let x = 0; x < W; x++) f[x] = grid[o + x];
  edt1d(f, W, d, v, z);
  for (let x = 0; x < W; x++) grid[o + x] = Math.sqrt(d[x]);
 }
 return grid;
}

export function buildMosaic(design: Design, opts: { tile?: number; grout?: number; seed?: number; fillers?: number[] } = {}): Mosaic {
 const t0 = performance.now();
 const { W, H } = design;
 const S = opts.tile ?? 12, G = opts.grout ?? 2, P = S + G;
 const rnd = mulberry32(opts.seed ?? 7);
 const N = W * H;

 // 1. Метки
 const labels = new LabelPalette();
 const lc = makeCanvas(W, H);
 const lctx = lc.getContext('2d', { willReadFrequently: true })!;
 lctx.imageSmoothingEnabled = false;
 design.draw(makePainter(lctx, k => labels.color(k), true));
 const data = lctx.getImageData(0, 0, W, H).data;
 const reg = new Int16Array(N);
 for (let i = 0; i < N; i++) {
  const r = labels.byColor.get((data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]);
  reg[i] = r === undefined ? -1 : r;
 }
 lc.width = lc.height = 1;
 const keys = labels.keys;
 const flows = keys.map(k => ({ bands: 3, ...(design.flow ? design.flow(k) : {}) }));

 // 2. Контуры и поле расстояний
 const D = new Float32Array(N);
 for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, r = reg[i];
  const e = r < 0 || (x + 1 < W && reg[i + 1] !== r) || (x > 0 && reg[i - 1] !== r) || (y + 1 < H && reg[i + W] !== r) || (y > 0 && reg[i - W] !== r);
  D[i] = e ? 0 : INF;
 }
 edt2d(D, W, H);

 const occ = new Uint8Array(N);
 const tiles: Tile[] = [];
 const tangentAt = (fx: number, fy: number) => {
  const x = Math.round(fx), y = Math.round(fy), r = 2;
  if (x < r || y < r || x >= W - r || y >= H - r) return 0;
  const i = y * W + x;
  const gx = D[i + r] - D[i - r], gy = D[i + r * W] - D[i - r * W];
  if (Math.abs(gx) + Math.abs(gy) < 0.35) return null;
  return Math.atan2(gy, gx) + Math.PI / 2;
 };
 function footprint(cx: number, cy: number, ang: number, L: number, Wd: number, mark: boolean, region: number) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const hl = L / 2 + G / 2, hw = Wd / 2 + G / 2, bl = L / 2, bw = Wd / 2;
  const ex = Math.abs(ca) * hl + Math.abs(sa) * hw, ey = Math.abs(sa) * hl + Math.abs(ca) * hw;
  const x0 = Math.max(0, Math.floor(cx - ex)), x1 = Math.min(W - 1, Math.ceil(cx + ex));
  const y0 = Math.max(0, Math.floor(cy - ey)), y1 = Math.min(H - 1, Math.ceil(cy + ey));
  for (let y = y0; y <= y1; y++) {
   const dy = y + 0.5 - cy;
   for (let x = x0; x <= x1; x++) {
    const dx = x + 0.5 - cx, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    if (u < -hl || u > hl || v < -hw || v > hw) continue;
    const i = y * W + x;
    if (mark) occ[i] = 1;
    else {
     if (occ[i]) return false;
     if (u >= -bl && u <= bl && v >= -bw && v <= bw && (D[i] < 0.5 || reg[i] !== region)) return false;
    }
   }
  }
  return true;
 }
 function place(cx: number, cy: number, ang: number, L: number, Wd: number, kind: number) {
  const ix = Math.round(cx), iy = Math.round(cy);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return false;
  const i0 = iy * W + ix;
  if (occ[i0] || D[i0] < 0.5) return false;
  const region = reg[i0];
  if (region < 0 || flows[region].skip) return false;
  if (!footprint(cx, cy, ang, L, Wd, false, region)) return false;
  footprint(cx, cy, ang, L, Wd, true, region);
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = new Float32Array(8);
  const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]], jit = kind === 2 ? 0.14 : 0.08;
  for (let k = 0; k < 4; k++) {
   const ju = 1 - rnd() * jit, jv = 1 - rnd() * jit;
   const u = (cs[k][0] * L) / 2 * ju + (rnd() - 0.5) * 0.6, v = (cs[k][1] * Wd) / 2 * jv + (rnd() - 0.5) * 0.6;
   pts[k * 2] = u * ca - v * sa; pts[k * 2 + 1] = u * sa + v * ca;
  }
  tiles.push({ id: 0, x: cx, y: cy, a: ang, L, w: Wd, kind, key: keys[region], pts, rnd: rnd(), rnd2: rnd(), size: Math.max(L, Wd), col: {} });
  return true;
 }

 // 3. Ряды вдоль контуров
 const off = S / 2 + 1;
 const buckets: number[][] = [];
 for (let i = 0; i < N; i++) {
  const r = reg[i];
  if (r < 0 || flows[r].skip) continue;
  const d = D[i], k = Math.round((d - off) / P);
  if (k < 0 || k >= (flows[r].bands ?? 3)) continue;
  if (Math.abs(d - (off + k * P)) >= 0.5) continue;
  (buckets[k] ||= []).push(i);
 }
 for (const b of buckets) {
  if (!b) continue;
  for (const i of b) {
   if (occ[i]) continue;
   const x = i % W, y = (i / W) | 0, a = tangentAt(x, y);
   if (a === null) continue;
   place(x + 0.5, y + 0.5, a, S * (0.82 + rnd() * 0.36), S * (0.9 + rnd() * 0.1), 0);
  }
 }

 // 4. Фон: перевязка «в разбежку»
 const rows = Math.ceil(H / P) + 1;
 for (let r = 0; r < rows; r++) {
  const y = r * P + P / 2;
  const stagger = (r % 2) * P * 0.5 + (hash1(r * 131) - 0.5) * P * 0.35;
  for (let c = -1; c < W / P + 1; c++) {
   const x = c * P + stagger + (rnd() - 0.5) * 1.2;
   place(x, y + (rnd() - 0.5), (rnd() - 0.5) * 0.05, P - G + (rnd() - 0.5) * S * 0.16, S * (0.93 + rnd() * 0.07), 1);
  }
 }

 // 5. Подрезка: щели кусочками поменьше
 const C = new Float32Array(N);
 for (const f of opts.fillers ?? [0.74, 0.56, 0.46]) {
  for (let i = 0; i < N; i++) C[i] = occ[i] || D[i] < 0.5 ? 0 : INF;
  edt2d(C, W, H);
  const minC = f * S * 0.42 + G * 0.5;
  let n = 0;
  for (let i = 0; i < N; i++) if (C[i] >= minC) n++;
  const cand = new Uint32Array(n);
  n = 0;
  for (let i = 0; i < N; i++) if (C[i] >= minC) cand[n++] = i;
  const order = Array.from(cand).sort((a, b) => C[b] - C[a]);
  for (const i of order) {
   if (occ[i]) continue;
   const x = i % W, y = (i / W) | 0;
   const L = f * S * (0.85 + rnd() * 0.3), Wd = f * S * (0.8 + rnd() * 0.2);
   const a = tangentAt(x, y) ?? 0;
   if (!place(x + 0.5, y + 0.5, a, L, Wd, 2)) place(x + 0.5, y + 0.5, 0, L * 0.9, Wd * 0.9, 2);
  }
 }

 tiles.sort((a, b) => a.y - b.y || a.x - b.x);
 const regionTiles = new Map<string, Tile[]>();
 tiles.forEach((t, idx) => {
  t.id = idx;
  const arr = regionTiles.get(t.key);
  if (arr) arr.push(t); else regionTiles.set(t.key, [t]);
 });

 return {
  W, H, tiles, regionTiles, buildMs: performance.now() - t0,
  // Палитра: рисуем дизайн цветами палитры и берём средний цвет под плиткой.
  sample(name, colorOf) {
   const c = makeCanvas(W, H);
   const ctx = c.getContext('2d', { willReadFrequently: true })!;
   design.draw(makePainter(ctx, colorOf, false));
   const px = ctx.getImageData(0, 0, W, H).data;
   c.width = c.height = 1;
   for (const t of tiles) {
    const ca = Math.cos(t.a), sa = Math.sin(t.a);
    let r = 0, g = 0, b = 0, n = 0;
    const us = [0, -t.L * 0.22, t.L * 0.22, 0, 0], vs = [0, 0, 0, -t.w * 0.22, t.w * 0.22];
    for (let k = 0; k < 5; k++) {
     const x = Math.round(t.x + us[k] * ca - vs[k] * sa), y = Math.round(t.y + us[k] * sa + vs[k] * ca);
     if (x < 0 || y < 0 || x >= W || y >= H) continue;
     const i = (y * W + x) * 4;
     r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
    }
    t.col[name] = n ? [r / n, g / n, b / n] : [0, 0, 0];
   }
  },
 };
}
