// Живая мозаика заставки: фасад собирается волной от портала, плитка откликается на курсор,
// утраты смальты восстанавливаются под рукой посетителя, клик пускает волну перекладки.
import { buildMosaic, type Mosaic } from './build';
import { createFacade, paletteFn, PALETTES, WH, type FacadeGeo } from './facade';
import { TileRenderer, type Cam } from './gl';
import { clamp, desat, easeOutBack, easeOutCubic, hash1, lerp, mixRgb, mulberry32, noise2, smooth, type RGB } from './util';

export type LightMode = 'day' | 'night' | 'cycle';
export type SceneOptions = {
 canvas: HTMLCanvasElement;
 host: HTMLElement;
 target: HTMLElement;
 reduced: boolean;
 /** Доля ширины слева, закрытая карточкой интерфейса: утраты туда не ставим, портал сдвигаем вправо. */
 safeLeft: () => number;
 onRestore?: (done: number, total: number) => void;
 onFail?: () => void;
 onReady?: () => void;
};

type Prepared = {
 key: string; geo: FacadeGeo; mosaic: Mosaic; n: number;
 hx: Float32Array; hy: Float32Array; tin: Float32Array; dropX: Float32Array; dropY: Float32Array; rot0: Float32Array;
 day: Float32Array; night: Float32Array; lit: Float32Array; tone: Float32Array; gloss: Float32Array;
 win: Int16Array; star: Uint8Array; moon: Uint8Array; glass: Uint8Array; winIds: string[];
};

const TILE = 11, GROUT = 2;
const cache = new Map<string, Prepared>();
let lastDispose = -1e9;

function prepare(WW: number, cxFrac: number): Prepared {
 const key = `${WW}|${cxFrac.toFixed(3)}`;
 const hit = cache.get(key);
 if (hit) return hit;
 const { design, geo } = createFacade(WW, WW * cxFrac);
 const t0 = performance.now();
 const mosaic = buildMosaic(design, { tile: TILE, grout: GROUT, seed: 7, fillers: [0.72, 0.5] });
 for (const [name, pal] of Object.entries(PALETTES)) mosaic.sample(name, paletteFn(pal));
 if (import.meta.env.DEV) console.info(`мозаика ${WW}×${WH}: ${mosaic.tiles.length} плиток, ${mosaic.buildMs.toFixed(0)} мс раскладка, ${(performance.now() - t0).toFixed(0)} мс всего, t=${performance.now().toFixed(0)}`);
 const tiles = mosaic.tiles, n = tiles.length;
 const f32 = (k = 1) => new Float32Array(n * k);
 const P: Prepared = {
  key, geo, mosaic, n, hx: f32(), hy: f32(), tin: f32(), dropX: f32(), dropY: f32(), rot0: f32(),
  day: f32(3), night: f32(3), lit: f32(3), tone: f32(3), gloss: f32(), win: new Int16Array(n).fill(-1),
  star: new Uint8Array(n), moon: new Uint8Array(n), glass: new Uint8Array(n), winIds: [],
 };
 const winIndex = new Map<string, number>();
 const maxD = Math.hypot(Math.max(geo.cx, WW - geo.cx) * 1.15, WH);
 tiles.forEach((t, i) => {
  const rr = mulberry32(t.id * 7919 + 13);
  const [base, wid] = t.key.split(':');
  let v = 0.93 + rr() * 0.14;
  if (base === 'brick' || base === 'brickTower' || base === 'portalWall') {
   const row = Math.floor(t.y / 13), cell = Math.floor((t.x + (row % 2) * 13) / 26);
   v = 0.9 + hash1(row * 977 + cell * 131) * 0.16 + (rr() - 0.5) * 0.05;
  }
  P.tone[i * 3] = v * (1 + (rr() - 0.5) * 0.05); P.tone[i * 3 + 1] = v * (1 + (rr() - 0.5) * 0.04); P.tone[i * 3 + 2] = v * (1 + (rr() - 0.5) * 0.06);
  P.hx[i] = t.x; P.hy[i] = t.y;
  const u = clamp(Math.hypot((t.x - geo.rose.x) * 1.15, t.y - geo.rose.y) / maxD);
  P.tin[i] = 0.1 + Math.pow(u, 0.85) * 1.9 + noise2(t.x / 150, t.y / 150, 3) * 0.3 + rr() * 0.14;
  P.dropX[i] = (rr() - 0.5) * 70; P.dropY[i] = -(90 + rr() * 170); P.rot0[i] = (rr() - 0.5) * 1.6;
  for (let k = 0; k < 3; k++) { P.day[i * 3 + k] = t.col.day[k]; P.night[i * 3 + k] = t.col.night[k]; P.lit[i * 3 + k] = t.col.lit[k]; }
  const glassy = base.startsWith('glass') || base === 'doorGlass';
  P.glass[i] = glassy ? 1 : 0;
  P.gloss[i] = glassy ? 0.8 : base === 'sun' ? 0.7 : base === 'coping' || base === 'metal' || base === 'pipe' ? 0.35 : 0.15;
  if (glassy || base === 'lampGlass') {
   const id = base === 'doorGlass' ? 'DOOR' : base === 'lampGlass' ? 'LAMP' : wid;
   let w = winIndex.get(id);
   if (w === undefined) { w = P.winIds.length; winIndex.set(id, w); P.winIds.push(id); }
   P.win[i] = w;
  }
  if (base === 'sun') P.moon[i] = 1;
  if ((base === 'sky' || base === 'skyLow') && t.y < 380 && Math.hypot(t.x - geo.sun.x, t.y - geo.sun.y) > geo.sun.r + 40 && rr() < 0.05) P.star[i] = 1;
 });
 cache.set(key, P);
 if (cache.size > 3) cache.delete(cache.keys().next().value!);
 return P;
}

type Wave = { x: number; y: number; t0: number };

export class MosaicScene {
 private r: TileRenderer | null = null;
 private ctx2d: CanvasRenderingContext2D | null = null;
 private P: Prepared | null = null;
 private cam: Cam = { zoom: 1, x: 0, y: 0 };
 private raf = 0; private last = 0; private t = 0; private buildTimer = 0;
 private ox = new Float32Array(0); private oy = new Float32Array(0); private vx = new Float32Array(0); private vy = new Float32Array(0);
 private hov = new Float32Array(0); private rest = new Float32Array(0); private fromX = new Float32Array(0); private fromY = new Float32Array(0);
 private lost = new Uint8Array(0); private dirty = new Uint8Array(0); private flip = new Float32Array(0); private fall = new Float32Array(0);
 private winBase = new Uint8Array(0); private winUntil = new Float32Array(0); private winK = new Float32Array(0);
 private lostTotal = 0; private lostDone = 0; private restoredAt = -1;
 private px = 0; private py = 0; private pvx = 0; private pvy = 0; private pActive = false; private pSpeed = 0; private lastMove = -10; private lastPx = 0; private lastPy = 0;
 private waves: Wave[] = [];
 private mode: LightMode = 'cycle'; private nightK = 0;
 private settle = 0; private skip = 0; private builtAspect = 1; private builtCx = 0.5;
 private col = new Float32Array(3);
 private observer: ResizeObserver;
 private disposed = false;
 private readonly handlers: [string, EventListener][];

 constructor(private o: SceneOptions) {
  try { this.r = new TileRenderer(o.canvas); }
  catch { this.ctx2d = o.canvas.getContext('2d'); if (!this.ctx2d) o.onFail?.(); }
  o.canvas.addEventListener('webglcontextlost', this.contextLost);
  const move = (e: PointerEvent) => this.pointer(e, false);
  const down = (e: PointerEvent) => this.pointer(e, true);
  const leave = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.type === 'pointerleave') this.pActive = false; };
  this.handlers = [['pointermove', move as EventListener], ['pointerdown', down as EventListener], ['pointerleave', leave as EventListener], ['pointerup', leave as EventListener], ['pointercancel', leave as EventListener]];
  for (const [type, fn] of this.handlers) o.target.addEventListener(type, fn, { passive: true });
  this.observer = new ResizeObserver(() => this.layout());
  this.observer.observe(o.host);
  this.layout();
  document.addEventListener('visibilitychange', this.visibility);
 }

 setLighting(mode: LightMode) {
  this.mode = mode;
  if (this.o.reduced || this.t < 0.05) this.nightK = mode === 'night' ? 1 : mode === 'day' ? 0 : this.nightK;
 }

 dispose() {
  this.disposed = true;
  cancelAnimationFrame(this.raf); clearTimeout(this.buildTimer);
  this.observer.disconnect();
  document.removeEventListener('visibilitychange', this.visibility);
  this.o.canvas.removeEventListener('webglcontextlost', this.contextLost);
  for (const [type, fn] of this.handlers) this.o.target.removeEventListener(type, fn);
  lastDispose = performance.now();
 }

 private contextLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(this.raf); this.r = null; this.o.onFail?.(); };
 private visibility = () => { if (!document.hidden) { this.last = performance.now(); this.loop(); } };

 private layout() {
  const box = this.o.host.getBoundingClientRect();
  if (box.width < 40 || box.height < 40 || this.disposed) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  const cw = Math.round(box.width * dpr), ch = Math.round(box.height * dpr);
  if (this.o.canvas.width !== cw || this.o.canvas.height !== ch) { this.o.canvas.width = cw; this.o.canvas.height = ch; }
  const aspect = box.width / box.height;
  const safe = clamp(this.o.safeLeft(), 0, 0.6);
  const cxFrac = safe > 0.05 ? clamp((safe + 1) / 2 + 0.02, 0.55, 0.74) : 0.5;
  this.lastMove = this.t;
  // Небольшое изменение окна не требует новой раскладки: камера «накрывает» готовую мозаику.
  if (this.P) {
   this.fit();
   if (Math.abs(aspect / this.builtAspect - 1) < 0.16 && Math.abs(cxFrac - this.builtCx) < 0.06) { clearTimeout(this.buildTimer); return; }
  }
  const WW = clamp(Math.round(WH * aspect / 26) * 26, 700, 3200);
  clearTimeout(this.buildTimer);
  if (this.P) { this.buildTimer = window.setTimeout(() => this.rebuild(WW, cxFrac, safe, aspect), 400); return; }
  // Первая раскладка — через два кадра, когда карточка интерфейса уже приняла свой размер.
  this.buildTimer = window.setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (!this.P) this.layoutAndBuild(); })), 0);
 }

 private layoutAndBuild() {
  const box = this.o.host.getBoundingClientRect();
  if (box.width < 40 || box.height < 40 || this.disposed) return;
  const aspect = box.width / box.height, safe = clamp(this.o.safeLeft(), 0, 0.6);
  const cxFrac = safe > 0.05 ? clamp((safe + 1) / 2 + 0.02, 0.55, 0.74) : 0.5;
  this.rebuild(clamp(Math.round(WH * aspect / 26) * 26, 700, 3200), cxFrac, safe, aspect);
 }

 /** Камера «cover»: мозаика заполняет холст; лишнее срезается сверху (небо), тротуар остаётся. */
 private fit() {
  const P = this.P; if (!P) return;
  const cw = this.o.canvas.width, ch = this.o.canvas.height;
  const zoom = Math.max(cw / P.geo.W, ch / WH);
  this.cam = { zoom, x: P.geo.W / 2, y: WH - ch / zoom / 2 };
 }

 private rebuild(WW: number, cxFrac: number, safe: number, aspect: number) {
  if (this.disposed) return;
  const first = !this.P;
  try { this.P = prepare(WW, cxFrac); } catch { this.o.onFail?.(); return; }
  this.builtAspect = aspect; this.builtCx = cxFrac;
  this.fit();
  this.o.onReady?.();
  const n = this.P.n;
  this.ox = new Float32Array(n); this.oy = new Float32Array(n); this.vx = new Float32Array(n); this.vy = new Float32Array(n);
  this.hov = new Float32Array(n); this.rest = new Float32Array(n); this.fromX = new Float32Array(n); this.fromY = new Float32Array(n);
  this.lost = new Uint8Array(n); this.dirty = new Uint8Array(n); this.flip = new Float32Array(n).fill(-1); this.fall = new Float32Array(n).fill(-1);
  const wn = this.P.winIds.length;
  this.winBase = new Uint8Array(wn); this.winUntil = new Float32Array(wn).fill(-1); this.winK = new Float32Array(wn);
  const rr = mulberry32(Date.now() & 0xffff);
  for (let w = 0; w < wn; w++) this.winBase[w] = rr() < 0.58 || this.P.winIds[w] === 'DOOR' || this.P.winIds[w] === 'LAMP' ? 1 : 0;
  // Сборка проигрывается при каждом показе заставки; перестройка из-за размера окна её не повторяет.
  // Быстрое пересоздание (StrictMode в разработке) тоже не считается новым показом.
  const quick = this.o.reduced || performance.now() - lastDispose < 1200;
  this.t = first ? (quick ? 3 : 0) : Math.max(this.t, 3);
  this.lastMove = this.t;
  this.damage(safe, false);
  this.nightK = this.mode === 'night' ? 1 : this.mode === 'day' ? 0 : this.nightK;
  this.last = performance.now();
  this.loop();
 }

 private builtSafe() { return this.builtCx > 0.52 ? clamp(this.builtCx * 2 - 1.04, 0, 0.6) : 0; }

 /** Утраты: несколько пятен смальты выпали, края пятен потускнели. */
 private damage(safe: number, animate: boolean) {
  const P = this.P!, rr = mulberry32((Date.now() / 7) & 0xffffff);
  const W = P.geo.W, x0 = safe * W + 90, x1 = W - 60;
  const spots: { x: number; y: number; r: number }[] = [];
  const want = W > 1500 ? 5 : 3;
  for (let tries = 0; spots.length < want && tries < 200; tries++) {
   const s = { x: lerp(x0, x1, rr()), y: lerp(470, 1230, rr()), r: 44 + rr() * 30 };
   if (Math.abs(s.x - P.geo.rose.x) < 60 && Math.abs(s.y - P.geo.rose.y) < 60) continue;
   if (spots.every(o => Math.hypot(o.x - s.x, o.y - s.y) > 230)) spots.push(s);
  }
  this.lostTotal = 0; this.lostDone = 0; this.restoredAt = -1;
  for (let i = 0; i < P.n; i++) {
   this.lost[i] = 0; this.dirty[i] = 0; this.flip[i] = -1;
   for (const s of spots) {
    const k = Math.hypot(P.hx[i] - s.x, P.hy[i] - s.y) / (s.r * (0.78 + 0.44 * noise2(P.hx[i] / 38, P.hy[i] / 38, 9)));
    if (k < 1) {
     if (k < 0.6 && hash1(i * 31 + 7) < 0.9) { this.lost[i] = 1; this.rest[i] = -1; this.lostTotal++; if (animate) this.fall[i] = this.t + k * 0.3; }
     else this.dirty[i] = 1;
     break;
    }
   }
  }
  this.o.onRestore?.(0, this.lostTotal);
 }

 private pointer(e: PointerEvent, down: boolean) {
  if (!this.P) return;
  const box = this.o.canvas.getBoundingClientRect();
  const sx = e.clientX - box.left, sy = e.clientY - box.top;
  const inside = sx >= 0 && sy >= 0 && sx <= box.width && sy <= box.height;
  if (!inside) { this.pActive = false; return; }
  const dpr = this.o.canvas.width / box.width;
  const wx = (sx * dpr - this.o.canvas.width / 2) / this.cam.zoom + this.cam.x, wy = (sy * dpr - this.o.canvas.height / 2) / this.cam.zoom + this.cam.y;
  const speed = Math.hypot(wx - this.lastPx, wy - this.lastPy);
  if (!down && speed < 200) { this.pvx = this.pvx * 0.5 + (wx - this.lastPx) * 0.5; this.pvy = this.pvy * 0.5 + (wy - this.lastPy) * 0.5; }
  this.lastPx = wx; this.lastPy = wy;
  this.pSpeed = Math.min(1, this.pSpeed * 0.7 + speed / 60);
  this.px = wx; this.py = wy; this.pActive = e.pointerType === 'mouse' || e.buttons > 0 || down; this.lastMove = this.t;
  if (down) {
   const el = e.target as HTMLElement | null;
   if (!el?.closest?.('button,a,input,label,select,.hero-copy,.location-tag,.journey-strip')) this.waves.push({ x: wx, y: wy, t0: this.t });
  }
 }

 private loop = () => {
  cancelAnimationFrame(this.raf);
  if (this.disposed || document.hidden || !this.P) return;
  this.raf = requestAnimationFrame(now => {
   const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
   this.last = now;
   this.t += dt;
   // В покое рисуем реже: мерцание стекла и звёзд не требует 60 кадров.
   const idle = this.t - this.lastMove > 5 && this.settle < 0.05 && !this.waves.length && this.t > 3.2;
   if (!(idle && (this.skip = (this.skip + 1) % 3) !== 0)) this.frame(dt * (idle ? 3 : 1));
   this.loop();
  });
 };

 private frame(dt: number) {
  const P = this.P!, t = this.t, reduced = this.o.reduced;
  // день/ночь
  // «День → ночь»: 10 с день, 6 с сумерки, 10 с ночь с огнями, 6 с рассвет.
  const ph = t % 32;
  const target = this.mode === 'night' ? 1 : this.mode === 'day' ? 0 : ph < 10 ? 0 : ph < 16 ? smooth((ph - 10) / 6) : ph < 26 ? 1 : 1 - smooth((ph - 26) / 6);
  this.nightK += clamp(target - this.nightK, -dt * 0.45, dt * 0.45);
  const night = smooth(clamp(this.nightK));
  // окна: базовый свет ночью + зажжённые курсором
  for (let w = 0; w < this.winK.length; w++) {
   const want = night > 0.35 && (this.winBase[w] || this.winUntil[w] > t) ? 1 : this.winUntil[w] > t ? 0.8 : 0;
   this.winK[w] += clamp(want - this.winK[w], -dt * 1.6, dt * 2.4);
  }
  this.pSpeed *= 0.94; this.pvx *= 0.85; this.pvy *= 0.85;
  // Радиус и сила отклика: плитку расталкивает от курсора и уносит следом за движением.
  const R = 150, R2 = R * R, K = 3600 * (0.75 + 0.6 * this.pSpeed), wake = 150;
  const pvx = this.pvx, pvy = this.pvy;
  const active = this.pActive && !reduced;
  const px = this.px, py = this.py;
  const waves = this.waves = this.waves.filter(w => (t - w.t0) * 1100 < 2600);
  const r = this.r;
  r?.begin();
  const col = this.col;
  let settle = 0, restoredNow = 0;
  const decay = Math.pow(0.02, dt);
  const sweep = (t * 300) % (P.geo.W + 1400) - 700;
  const assembly = !reduced && t < 3;
  const grout = mixRgb(mixRgb([58, 48, 42], [12, 15, 38], night), [26, 26, 26], 1 - smooth(clamp(t / 1.8)));
  const draw2d = this.ctx2d;
  if (draw2d) { draw2d.setTransform(1, 0, 0, 1, 0, 0); draw2d.fillStyle = `rgb(${grout[0] | 0},${grout[1] | 0},${grout[2] | 0})`; draw2d.fillRect(0, 0, this.o.canvas.width, this.o.canvas.height); }
  for (let i = 0; i < P.n; i++) {
   const hx = P.hx[i], hy = P.hy[i];
   let x = hx, y = hy, scale = 1, rot = 0, alpha = 1, lift = 0, glint = 0, emissive = 0;
   if (assembly) {
    const u = clamp((t - P.tin[i]) / 0.5);
    if (u <= 0) continue;
    const e = easeOutCubic(u);
    x += P.dropX[i] * (1 - e); y += P.dropY[i] * (1 - e) * (1 - e);
    scale = lerp(1.6, 1, e); rot = P.rot0[i] * (1 - e); alpha = clamp(u * 3.5); lift = 1 - e;
   }
   // утраты: выпавшая смальта возвращается под курсором
   if (this.lost[i]) {
    if (this.fall[i] >= 0 && t < this.fall[i] + 0.7) {
     const f = clamp((t - this.fall[i]) / 0.7);
     if (f > 0) { y += f * f * 140; rot += f * 2 * (P.rot0[i] || 0.5); alpha *= 1 - f; lift = Math.max(lift, f); }
    } else if (this.rest[i] < 0) {
     const dx = hx - px, dy = hy - py;
     if (active && dx * dx + dy * dy < R2 * 0.8) { this.rest[i] = t + Math.sqrt(dx * dx + dy * dy) / R * 0.18; this.fromX[i] = px + (hash1(i) - 0.5) * 60; this.fromY[i] = py + (hash1(i + 9) - 0.5) * 60; }
     for (const w of waves) {
      const d = Math.hypot(hx - w.x, hy - w.y);
      if (d < 320 && (t - w.t0) * 1100 > d) { this.rest[i] = t + 0.02; this.fromX[i] = w.x; this.fromY[i] = w.y; }
     }
     if (this.rest[i] < 0) continue;
    }
    if (this.rest[i] >= 0) {
     const ru = clamp((t - this.rest[i]) / 0.5);
     if (ru <= 0) continue;
     if (ru >= 1 && this.lost[i] === 1) { this.lost[i] = 2; restoredNow++; }
     const e = easeOutBack(ru);
     x = lerp(this.fromX[i], hx, e); y = lerp(this.fromY[i], hy, e);
     scale *= lerp(1.5, 1, clamp(e)); rot += (1 - clamp(e)) * 2.4 * (P.rot0[i] || 0.6); lift = Math.max(lift, 1 - ru);
     glint = Math.max(glint, ru < 1 ? 0.5 + (1 - ru) * 0.8 : Math.max(0, 1 - (t - this.rest[i] - 0.5) / 0.8) * 0.7);
    }
   }
   // отклик на курсор: расталкивание с пружиной, подъём и подсветка
   let dx = hx - px, dy = hy - py;
   const d2 = dx * dx + dy * dy;
   let h = this.hov[i] * decay;
   if (active && d2 < R2) {
    const d = Math.sqrt(d2) || 1, f = 1 - d / R;
    this.vx[i] += ((dx / d) * f * f * K + pvx * f * wake) * dt; this.vy[i] += ((dy / d) * f * f * K + pvy * f * wake) * dt;
    h = Math.max(h, f);
    if (this.dirty[i] && this.flip[i] < 0) this.flip[i] = t;
    if (P.win[i] >= 0 && night > 0.2) this.winUntil[P.win[i]] = t + 9;
   }
   for (const w of waves) {
    const d = Math.hypot(hx - w.x, hy - w.y), k = 1 - Math.abs(d - (t - w.t0) * 1100) / 90;
    if (k > 0) {
     const fade = clamp(1 - d / 2200);
     // гребень волны выталкивает плитку наружу, она пружинит обратно на место
     const kick = k * fade * 1500 * dt / (d || 1);
     this.vx[i] += (hx - w.x) * kick; this.vy[i] += (hy - w.y) * kick;
     h = Math.max(h, k * 0.9 * fade); rot += k * fade * (P.rot0[i] || 0.4) * 1.2;
     if (this.dirty[i] && this.flip[i] < 0 && d < 420) this.flip[i] = t;
    }
   }
   this.hov[i] = h;
   let ox = this.ox[i], oy = this.oy[i];
   if (ox !== 0 || oy !== 0 || this.vx[i] !== 0 || this.vy[i] !== 0) {
    let vx = this.vx[i], vy = this.vy[i];
    vx += (-110 * ox - 13 * vx) * dt; vy += (-110 * oy - 13 * vy) * dt;
    ox += vx * dt; oy += vy * dt;
    const m = Math.hypot(ox, oy);
    if (m > 38) { ox *= 38 / m; oy *= 38 / m; }
    if (Math.abs(ox) + Math.abs(oy) < 0.02 && Math.abs(vx) + Math.abs(vy) < 0.05) { ox = oy = vx = vy = 0; }
    this.ox[i] = ox; this.oy[i] = oy; this.vx[i] = vx; this.vy[i] = vy;
    settle = Math.max(settle, Math.abs(ox) + Math.abs(oy));
    x += ox; y += oy;
   }
   if (h > 0.01) {
    settle = Math.max(settle, h);
    lift = Math.max(lift, h * 0.9); scale *= 1 + h * 0.12; rot += (P.rot0[i]) * h * 0.35;
   }
   // цвет: день → ночь волной сверху вниз, окна и фонари загораются
   const nk = smooth(clamp(night * 1.35 - (hy / WH) * 0.35));
   const i3 = i * 3;
   col[0] = lerp(P.day[i3], P.night[i3], nk); col[1] = lerp(P.day[i3 + 1], P.night[i3 + 1], nk); col[2] = lerp(P.day[i3 + 2], P.night[i3 + 2], nk);
   const w = P.win[i];
   if (w >= 0 && this.winK[w] > 0) {
    const lk = smooth(clamp(this.winK[w])) * Math.max(nk, this.winUntil[w] > t ? 0.85 : 0);
    col[0] = lerp(col[0], P.lit[i3], lk); col[1] = lerp(col[1], P.lit[i3 + 1], lk); col[2] = lerp(col[2], P.lit[i3 + 2], lk);
    emissive = lk * 0.85;
   }
   if (P.star[i] && nk > 0) {
    const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + hash1(i) * 1.6) * 2.4 + hash1(i + 3) * 6.28);
    const sc: RGB = hash1(i + 5) < 0.6 ? [255, 214, 110] : [235, 240, 255];
    const m = nk * (0.55 + 0.45 * tw);
    col[0] = lerp(col[0], sc[0], m); col[1] = lerp(col[1], sc[1], m); col[2] = lerp(col[2], sc[2], m);
    emissive = nk * 0.9; glint = Math.max(glint, nk * tw * 0.35);
   }
   if (P.moon[i] && nk > 0) emissive = nk * 0.9;
   // потускневшие края утрат: переворачиваются чистой стороной
   if (this.dirty[i]) {
    const f = this.flip[i];
    const rk = f < 0 ? 0 : clamp((t - f) / 0.36);
    if (rk < 0.5) { const g = mixRgb(desat([col[0], col[1], col[2]], 0.8), [205, 198, 184], 0.35); col[0] = g[0]; col[1] = g[1]; col[2] = g[2]; }
    if (rk > 0) { scale *= 1 - Math.sin(rk * Math.PI) * 0.85; if (rk > 0.5 && rk < 1) glint = Math.max(glint, (1 - rk) * 0.9); }
    if (rk >= 1) this.dirty[i] = 0;
   }
   const bright = 1 + h * 0.3;
   col[0] *= P.tone[i3] * bright; col[1] *= P.tone[i3 + 1] * bright; col[2] *= P.tone[i3 + 2] * bright;
   if (P.glass[i]) {
    if (night < 1) { const d = Math.abs(hx * 0.8 + hy * 0.45 - sweep); if (d < 70) glint = Math.max(glint, (1 - d / 70) * 0.32 * (1 - night)); }
    glint = Math.max(glint, h * 0.55);
   }
   if (r) r.push(x, y, P.mosaic.tiles[i].pts, col, alpha, scale, rot, P.mosaic.tiles[i].a, lift, P.gloss[i], P.mosaic.tiles[i].rnd2, glint, emissive);
   else if (draw2d) this.draw2dTile(draw2d, P.mosaic.tiles[i].pts, x, y, scale, rot, col, alpha, lift);
  }
  this.settle = settle;
  if (r) r.render(this.cam, grout);
  if (restoredNow) {
   this.lostDone += restoredNow;
   this.o.onRestore?.(this.lostDone, this.lostTotal);
   if (this.lostDone >= this.lostTotal) this.restoredAt = t;
  }
  // Для следующего посетителя: через минуту покоя фасад снова «ждёт реставратора».
  if (this.restoredAt >= 0 && t - this.restoredAt > 60 && t - this.lastMove > 25) this.damage(this.builtSafe(), true);
 }

 private draw2dTile(c: CanvasRenderingContext2D, pts: Float32Array, x: number, y: number, s: number, rot: number, col: Float32Array, a: number, lift: number) {
  const z = this.cam.zoom, ox = this.o.canvas.width / 2 - this.cam.x * z, oy = this.o.canvas.height / 2 - this.cam.y * z;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  c.globalAlpha = a;
  c.beginPath();
  for (let k = 0; k < 4; k++) {
   const u = pts[k * 2] * s, v = pts[k * 2 + 1] * s;
   const X = (x + u * cs - v * sn) * z + ox, Yy = (y + u * sn + v * cs) * z + oy + lift * 3;
   if (k) c.lineTo(X, Yy); else c.moveTo(X, Yy);
  }
  c.fillStyle = `rgb(${Math.min(255, col[0]) | 0},${Math.min(255, col[1]) | 0},${Math.min(255, col[2]) | 0})`;
  c.fill();
  c.globalAlpha = 1;
 }
}
