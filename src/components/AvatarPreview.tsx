import { useEffect, useRef } from 'react';
import { drawRestorer, RUN_PHASE_PER_PIXEL } from '../game/character';
import type { Avatar } from '../game/draw';

/** Decorative portrait; its containing card supplies the accessible name. */
export function AvatarPreview({ avatar, className, facing = 1, animated=false, running=false, size=80 }: {
  avatar: Avatar;
  className?: string;
  facing?: number;
  animated?: boolean;
  running?: boolean;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    let frame=0;
    const started=performance.now();
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint=(now:number)=>{
      const time=(now-started)/1000,speed=running?210:0;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();c.scale(2, 2);
      drawRestorer(c, 20, 11, facing, time*speed*RUN_PHASE_PER_PIXEL, true, avatar, 0, { speed, time });
      c.restore();
      if(animated&&!reducedMotion)frame=requestAnimationFrame(paint);
    };
    paint(started);
    return()=>cancelAnimationFrame(frame);
  }, [avatar, facing, animated, running]);
  return <canvas ref={canvasRef} width={160} height={208} className={className}
    aria-hidden="true" style={{ width: size, height: size*1.3, imageRendering: 'pixelated', display: 'block' }} />;
}
