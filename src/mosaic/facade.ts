// Фасад главного корпуса типографии И. Д. Сытина (Пятницкая, 71/5с1) — эскиз для мозаики.
// Основа — фотографии public/images/sytin-*.{webp,jpg} и наблюдения FACADE-RESEARCH.md:
// • кирпичные лопатки во всю высоту верхних этажей, над парапетом — столбики со светлыми шапками;
// • между лопатками светлые оштукатуренные простенки со ступенчатыми кирпичными консолями,
//   парные окна с фрамугой и широкий верхний ряд;
// • первый этаж кирпичный, с большими окнами, над ним светлый карниз;
// • центральный ризалит: гранёные пилоны с зубчатыми шапками, стрельчатый портал с круглым окном
//   и полуарочными окнами, деревянный вход с криволинейными плечами; выше — тройные окна,
//   большое полуциркульное окно и аттик с тремя арочными нишами и криволинейными плечами.
// Это художественное упрощение, не обмерный чертёж. Размеры кратны шагу смальты (~13 ед.).
import type { Design, Painter } from './build';

export const WH = 1400;

export const Y = {
 atticTop: 214, atticBlock: 250, shoulder: 330,
 pilTop: 398, parapet: 432, panelTop: 444,
 floors: [474, 622, 770, 918] as const, winH: 104,
 cornice: 1040, groundWin: 1098, groundWinB: 1236,
 plinth: 1262, pave: 1290, kerb: 1370, road: 1384,
 pylonTop: 800, apex: 872, spring: 972, doorTop: 992,
};
const PIL = 48, PANEL = 212, BAY = PIL + PANEL;
const RW = 300; // полуширина ризалита
const M = 10; // переплёт

type Win = { id: string; x: number; y: number; w: number; h: number };
export type FacadeGeo = {
 W: number; H: number; cx: number;
 rose: { x: number; y: number; r: number };
 sun: { x: number; y: number; r: number };
 lamps: { x: number; top: number }[];
 windows: { id: string; x: number; y: number; w: number; h: number }[];
 clouds: [number, number, number][];
 panels: { x0: number; x1: number }[];
};

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { c.fillRect(x, y, w, h); }
function archPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
 const r = w / 2;
 c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath();
}
function pointedArch(c: CanvasRenderingContext2D, x0: number, x1: number, apexY: number, springY: number, bottomY: number) {
 const w = x1 - x0, R = w * 0.78, cxL = x0 + R, cxR = x1 - R;
 const hgt = Math.sqrt(R * R - (w / 2) * (w / 2)), k = (springY - apexY) / hgt;
 c.beginPath(); c.moveTo(x0, bottomY); c.lineTo(x0, springY);
 const a1 = Math.PI + Math.acos((w / 2) / R);
 for (let i = 1; i <= 40; i++) { const a = Math.PI + (a1 - Math.PI) * (i / 40); c.lineTo(cxL + R * Math.cos(a), springY + R * Math.sin(a) * k); }
 const b0 = -Math.acos((w / 2) / R);
 for (let i = 0; i <= 40; i++) { const a = b0 * (1 - i / 40); c.lineTo(cxR + R * Math.cos(a), springY + R * Math.sin(a) * k); }
 c.lineTo(x1, bottomY); c.closePath();
}

/** Окно с переплётом: рама, стёкла (своя метка на окно — для ночного света), отражение, подоконник. */
function gridWindow(p: Painter, win: Win, cols: number, opt: { transom?: number; arch?: boolean; sill?: string | false; rows?: number } = {}) {
 const { ctx } = p, { x, y, w, h, id } = win;
 if (opt.sill !== false) { ctx.fillStyle = p.col(opt.sill || 'coping'); rect(ctx, x - 8, y + h, w + 16, 9); }
 ctx.fillStyle = p.col('frame');
 if (opt.arch) { archPath(ctx, x, y, w, h); ctx.fill(); } else rect(ctx, x, y, w, h);
 const ix = x + M, iy = y + M, iw = w - 2 * M, ih = h - 2 * M;
 const tr = opt.transom ? Math.round(ih * opt.transom) : 0;
 const rows = opt.rows ?? 1;
 const pw = (iw - (cols - 1) * M) / cols;
 const lowerY = iy + (tr ? tr + M : 0), lowerH = ih - (tr ? tr + M : 0);
 const ph = (lowerH - (rows - 1) * M) / rows;
 const panes: [number, number, number, number][] = [];
 for (let c = 0; c < cols; c++) {
  if (tr) panes.push([ix + c * (pw + M), iy, pw, tr]);
  for (let r = 0; r < rows; r++) panes.push([ix + c * (pw + M), lowerY + r * (ph + M), pw, ph]);
 }
 ctx.save();
 if (opt.arch) { archPath(ctx, ix, iy, iw, ih); ctx.clip(); }
 ctx.fillStyle = p.grad(`glass:${id}`, `glassLo:${id}`, 0, iy, 0, iy + ih);
 for (const q of panes) rect(ctx, ...q);
 ctx.beginPath(); for (const q of panes) ctx.rect(...q); ctx.clip();
 ctx.fillStyle = p.col(`glassHi:${id}`);
 ctx.beginPath();
 const s = w * 0.5;
 ctx.moveTo(x + w * 0.06, y + h * 0.62); ctx.lineTo(x + w * 0.06 + s, y + h * 0.62 - s * 1.3);
 ctx.lineTo(x + w * 0.06 + s + 18, y + h * 0.62 - s * 1.3); ctx.lineTo(x + w * 0.06 + 18, y + h * 0.62); ctx.closePath(); ctx.fill();
 ctx.restore();
}

export function createFacade(W: number, cx: number, seed = 1): { design: Design; geo: FacadeGeo } {
 cx = Math.round(cx);
 const panels: { x0: number; x1: number }[] = [];
 const pilasters: number[] = [];
 // Крылья: от ризалита наружу — простенок, лопатка, простенок…
 for (const dir of [-1, 1]) {
  let edge = cx + dir * RW;
  for (let n = 0; n < 40; n++) {
   const x0 = dir < 0 ? edge - PANEL : edge, x1 = x0 + PANEL;
   if (x1 < -BAY || x0 > W + BAY) break;
   panels.push({ x0, x1 });
   const px = dir < 0 ? x0 - PIL : x1;
   pilasters.push(px);
   edge = dir < 0 ? px : px + PIL;
  }
 }
 const inView = (x0: number, x1: number) => x1 > -20 && x0 < W + 20;
 let wi = 0;
 const upper: { win: Win; cols: number; transom: number }[] = [];
 const ground: Win[] = [];
 for (const pn of panels) {
  if (!inView(pn.x0, pn.x1)) continue;
  const mid = (pn.x0 + pn.x1) / 2;
  Y.floors.forEach((fy, level) => {
   if (level === 0) upper.push({ win: { id: `u${wi++}`, x: mid - 88, y: fy, w: 176, h: Y.winH }, cols: 3, transom: 0.3 });
   else for (const s of [-1, 1]) upper.push({ win: { id: `u${wi++}`, x: mid + (s < 0 ? -90 : 10), y: fy, w: 80, h: Y.winH }, cols: 2, transom: 0.28 });
  });
  ground.push({ id: `g${wi++}`, x: mid - 86, y: Y.groundWin, w: 172, h: Y.groundWinB - Y.groundWin });
 }
 // Центр: тройные окна (3 и 4 этажи), узкие арочные окна над пилонами, полуциркульное окно.
 const centerTriples: Win[] = [];
 for (const [k, fy] of [[0, 622], [1, 748]] as const) for (let i = 0; i < 3; i++) centerTriples.push({ id: `c${k}${i}`, x: cx - 96 + i * 66, y: fy, w: 58, h: 102 });
 const towerWins: Win[] = [];
 for (const s of [-1, 1]) for (const fy of [Y.floors[0], Y.floors[1]]) towerWins.push({ id: `t${s}${fy}`, x: cx + s * 184 - 22, y: fy + 4, w: 44, h: 96 });
 const bigArch = { x0: cx - 100, x1: cx + 100, top: 452, bottom: 598 };
 const rose = { x: cx, y: 930, r: 30 };

 const r0 = (n: number) => { const x = Math.sin(n * 91.7 + seed * 12.9) * 43758.5453; return x - Math.floor(x); };
 const sun = { x: W > 1500 ? W - 190 : Math.round(W * 0.8), y: 150, r: 62 };
 const clouds: [number, number, number][] = [];
 const cloudXs = W > 1500 ? [cx - 820, cx + 360] : [Math.round(W * 0.2)];
 cloudXs.forEach((x, i) => { if (x > 60 && x < W - 60) clouds.push([x, 120 + Math.round(r0(i) * 110), 1 + r0(i + 7) * 0.35]); });
 const lamps = [cx - 430, cx + 470].filter(x => x > 40 && x < W - 40).map(x => ({ x, top: 1048 }));

 const windowsGeo = [...upper.map(u => u.win), ...ground, ...centerTriples, ...towerWins,
  { id: 'BIG', x: bigArch.x0, y: bigArch.top, w: 200, h: bigArch.bottom - bigArch.top },
  { id: 'ROSE', x: rose.x - rose.r, y: rose.y - rose.r, w: rose.r * 2, h: rose.r * 2 }];

 const design: Design = {
  W, H: WH,
  flow(key) {
   const base = key.split(':')[0];
   switch (base) {
    case 'sky': return { bands: 3 };
    case 'brick': case 'pave': case 'road': return { bands: 0 };
    case 'brickDark': case 'brickLight': case 'cream': return { bands: 2 };
    default: return { bands: 99 };
   }
  },
  draw(p) {
   const { ctx } = p;
   // --- небо, солнце, облака
   ctx.fillStyle = p.grad('sky', 'skyLow', 0, 0, 0, Y.panelTop, [[0, 'sky'], [0.6, 'skyMid'], [1, 'skyLow']]);
   ctx.fillRect(0, 0, W, Y.panelTop + 20);
   ctx.fillStyle = p.col('sun');
   ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2); ctx.fill();
   ctx.fillStyle = p.col('cloud');
   for (const [x, y, s] of clouds) {
    ctx.beginPath();
    for (const [dx, dy, r] of [[-60, 18, 30], [-14, -6, 44], [44, 8, 36], [92, 24, 24], [-100, 30, 20]]) { ctx.moveTo(x + dx * s + r * s, y + dy); ctx.arc(x + dx * s, y + dy, r * s, 0, Math.PI * 2); }
    ctx.rect(x - 100 * s, y + 18, 192 * s, 32);
    ctx.fill();
   }

   // --- крылья: кирпичный массив, светлые простенки, лопатки над парапетом
   ctx.fillStyle = p.col('brick');
   rect(ctx, 0, Y.parapet, W, Y.plinth - Y.parapet);
   ctx.fillStyle = p.col('coping');
   rect(ctx, 0, Y.parapet, W, 12);
   for (const pn of panels) {
    ctx.fillStyle = p.col('cream');
    rect(ctx, pn.x0, Y.panelTop, PANEL, Y.cornice - Y.panelTop);
    // ступенчатые кирпичные консоли в верхних углах простенка
    ctx.fillStyle = p.col('brick');
    for (const [dx, w, h] of [[0, 26, 30], [0, 13, 58]]) { rect(ctx, pn.x0 + dx, Y.panelTop, w, h); rect(ctx, pn.x1 - w, Y.panelTop, w, h); }
   }
   for (const x of pilasters) {
    ctx.fillStyle = p.col('brick');
    rect(ctx, x, Y.pilTop, PIL, Y.parapet - Y.pilTop + 12);
    ctx.fillStyle = p.col('coping');
    rect(ctx, x - 5, Y.pilTop - 12, PIL + 10, 14);
   }
   // карниз над первым этажом
   ctx.fillStyle = p.col('coping'); rect(ctx, 0, Y.cornice, W, 26);
   ctx.fillStyle = p.col('corniceShade'); rect(ctx, 0, Y.cornice + 26, W, 12);
   // водосточные трубы — у каждой второй лопатки
   ctx.fillStyle = p.col('pipe');
   pilasters.forEach((x, i) => {
    if (i % 2) return;
    const px = x + PIL / 2 - 5;
    rect(ctx, px, Y.parapet + 12, 10, Y.plinth - Y.parapet - 6);
    ctx.beginPath(); ctx.moveTo(px - 10, Y.parapet + 12); ctx.lineTo(px + 20, Y.parapet + 12); ctx.lineTo(px + 12, Y.parapet + 40); ctx.lineTo(px - 2, Y.parapet + 40); ctx.closePath(); ctx.fill();
   });
   for (const u of upper) gridWindow(p, u.win, u.cols, { transom: u.transom });
   for (const g of ground) gridWindow(p, g, 3, { transom: 0.3, sill: 'brickDark' });

   // --- центральный ризалит
   ctx.fillStyle = p.col('brick');
   rect(ctx, cx - RW, Y.shoulder, RW * 2, Y.plinth - Y.shoulder);
   rect(ctx, cx - 170, Y.atticBlock, 340, Y.shoulder - Y.atticBlock + 10);
   rect(ctx, cx - 80, Y.atticTop, 160, Y.atticBlock - Y.atticTop + 10);
   // криволинейные плечи аттика с металлическим покрытием
   for (const s of [-1, 1]) {
    ctx.fillStyle = p.col('brick');
    ctx.beginPath(); ctx.moveTo(cx + s * 170, Y.atticBlock + 8); ctx.quadraticCurveTo(cx + s * 180, Y.shoulder - 8, cx + s * 236, Y.shoulder); ctx.lineTo(cx + s * 170, Y.shoulder + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.col('metal'); ctx.lineWidth = 12; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(cx + s * 170, Y.atticBlock + 2); ctx.quadraticCurveTo(cx + s * 180, Y.shoulder - 14, cx + s * 240, Y.shoulder - 6); ctx.stroke();
   }
   ctx.fillStyle = p.col('coping');
   rect(ctx, cx - 176, Y.atticBlock - 2, 96, 14); rect(ctx, cx + 80, Y.atticBlock - 2, 96, 14);
   rect(ctx, cx - 86, Y.atticTop - 2, 172, 14);
   // три арочные ниши аттика
   ctx.fillStyle = p.col('niche');
   for (const dx of [-62, 0, 62]) { archPath(ctx, cx + dx - 14, 286, 28, 118); ctx.fill(); }
   // широкие лопатки ризалита со ступенчатым верхом и тонкой нишей
   for (const s of [-1, 1]) {
    const x0 = s < 0 ? cx - RW : cx + 236;
    ctx.fillStyle = p.col('brick'); rect(ctx, x0, Y.shoulder - 12, 64, 40);
    ctx.fillStyle = p.col('coping'); rect(ctx, x0 - 6, Y.shoulder - 24, 76, 14); rect(ctx, x0 + 14, Y.shoulder - 50, 36, 28);
    ctx.fillStyle = p.col('niche'); rect(ctx, x0 + 26, 480, 12, 540);
   }
   // полуциркульное окно
   {
    const { x0, x1, top, bottom } = bigArch, w = x1 - x0, r = w / 2, ax = x0 + r, ay = top + r;
    ctx.fillStyle = p.col('coping');
    ctx.beginPath(); ctx.moveTo(x0 - 16, bottom + 10); ctx.lineTo(x0 - 16, ay); ctx.arc(ax, ay, r + 16, Math.PI, 0); ctx.lineTo(x1 + 16, bottom + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.col('frame'); archPath(ctx, x0, top, w, bottom - top); ctx.fill();
    ctx.save(); archPath(ctx, x0 + M, top + M, w - 2 * M, bottom - top - 2 * M); ctx.clip();
    ctx.fillStyle = p.grad('glass:BIG', 'glassLo:BIG', 0, top, 0, bottom); ctx.fillRect(x0, top, w, bottom - top);
    ctx.fillStyle = p.col('glassHi:BIG');
    ctx.beginPath(); ctx.moveTo(x0 + 12, bottom - 30); ctx.lineTo(x0 + 120, top + 20); ctx.lineTo(x0 + 150, top + 20); ctx.lineTo(x0 + 42, bottom - 30); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = p.col('frame'); ctx.lineWidth = M;
    ctx.beginPath();
    for (const a of [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75]) { ctx.moveTo(ax + Math.cos(a) * 38, ay + Math.sin(a) * 38); ctx.lineTo(ax + Math.cos(a) * r, ay + Math.sin(a) * r); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, ay, 38, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, ay + M / 2); ctx.lineTo(x1, ay + M / 2); ctx.moveTo(ax - 34, ay); ctx.lineTo(ax - 34, bottom); ctx.moveTo(ax + 34, ay); ctx.lineTo(ax + 34, bottom); ctx.stroke();
   }
   // пояс под полуциркульным окном и тройные окна центра
   ctx.fillStyle = p.col('coping'); rect(ctx, cx - 132, 606, 264, 10);
   for (const w of centerTriples) gridWindow(p, w, 1, { transom: 0.3, sill: false });
   ctx.fillStyle = p.col('coping'); rect(ctx, cx - 106, 850, 212, 10); rect(ctx, cx - 106, 724, 212, 10);
   for (const w of towerWins) gridWindow(p, w, 1, { arch: true, sill: false });

   // гранёные пилоны с зубчатыми шапками
   for (const s of [-1, 1]) {
    const x0 = s < 0 ? cx - 236 : cx + 132, x1 = x0 + 104;
    // тень пилона на стене ризалита
    ctx.fillStyle = p.col('niche'); rect(ctx, x1, Y.pylonTop + 20, 12, Y.plinth - Y.pylonTop - 20);
    ctx.fillStyle = p.col('brickTower'); rect(ctx, x0, Y.pylonTop, 104, Y.plinth - Y.pylonTop);
    // грани: светлая к свету (слева), тёмная справа — пилон читается гранёным
    ctx.fillStyle = p.col('brickLight'); rect(ctx, x0, Y.pylonTop + 24, 22, Y.plinth - Y.pylonTop - 24);
    ctx.fillStyle = p.col('brickDark'); rect(ctx, x1 - 22, Y.pylonTop + 24, 22, Y.plinth - Y.pylonTop - 24);
    ctx.fillStyle = p.col('coping');
    rect(ctx, x0 - 8, Y.pylonTop, 120, 18);
    for (let i = 0; i < 3; i++) rect(ctx, x0 - 8 + i * 49, Y.pylonTop - 26, 22, 28);
    rect(ctx, x0 - 8, Y.cornice - 4, 120, 30);
    ctx.fillStyle = p.col('brickDark'); rect(ctx, x0 - 10, Y.plinth - 70, 124, 70);
   }

   // стрельчатый портал
   {
    const x0 = cx - 128, x1 = cx + 128;
    ctx.fillStyle = p.col('brickDark'); pointedArch(ctx, x0, x1, Y.apex, Y.spring, Y.plinth); ctx.fill();
    ctx.fillStyle = p.col('coping'); pointedArch(ctx, x0 + 14, x1 - 14, Y.apex + 14, Y.spring, Y.plinth); ctx.fill();
    ctx.fillStyle = p.col('portalWall'); pointedArch(ctx, x0 + 26, x1 - 26, Y.apex + 28, Y.spring, Y.plinth); ctx.fill();
    // круглое окно и полуарочные окна
    ctx.fillStyle = p.col('frame'); ctx.beginPath(); ctx.arc(rose.x, rose.y, rose.r + 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.grad('glass:ROSE', 'glassLo:ROSE', 0, rose.y - rose.r, 0, rose.y + rose.r); ctx.beginPath(); ctx.arc(rose.x, rose.y, rose.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.col('glassHi:ROSE'); ctx.beginPath(); ctx.arc(rose.x - 9, rose.y - 10, rose.r * 0.4, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) {
     const wx = cx + s * 64;
     ctx.fillStyle = p.col('frame');
     ctx.beginPath(); ctx.moveTo(wx - 20, 992); ctx.lineTo(wx - 20, 940); ctx.quadraticCurveTo(wx - s * 18, 896, wx + 20, 912 - (s < 0 ? -6 : 6)); ctx.lineTo(wx + 20, 992); ctx.closePath(); ctx.fill();
     ctx.fillStyle = p.col('glass:ROSE');
     ctx.beginPath(); ctx.moveTo(wx - 9, 984); ctx.lineTo(wx - 9, 944); ctx.quadraticCurveTo(wx - s * 8, 914, wx + 9, 926); ctx.lineTo(wx + 9, 984); ctx.closePath(); ctx.fill();
    }
    // деревянный вход с криволинейными плечами
    const dx0 = cx - 100, dx1 = cx + 100;
    ctx.fillStyle = p.col('door');
    ctx.beginPath(); ctx.moveTo(dx0, Y.plinth); ctx.lineTo(dx0, Y.doorTop + 30); ctx.quadraticCurveTo(cx - 70, Y.doorTop + 28, cx - 50, Y.doorTop);
    ctx.lineTo(cx + 50, Y.doorTop); ctx.quadraticCurveTo(cx + 70, Y.doorTop + 28, dx1, Y.doorTop + 30); ctx.lineTo(dx1, Y.plinth); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.col('metal'); rect(ctx, cx - 54, Y.doorTop - 6, 108, 8);
    // фрамуга: три остеклённых секции
    ctx.fillStyle = p.col('doorGlass');
    for (const [x, w] of [[dx0 + 12, 44], [cx - 32, 64], [dx1 - 56, 44]] as const) rect(ctx, x, 1044, w, 42);
    // четыре вертикальных секции: стекло сверху, филёнки снизу
    const sw = (dx1 - dx0 - 50) / 4;
    for (let i = 0; i < 4; i++) {
     const x = dx0 + 10 + i * (sw + 10);
     ctx.fillStyle = p.col('doorGlass'); rect(ctx, x, 1100, sw, 78);
     ctx.fillStyle = p.col('doorPanel'); rect(ctx, x, 1190, sw, 62);
    }
    ctx.fillStyle = p.col('kerb'); rect(ctx, cx - 150, Y.plinth - 2, 300, 18);
   }

   // --- цоколь, тротуар, бордюр, проезжая часть
   ctx.fillStyle = p.col('brickDark'); rect(ctx, 0, Y.plinth, W, Y.pave - Y.plinth);
   ctx.fillStyle = p.col('kerb'); rect(ctx, cx - 150, Y.plinth - 2, 300, 20);
   ctx.fillStyle = p.grad('pave', 'paveLo', 0, Y.pave, 0, Y.kerb); rect(ctx, 0, Y.pave, W, Y.kerb - Y.pave);
   ctx.fillStyle = p.col('kerb'); rect(ctx, 0, Y.kerb, W, Y.road - Y.kerb);
   ctx.fillStyle = p.col('road'); rect(ctx, 0, Y.road, W, WH - Y.road);

   // --- фонари
   for (const { x, top } of lamps) {
    ctx.fillStyle = p.col('lamp');
    rect(ctx, x - 7, top + 64, 14, Y.kerb - top - 70); rect(ctx, x - 16, Y.kerb - 36, 32, 30);
    ctx.beginPath(); ctx.moveTo(x - 26, top + 4); ctx.lineTo(x + 26, top + 4); ctx.lineTo(x + 14, top - 16); ctx.lineTo(x - 14, top - 16); ctx.closePath(); ctx.fill();
    rect(ctx, x - 18, top + 52, 36, 14);
    ctx.fillStyle = p.col('lampGlass');
    ctx.beginPath(); ctx.moveTo(x - 22, top + 6); ctx.lineTo(x + 22, top + 6); ctx.lineTo(x + 14, top + 52); ctx.lineTo(x - 14, top + 52); ctx.closePath(); ctx.fill();
   }
  },
 };
 return { design, geo: { W, H: WH, cx, rose, sun, lamps, windows: windowsGeo, clouds, panels } };
}

const DAY = {
 sky: '#86b4d2', skyMid: '#a9cbdc', skyLow: '#ece2c8', sun: '#f7cd6a', cloud: '#fbf8f1',
 brick: '#c65740', brickTower: '#cc5b43', brickDark: '#a3432f', brickLight: '#dc7058', portalWall: '#c24f3a', niche: '#983b2a',
 coping: '#f5eedd', cream: '#ecdcbc', corniceShade: '#b9a684', metal: '#aeb7bd',
 frame: '#6a4230', pipe: '#c9d0d4', door: '#6e4a33', doorPanel: '#5a3b28', doorGlass: '#e9b35f',
 pave: '#b9b2a4', paveLo: '#a9a293', kerb: '#d6d0c2', road: '#6f6a64', lamp: '#3a3b40', lampGlass: '#f1e4b6',
 glass: '#7fa3b6', glassLo: '#5e8296', glassHi: '#a7c3cf',
};
const NIGHT: typeof DAY = {
 sky: '#141c55', skyMid: '#1d2872', skyLow: '#26358e', sun: '#f3e3a0', cloud: '#27347f',
 brick: '#5c2a33', brickTower: '#62303a', brickDark: '#44202a', brickLight: '#74394a', portalWall: '#582632', niche: '#3d1c26',
 coping: '#6d76a6', cream: '#434c7c', corniceShade: '#2a3163', metal: '#56608f',
 frame: '#21182a', pipe: '#5c6a9c', door: '#34222a', doorPanel: '#2a1b22', doorGlass: '#ffb64a',
 pave: '#2a3058', paveLo: '#222850', kerb: '#3a4170', road: '#171b3c', lamp: '#15172c', lampGlass: '#ffd466',
 glass: '#1f295e', glassLo: '#18204d', glassHi: '#27336f',
};
const LIT: typeof DAY = { ...NIGHT, glass: '#ffc65a', glassLo: '#f39c3c', glassHi: '#ffd88a' };
export const PALETTES = { day: DAY, night: NIGHT, lit: LIT };
export function paletteFn(pal: Record<string, string>) {
 return (key: string) => { const c = pal[key.split(':')[0]]; if (!c) throw new Error('Нет цвета для ' + key); return c; };
}
