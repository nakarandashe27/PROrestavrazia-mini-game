import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MosaicScene } from '../mosaic/scene';
import type { LightingMode } from '../game/lighting';
import spbgasu from '../assets/logos/spbgasu-emblem.png';
import abMark from '../assets/logos/artbrodsky-mark.png';
import abWord from '../assets/logos/artbrodsky-students.png';
import './mosaic-hero.css';

/** Живая мозаика фасада типографии Сытина — фон заставки. */
export function MosaicHero({ lighting, onRestore }: { lighting: LightingMode; onRestore?: (done: number, total: number) => void }) {
 const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), scene = useRef<MosaicScene | null>(null);
 const restore = useRef(onRestore); restore.current = onRestore;
 const [failed, setFailed] = useState(false), [ready, setReady] = useState(false);
 useEffect(() => {
  const el = host.current!, welcome = el.closest<HTMLElement>('.welcome') ?? el;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s = new MosaicScene({
   canvas: canvas.current!, host: el, target: welcome, reduced,
   safeLeft: () => {
    const card = welcome.querySelector('.hero-copy')?.getBoundingClientRect(), box = el.getBoundingClientRect();
    if (!card || !box.width || card.top > box.bottom - 40 || card.left > box.left + box.width * 0.5) return 0;
    return (card.right - box.left) / box.width;
   },
   onRestore: (d, t) => restore.current?.(d, t),
   onFail: () => setFailed(true),
   onReady: () => setReady(true),
  });
  scene.current = s;
  return () => { s.dispose(); scene.current = null; };
 }, []);
 useEffect(() => { scene.current?.setLighting(lighting); }, [lighting]);
 return <div className={'mosaic-stage' + (failed ? ' mosaic-failed' : ready ? ' ready' : '')} ref={host} aria-hidden="true">
  <canvas ref={canvas} />
  {failed && <div className="mosaic-fallback" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/sytin-hero.png)` }} />}
 </div>;
}

const PRO = [['П', 'blue'], ['Р', 'orange'], ['О', 'lime']] as const;
/** Название в стиле выставки: «ПРО» — цветные плитки, «РЕСТАВРАЦИЮ» — белые. */
export function GameTitle() {
 return <h1 className="game-title" aria-label="Игра про реставрацию">
  <span className="game-title-kicker" aria-hidden="true">Игра</span>
  <span className="title-tiles title-pro" aria-hidden="true">{PRO.map(([ch, c], i) => <span key={i} className={`title-tile tile-${c}`} style={{ '--i': i } as CSSProperties}>{ch}</span>)}</span>
  <span className="title-tiles title-rest" aria-hidden="true">{[...'РЕСТАВРАЦИЮ'].map((ch, i) => <span key={i} className="title-tile tile-white" style={{ '--i': i + 3 } as CSSProperties}>{ch}</span>)}</span>
 </h1>;
}

/** Соавторство: СПбГАСУ и онлайн-школа АРТ.БРОДСКИЙ (студенты). */
export function Partners() {
 return <div className="partners" role="group" aria-label="Совместный проект СПбГАСУ и онлайн-школы АРТ.БРОДСКИЙ">
  <span className="partner-spbgasu"><img src={spbgasu} alt="СПбГАСУ" /><span>Санкт-Петербургский государственный архитектурно-строительный университет</span></span>
  <i aria-hidden="true" />
  <span className="partner-ab"><img src={abMark} alt="" /><img src={abWord} alt="Арт.Бродский. Студенты" /></span>
 </div>;
}
