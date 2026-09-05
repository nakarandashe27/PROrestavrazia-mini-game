import { useEffect, useRef, useState } from 'react';
import { paintFacade } from '../game/facade';
export function Reveal(){
 const ref=useRef<HTMLCanvasElement>(null);const [split,setSplit]=useState(28);
 useEffect(()=>{const c=ref.current!.getContext('2d')!;c.fillStyle='#f7f7f7';c.fillRect(0,0,1200,470);paintFacade(c,40,42,1120,396,false,6);
 c.save();c.beginPath();c.rect(0,0,1200*split/100,470);c.clip();c.fillStyle='#6d67564a';c.fillRect(0,0,1200,470);c.strokeStyle='#736650';c.lineWidth=2;
 for(let i=0;i<16;i++){const x=70+i*73,y=100+(i%3)*91;c.beginPath();c.moveTo(x,y);c.lineTo(x+8,y+20);c.lineTo(x+3,y+36);c.lineTo(x+15,y+52);c.stroke()}c.restore();
 c.fillStyle='#4D61F4';c.fillRect(1200*split/100-2,0,4,470);
 },[split]);
 return <div className="reveal"><canvas ref={ref} width="1200" height="470" aria-label="Иллюстрация фасада до и после игровых работ"/><div className="reveal-labels"><span>До игровых работ</span><span>После</span></div><label>Проведите, чтобы сравнить<input aria-label="Сравнить фасад до и после" type="range" min="0" max="100" value={split} onChange={e=>setSplit(Number(e.target.value))}/></label><small>Игровая иллюстрация. Повреждения условные.</small></div>
}
