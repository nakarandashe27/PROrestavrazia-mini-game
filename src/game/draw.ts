import { drawRestorer, type CharacterMotion } from './character';
import { paintFacade } from './facade';

import { GROUND, H } from './level';

export const DISPLAY_FONT = "'AdvakenSans-Expanded','Arial Black',Arial,sans-serif";
export const TEXT_FONT = "'Inter Tight',system-ui,Arial,sans-serif";

export interface Palette {
  skyTop: string;
  skyBottom: string;
  far: string;
  wall: string;
  wallDark: string;
  trim: string;
  glass: string;
  glassLit: string;
  frame: string;
  road: string;
  sidewalk: string;
  curb: string;
  line: string;
  scaffold: string;
  pole: string;
  lampGlow: string;
  text: string;
  houses: string[];
}

export const DAY: Palette = {
  skyTop: '#D6E2F2',
  skyBottom: '#F7F7F7',
  far: '#C5CBD6',
  wall: '#EDE7DB',
  wallDark: '#D9D1C2',
  trim: '#FFFFFF',
  glass: '#B9CDE0',
  glassLit: '#B9CDE0',
  frame: '#3F5A4A',
  road: '#B7B7B7',
  sidewalk: '#DCDCDC',
  curb: '#C4C4C4',
  line: '#F7F7F7',
  scaffold: '#D8A15E',
  pole: '#6E6E6E',
  lampGlow: 'rgba(255,220,120,0)',
  text: '#262626',
  houses: ['#F3D9A4', '#F6C9C0', '#CFE0EE', '#E5E9D1', '#F0E2C7'],
};

export const NIGHT: Palette = {
  skyTop: '#15151C',
  skyBottom: '#2A2A38',
  far: '#1E1E27',
  wall: '#4E4B48',
  wallDark: '#3E3B39',
  trim: '#6A6660',
  glass: '#2B2F3A',
  glassLit: '#F2C46B',
  frame: '#1E2B24',
  road: '#33333B',
  sidewalk: '#45454E',
  curb: '#3B3B44',
  line: '#8C8C96',
  scaffold: '#A5783F',
  pole: '#8A8A93',
  lampGlow: 'rgba(255,214,120,0.35)',
  text: '#F7F7F7',
  houses: ['#5A5443', '#5B4A47', '#45505A', '#4F5346', '#5A5346'],
};

export const STRIP_W = 3400;

/* ---------- утилиты ---------- */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** окно с полуциркульным (арочным) верхом */
function rectWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: Palette, lit: boolean, nalichnik = true) {
  if (nalichnik) {
    ctx.fillStyle = p.trim;
    ctx.fillRect(x - 5, y - 8, w + 10, h + 12);
  }
  ctx.fillStyle = p.frame;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = lit ? p.glassLit : p.glass;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.strokeStyle = p.frame;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.4);
  ctx.lineTo(x + w, y + h * 0.4);
  ctx.stroke();
}

/* ---------- Типография Сытина ---------- */
export function drawSytin(ctx: CanvasRenderingContext2D, x: number, _p: Palette, night: boolean) {
  paintFacade(ctx, x, 145, 980, GROUND - 145, night, 6);
}

/* ---------- обычный дом Замоскворечья ---------- */
function drawHouse(ctx: CanvasRenderingContext2D, x: number, w: number, floors: number, color: string, p: Palette, night: boolean, seed: number) {
  const fh = 110;
  const top = GROUND - floors * fh - 30;
  ctx.fillStyle = color;
  ctx.fillRect(x, top, w, GROUND - top);
  ctx.fillStyle = p.wallDark;
  ctx.fillRect(x, GROUND - 22, w, 22);
  // крыша
  ctx.fillStyle = night ? '#3A3A42' : '#8E9AA6';
  ctx.beginPath();
  ctx.moveTo(x - 10, top);
  ctx.lineTo(x + w + 10, top);
  ctx.lineTo(x + w - 14, top - 34);
  ctx.lineTo(x + 14, top - 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.trim;
  ctx.fillRect(x - 10, top, w + 20, 8);
  // пилястры
  ctx.fillStyle = p.trim;
  ctx.fillRect(x + 6, top, 10, GROUND - top - 22);
  ctx.fillRect(x + w - 16, top, 10, GROUND - top - 22);
  const cols = Math.max(2, Math.floor((w - 40) / 70));
  const gap = (w - 40) / cols;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + 20 + c * gap + gap / 2 - 22;
      const wy = top + 40 + f * fh;
      const lit = night && ((seed + f * 3 + c * 7) % 5 < 2);
      if (f === floors - 1 && seed % 2 === 0) {
        rectWindow(ctx, wx, wy, 44, 64, p, lit, true);
      } else {
        rectWindow(ctx, wx, wy, 44, 60, p, lit, true);
      }
    }
    if (f > 0) {
      ctx.fillStyle = p.trim;
      ctx.fillRect(x, top + f * fh + 10, w, 5);
    }
  }
}

/* ---------- полоса фасадов (кэшируется) ---------- */
export function buildStrip(night: boolean): HTMLCanvasElement {
  const p = night ? NIGHT : DAY;
  const c = document.createElement('canvas');
  c.width = STRIP_W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const houses: [number, number, number, number][] = [
    [0, 340, 2, 0],
    [360, 300, 3, 1],
    [1700, 330, 2, 2],
    [2050, 420, 3, 3],
    [2490, 300, 2, 4],
    [2810, 380, 3, 0],
    [3210, 190, 2, 1],
  ];
  houses.forEach(([hx, hw, fl, ci], i) => drawHouse(ctx, hx, hw, fl, p.houses[ci], p, night, i * 3 + ci));
  drawSytin(ctx, 690, p, night);
  return c;
}

/* ---------- дальний план: силуэты ---------- */
export function drawFar(ctx: CanvasRenderingContext2D, camX: number, p: Palette, W: number) {
  const period = 1500;
  const off = -((camX * 0.15) % period);
  ctx.fillStyle = p.far;
  for (let k = -1; k < Math.ceil(W / period) + 1; k++) {
    const bx = off + k * period;
    // церковь Климента (силуэт с пятиглавием)
    ctx.fillRect(bx + 100, 380, 200, 240);
    for (let d = 0; d < 5; d++) {
      const cx = bx + 130 + d * 35;
      const cy = d === 2 ? 320 : 355;
      ctx.beginPath();
      ctx.arc(cx, cy, d === 2 ? 26 : 16, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - (d === 2 ? 26 : 16), cy, d === 2 ? 52 : 32, 380 - cy);
      ctx.fillRect(cx - 1.5, cy - (d === 2 ? 50 : 34), 3, d === 2 ? 26 : 20);
    }
    // колокольня
    ctx.fillRect(bx + 330, 300, 46, 320);
    ctx.beginPath();
    ctx.moveTo(bx + 325, 300);
    ctx.lineTo(bx + 353, 230);
    ctx.lineTo(bx + 381, 300);
    ctx.fill();
    // крыши домов
    ctx.fillRect(bx + 450, 430, 300, 200);
    ctx.fillRect(bx + 800, 470, 220, 160);
    ctx.fillRect(bx + 1080, 400, 260, 230);
    ctx.fillRect(bx + 1150, 360, 40, 60);
    // высотка на Котельнической — вдалеке
    ctx.fillRect(bx + 1380, 330, 90, 300);
    ctx.fillRect(bx + 1405, 260, 40, 80);
    ctx.fillRect(bx + 1422, 200, 6, 70);
  }
}

/* ---------- декор улицы ---------- */
export function drawDecor(ctx: CanvasRenderingContext2D, kind: string, x: number, v: number, p: Palette, night: boolean) {
  switch (kind) {
    case 'lamp': {
      ctx.fillStyle = p.pole;
      ctx.fillRect(x - 3, GROUND - 210, 6, 210);
      ctx.fillRect(x - 10, GROUND - 6, 20, 6);
      ctx.beginPath();
      ctx.arc(x, GROUND - 210, 5, 0, Math.PI * 2);
      ctx.fill();
      // рожок фонаря
      ctx.fillStyle = night ? '#FFD978' : '#F7F7F7';
      ctx.beginPath();
      ctx.moveTo(x - 14, GROUND - 212);
      ctx.lineTo(x + 14, GROUND - 212);
      ctx.lineTo(x + 9, GROUND - 236);
      ctx.lineTo(x - 9, GROUND - 236);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.pole;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (night) {
        const g = ctx.createRadialGradient(x, GROUND - 220, 5, x, GROUND - 220, 160);
        g.addColorStop(0, 'rgba(255,214,120,0.32)');
        g.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 160, GROUND - 380, 320, 400);
      }
      break;
    }
    case 'tree': {
      ctx.fillStyle = night ? '#4A4136' : '#8B6A46';
      ctx.fillRect(x - 5, GROUND - 120, 10, 120);
      const cols = night ? ['#3F5A3A', '#4A6A44'] : ['#9CC26A', '#D0E97E'];
      ctx.fillStyle = cols[0];
      ctx.beginPath();
      ctx.arc(x, GROUND - 150, 44 + v * 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cols[1];
      ctx.beginPath();
      ctx.arc(x + 14, GROUND - 168, 26 + v * 8, 0, Math.PI * 2);
      ctx.fill();
      // приствольная решётка
      ctx.fillStyle = p.curb;
      ctx.fillRect(x - 26, GROUND - 4, 52, 4);
      break;
    }
    case 'bench': {
      ctx.fillStyle = night ? '#6B5A45' : '#A97B4F';
      ctx.fillRect(x - 34, GROUND - 26, 68, 8);
      ctx.fillRect(x - 34, GROUND - 46, 68, 6);
      ctx.fillStyle = p.pole;
      ctx.fillRect(x - 28, GROUND - 18, 5, 18);
      ctx.fillRect(x + 23, GROUND - 18, 5, 18);
      ctx.fillRect(x - 28, GROUND - 46, 4, 22);
      ctx.fillRect(x + 24, GROUND - 46, 4, 22);
      break;
    }
    case 'bollard': {
      ctx.fillStyle = p.pole;
      rr(ctx, x - 5, GROUND - 34, 10, 34, 4);
      ctx.fill();
      ctx.fillStyle = '#F28D05';
      ctx.fillRect(x - 5, GROUND - 26, 10, 5);
      break;
    }
    case 'sign': {
      ctx.fillStyle = p.pole;
      ctx.fillRect(x - 2, GROUND - 130, 4, 130);
      ctx.fillStyle = '#4D61F4';
      rr(ctx, x - 40, GROUND - 150, 80, 30, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `600 11px ${TEXT_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ПЯТНИЦКАЯ ул.', x, GROUND - 135);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      break;
    }
  }
}

/* ---------- платформы: строительные леса и люльки ---------- */
export function drawScaffold(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, p: Palette, moving: boolean, ground=GROUND, supports=true) {
  if (moving) {
    // люлька-подъёмник: тросы вверх
    ctx.strokeStyle = p.pole;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y);
    ctx.lineTo(x + 12, 0);
    ctx.moveTo(x + w - 12, y);
    ctx.lineTo(x + w - 12, 0);
    ctx.stroke();
    ctx.fillStyle = '#4D61F4';
    rr(ctx, x, y, w, 16, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 6, y + 4, w - 12, 3);
    // ограждение
    ctx.strokeStyle = '#4D61F4';
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 4, y - 22);
    ctx.lineTo(x + w - 4, y - 22);
    ctx.lineTo(x + w - 4, y);
    ctx.stroke();
    return;
  }
  // стойки до земли
  if(supports){
  ctx.fillStyle = p.pole;
  ctx.fillRect(x + 6, y, 5, ground - y);
  ctx.fillRect(x + w - 11, y, 5, ground - y);
  ctx.fillStyle='rgba(255,255,255,.45)';
  ctx.fillRect(x + 7, y, 1, ground-y);ctx.fillRect(x+w-10,y,1,ground-y);
  // раскос
  ctx.strokeStyle = p.pole;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for(let by=y+18;by<ground;by+=110){ctx.moveTo(x+8,Math.min(ground,by+100));ctx.lineTo(x+w-8,by);ctx.moveTo(x+8,by);ctx.lineTo(x+w-8,Math.min(ground,by+100));}
  ctx.stroke();
  }
  // настил
  ctx.fillStyle = p.scaffold;
  rr(ctx, x, y, w, 16, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let bx = x + 14; bx < x + w - 10; bx += 24) ctx.fillRect(bx, y + 2, 2, 12);
  // сигнальная лента
  ctx.fillStyle = '#F74C2E';
  ctx.fillRect(x, y + 14, w, 3);
  ctx.fillStyle='#f0d4a0';ctx.fillRect(x+1,y,w-2,3);
  ctx.fillStyle='#494a49';
  for(const bx of [x+8,x+w-8]){ctx.fillRect(bx-5,y+16,10,6);ctx.fillRect(bx-2,y+17,4,3);}
}

/* ---------- персонаж ---------- */
export interface Avatar {
  jacket: string;
  pants: string;
  skin: string;
  hair: string;
  hat: 'none' | 'helmet' | 'cap' | 'beret';
  hatColor?: string;
}

export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, run: number, onGround: boolean, a: Avatar, vy: number, motion?: CharacterMotion) {
  drawRestorer(ctx, x, y, facing, run, onGround, a, vy, motion);
}

/* ---------- иконки элементов фасада (используются и в игре, и в UI) ---------- */
