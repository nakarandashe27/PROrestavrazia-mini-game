import type { Avatar } from './draw';

/** The sprite's boots coincide with the bottom of a 40 × 84 collision box. */
export interface CharacterMotion {
  speed?: number;
  time?: number;
  /** Landing compression, 0 = upright, 1 = absorbing the impact. */
  landing?: number;
}

type Point = [number, number];
/** Advance phase by distance travelled, independent of facing and frame rate. */
export const RUN_STANCE_RATIO = .32;
export const RUN_PHASE_PER_PIXEL = Math.PI * 2 * RUN_STANCE_RATIO / 44;
const RUN_FRAMES = 32;

export function sampleRunFoot(phase: number): { x: number; y: number; planted: boolean } {
  const cycle = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const stance = Math.PI * 2 * RUN_STANCE_RATIO;
  if (cycle < stance) {
    // Contact → push-off: the foot moves BACK relative to the forward-facing torso.
    // Its -44/stance slope cancels root movement with RUN_PHASE_PER_PIXEL.
    return { x: 22 - cycle / stance * 44, y: -3, planted: true };
  }
  const recovery = (cycle - stance) / (Math.PI * 2 - stance);
  return { x: -22 * Math.cos(recovery * Math.PI),
    y: -3 - Math.sin(recovery * Math.PI) * 16, planted: false };
}

/** Counter-swing follows this arm's own leg, including its asymmetric recovery.
 * Easing softens the shoulder's turnaround without shifting its neutral phase. */
export function sampleRunArm(phase:number):number {
  return -Math.sin(sampleRunFoot(phase).x / 22 * Math.PI / 2);
}

const sprites = new Map<string, HTMLCanvasElement>();
const INK = '#222a36';

function shade(hex: string, amount: number) {
  const value = parseInt(hex.replace('#', ''), 16);
  return '#' + [value >> 16, (value >> 8) & 255, value & 255]
    .map(v => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)
      .toString(16).padStart(2, '0')).join('');
}

/** Scan-converted polygons keep the same one-pixel grid across every pose. */
function polygon(c: CanvasRenderingContext2D, points: Point[], color: string) {
  const ys = points.map(p => p[1]);
  c.fillStyle = color;
  for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
    const crossings: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= y + .5 && b[1] > y + .5) || (b[1] <= y + .5 && a[1] > y + .5)) {
        crossings.push(a[0] + (y + .5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const x = Math.round(crossings[i]);
      c.fillRect(x, y, Math.max(1, Math.round(crossings[i + 1]) - x), 1);
    }
  }
}

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function segment(c: CanvasRenderingContext2D, a: Point, b: Point, wa: number, wb: number, color: string) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
  polygon(c, [[a[0] + nx * wa, a[1] + ny * wa], [b[0] + nx * wb, b[1] + ny * wb],
    [b[0] - nx * wb, b[1] - ny * wb], [a[0] - nx * wa, a[1] - ny * wa]], color);
}

/** Two-bone IK: the planted foot stays on the ground during its support phase. */
function knee(hip: Point, ankle: Point): Point {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const d = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.sqrt(Math.max(0, 20 * 20 - Math.min(40, d) ** 2 / 4));
  return [(hip[0] + ankle[0]) / 2 + dy / d * bend,
    (hip[1] + ankle[1]) / 2 - dx / d * bend];
}

function leg(c: CanvasRenderingContext2D, hip: Point, ankle: Point, pants: string, far: boolean) {
  const k = knee(hip, ankle);
  const base = shade(pants, far ? -.22 : .05);
  segment(c, hip, k, 5, 4.1, INK);
  segment(c, k, ankle, 4.1, 3.2, INK);
  segment(c, [hip[0] + 1, hip[1]], [k[0] + 1, k[1]], 3.5, 2.9, base);
  segment(c, [k[0] + 1, k[1]], [ankle[0] + 1, ankle[1]], 2.8, 2.1, base);
  if (!far) {
    segment(c, [hip[0] + 2, hip[1] + 3], [k[0] + 2, k[1] - 3], 1.1, .8, shade(pants, .3));
    rect(c, k[0] - 2, k[1] - 1, 5, 3, shade(pants, -.34));
    rect(c, ankle[0] - 2, ankle[1] - 5, 5, 2, '#979e9b');
  }
  // Leather safety boot, raised toe, sole and two lace pixels.
  polygon(c, [[ankle[0] - 4, ankle[1] - 3], [ankle[0] + 3, ankle[1] - 4],
    [ankle[0] + 5, ankle[1] - 1], [ankle[0] + 10, ankle[1]],
    [ankle[0] + 10, ankle[1] + 3], [ankle[0] - 4, ankle[1] + 3]], '#252c35');
  rect(c, ankle[0] - 4, ankle[1] + 2, 14, 1, '#101925');
  rect(c, ankle[0] + 1, ankle[1] - 2, 5, 1, far ? '#5b615f' : '#9c9a8a');
  rect(c, ankle[0] + 3, ankle[1], 5, 1, '#414b50');
}

function arm(c: CanvasRenderingContext2D, shoulder: Point, elbow: Point, hand: Point, jacket: string, far: boolean) {
  const col = shade(jacket, far ? -.3 : 0);
  segment(c, shoulder, elbow, 4.7, 3.6, INK);
  segment(c, elbow, hand, 3.5, 2.5, INK);
  segment(c, [shoulder[0] + 1, shoulder[1]], [elbow[0] + 1, elbow[1]], 3.3, 2.4, col);
  segment(c, [elbow[0] + 1, elbow[1]], hand, 2.4, 1.7, shade(col, .14));
  rect(c, hand[0] - 2, hand[1] - 2, 5, 5, far ? '#a69b78' : '#e8d5a1');
  rect(c, hand[0] + 2, hand[1], 2, 3, far ? '#7b735e' : '#bba576');
}

function createSprite(a: Avatar, state: string, frame: number, compression: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 76; canvas.height = 100;
  const c = canvas.getContext('2d')!;
  c.translate(34, 92);
  const running = state === 'run', rising = state === 'rise', airborne = rising || state === 'fall';
  const t = frame / (running ? RUN_FRAMES : 12) * Math.PI * 2;
  const breath = state === 'idle' ? Math.sin(t) * .55 : 0;
  const bob = running ? Math.cos(t * 2 - Math.PI * .64) * 1.6 + 2 : breath + compression * 6;
  const lean = running ? 4 : airborne ? 3 : 0;
  const hip: Point = [0, (state === 'idle' ? -42.5 : running ? -39 : -40) + bob];
  const shoulder: Point = [lean, -64 + bob];
  const feet = (phase: number): Point => { const foot = sampleRunFoot(phase); return [foot.x, foot.y]; };
  const farFoot: Point = running ? feet(t + Math.PI) : airborne ? [-13, rising ? -12 : -5] : [-6, -3];
  const nearFoot: Point = running ? feet(t) : airborne ? [15, rising ? -19 : -8] : [5, -3];
  const nearSwing=sampleRunArm(t),farSwing=sampleRunArm(t+Math.PI);
  const farElbow: Point = running ? [lean + farSwing * 10 - 3, -51 + bob] : airborne ? [-12, -59] : [-7, -50 + bob];
  const farHand: Point = running ? [lean + farSwing * 15 + 2, -49 - Math.max(0, farSwing) * 10 + bob] : airborne ? [-18, rising ? -70 : -57] : [-5, -39 + bob];
  const nearElbow: Point = running ? [lean + nearSwing * 10 + 2, -51 + bob] : airborne ? [17, -59] : [7, -51 + bob];
  const nearHand: Point = running ? [lean + nearSwing * 16 + 8, -49 - Math.max(0, nearSwing) * 10 + bob] : airborne ? [22, rising ? -73 : -64] : [8, -39 + bob];

  arm(c, [shoulder[0] - 3, shoulder[1] + 2], farElbow, farHand, a.jacket, true);
  leg(c, [-2, hip[1]], farFoot, a.pants, true);
  // Narrow canvas equipment roll, restrained orange accent and strapped flap.
  polygon(c, [[lean - 11, -65 + bob], [lean - 5, -65 + bob], [-7, -44 + bob], [-14, -46 + bob], [-14, -60 + bob]], '#584c3e');
  polygon(c, [[lean - 12, -63 + bob], [lean - 7, -63 + bob], [-9, -47 + bob], [-13, -48 + bob]], '#a08458');
  rect(c, lean - 13, -61 + bob, 5, 3, '#F28D05');
  segment(c, [lean - 12, -69 + bob], [lean - 13, -55 + bob], 1, 1, '#d5bd88');
  rect(c, lean - 14, -71 + bob, 4, 4, '#c6c2ad');

  leg(c, [2, hip[1]], nearFoot, a.pants, false);
  // Tailored work jacket: shoulder slope, waist, side shadow and stitched pockets.
  polygon(c, [[lean - 6, -68 + bob], [lean + 5, -67 + bob], [lean + 9, -62 + bob],
    [8, -43 + bob], [5, -38 + bob], [-7, -39 + bob], [-9, -46 + bob], [lean - 10, -62 + bob]], INK);
  polygon(c, [[lean - 5, -66 + bob], [lean + 4, -65 + bob], [lean + 7, -61 + bob],
    [6, -42 + bob], [-6, -41 + bob], [lean - 8, -61 + bob]], a.jacket);
  polygon(c, [[lean - 7, -62 + bob], [lean - 3, -62 + bob], [-2, -41 + bob], [-6, -41 + bob]], shade(a.jacket, -.3));
  segment(c, [lean + 4, -62 + bob], [3, -43 + bob], .6, .6, shade(a.jacket, .5));
  rect(c, lean - 2, -59 + bob, 5, 1, '#d8dcca');
  rect(c, lean - 2, -58 + bob, 5, 4, shade(a.jacket, -.2));
  rect(c, lean - 1, -57 + bob, 2, 1, shade(a.jacket, .38));
  rect(c, -5, -47 + bob, 9, 2, '#c5d793');
  rect(c, -6, -41 + bob, 13, 3, '#3b3736');
  rect(c, 2, -41 + bob, 3, 3, '#b5b5a3');
  // Hip pouch with brass clasp and a small hanging brush.
  polygon(c, [[-9, -43 + bob], [-3, -43 + bob], [-2, -34 + bob], [-8, -33 + bob]], '#73523c');
  rect(c, -8, -42 + bob, 5, 2, '#b38a5a');
  rect(c, -6, -38 + bob, 2, 2, '#d6b870');
  segment(c, [-11, -41 + bob], [-12, -30 + bob], .8, .8, '#c8a87a');
  rect(c, -14, -30 + bob, 4, 4, '#b8ae92');

  const hx = lean + 1, hy = -78 + bob;
  rect(c, hx - 3, hy + 8, 6, 5, shade(a.skin, -.2));
  // Profile, brow, projecting nose and jaw: a human head, not a round mascot.
  polygon(c, [[hx - 6, hy - 1], [hx + 3, hy - 2], [hx + 6, hy + 1], [hx + 6, hy + 5],
    [hx + 8, hy + 6], [hx + 7, hy + 8], [hx + 5, hy + 8], [hx + 4, hy + 11],
    [hx - 2, hy + 11], [hx - 5, hy + 7]], shade(a.skin, -.28));
  polygon(c, [[hx - 2, hy], [hx + 4, hy], [hx + 5, hy + 5], [hx + 7, hy + 6],
    [hx + 4, hy + 7], [hx + 3, hy + 10], [hx - 1, hy + 9]], a.skin);
  rect(c, hx - 5, hy + 1, 3, 6, a.hair);
  rect(c, hx - 3, hy + 5, 2, 3, shade(a.skin, .14));
  rect(c, hx + 3, hy + 3, 3, 1, '#45382e');
  rect(c, hx + 4, hy + 4, 1, 1, '#222a36');
  rect(c, hx + 3, hy + 8, 2, 1, '#785640');
  if (a.hat === 'helmet') {
    const hat=a.hatColor??'#F28D05';
    polygon(c, [[hx - 8, hy + 1], [hx - 7, hy - 4], [hx - 4, hy - 7], [hx + 2, hy - 7],
      [hx + 6, hy - 4], [hx + 7, hy], [hx + 10, hy + 1], [hx + 10, hy + 3], [hx - 9, hy + 3]], shade(hat,-.42));
    polygon(c, [[hx - 7, hy], [hx - 6, hy - 4], [hx - 3, hy - 6], [hx + 2, hy - 6],
      [hx + 5, hy - 3], [hx + 6, hy], [hx + 9, hy + 1], [hx - 8, hy + 1]], hat);
    rect(c, hx - 2, hy - 6, 2, 6, shade(hat,.48));
    rect(c, hx - 6, hy - 2, 2, 2, shade(hat,.3));
    rect(c, hx - 7, hy + 1, 16, 1, shade(hat,.7));
    rect(c, hx - 5, hy + 4, 1, 5, '#7d623d');
  } else if (a.hat === 'cap' || a.hat === 'beret') {
    const hat=a.hatColor??(a.hat==='cap'?'#4D61F4':'#F74C2E');
    polygon(c, [[hx - 7, hy], [hx - 6, hy - 4], [hx - 1, hy - 6], [hx + 5, hy - 3],
      [hx + 6, hy], [hx + 10, hy + 1], [hx + 9, hy + 3], [hx - 7, hy + 2]], hat);
    rect(c, hx - 3, hy - 4, 5, 1, shade(hat,.4));
  } else {
    polygon(c, [[hx - 7, hy + 2], [hx - 7, hy - 2], [hx - 4, hy - 4], [hx + 2, hy - 4],
      [hx + 5, hy - 1], [hx + 1, hy + 1], [hx - 3, hy]], a.hair);
  }
  arm(c, [shoulder[0] + 1, shoulder[1] + 2], nearElbow, nearHand, a.jacket, false);
  // The shoulder patch is applied last so it follows the near upper arm.
  rect(c, shoulder[0] - 1, shoulder[1] + 2, 4, 2, '#D0E97E');
  return canvas;
}

export function drawRestorer(c: CanvasRenderingContext2D, x: number, y: number, facing: number,
  run: number, onGround: boolean, avatar: Avatar, vy: number, motion: CharacterMotion = {}) {
  const state = !onGround ? (vy < -90 ? 'rise' : 'fall') :
    (motion.speed !== undefined ? Math.abs(motion.speed) > 22 : run !== 0) ? 'run' : 'idle';
  const period = state === 'run' ? RUN_FRAMES : 12;
  const phase = state === 'run' ? run : (motion.time ?? 0) * 1.6;
  const frame = Math.floor(((phase % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * period);
  const compression = onGround ? Math.round(Math.max(0, Math.min(1, motion.landing ?? 0)) * 3) / 3 : 0;
  const key = `${avatar.jacket}:${avatar.pants}:${avatar.skin}:${avatar.hair}:${avatar.hat}:${avatar.hatColor??''}:${state}:${frame}:${compression}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = createSprite(avatar, state, frame, compression);
    // Color customization should not retain an unbounded collection of atlases.
    if (sprites.size >= 512) sprites.delete(sprites.keys().next().value!);
    sprites.set(key, sprite);
  }
  c.save();
  c.translate(Math.round(x + 20), Math.round(y + 84));
  c.scale(facing < 0 ? -1 : 1, 1);
  c.imageSmoothingEnabled = false;
  if (onGround) {
    c.fillStyle = '#17233128';
    c.beginPath(); c.ellipse(1, 1, 19, 3, 0, 0, Math.PI * 2); c.fill();
  }
  c.drawImage(sprite, -34, -92);
  c.restore();
}
