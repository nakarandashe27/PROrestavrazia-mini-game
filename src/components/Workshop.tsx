import { useMemo, useState } from 'react';
import type { FacadeElement } from '../game/content';
import { Rng } from '../game/rng';
import { Detail } from './Detail';
import { fieldworkSound } from '../game/sound';
export function Workshop({element,seed,onDone,sound=false}:{element:FacadeElement;seed:number;onDone:()=>void;sound?:boolean}){
 const [placed,setPlaced]=useState<number[]>([]),[selected,setSelected]=useState<number|null>(null),[answer,setAnswer]=useState<number|null>(null),[hint,setHint]=useState('');
 const order=useMemo(()=>new Rng(seed+element.name.length).shuffle([0,1,2]),[seed,element]);
 const assembled=placed.length===3,correct=answer===element.correct;
 function place(slot:number){
   if(selected===null){setHint('Сначала выберите фрагмент снизу.');return}
   if(slot!==selected){setHint('Сравните линии с образцом: этому фрагменту нужно другое место.');return}
   setPlaced(p=>[...p,slot]);setSelected(null);setHint('Точно! Линии совпали.');fieldworkSound('measure',sound);
 }
 return <div className="workshop">
  <div className="workshop-copy"><span className="eyebrow">Мастерская / {element.tag}</span><h2>{element.name}</h2><p>{element.def}</p>
   <div className="reference-note"><span className="tiny-title">ЗАМЕТКА ИССЛЕДОВАТЕЛЯ</span><p>{element.fact}</p></div>
   <div className="sample"><Detail id={element.id}/><span>Образец детали<br/><small>Условная схема по референсам</small></span></div>
  </div>
  <div className="workbench">
   <span className="eyebrow">{assembled?'02 / бережное решение':'01 / соберите деталь'}</span>
   {!assembled?<>
    <h3>Верните фрагменты на свои места</h3><p className="small">Выберите фрагмент, затем его место. Можно пользоваться клавишей Tab и Enter.</p>
    <div className="puzzle-target" aria-label="Места для трёх фрагментов">
     {[0,1,2].map(i=><button key={i} className={'puzzle-slot '+(placed.includes(i)?'placed':'')} disabled={placed.includes(i)} onClick={()=>place(i)} aria-label={`Место ${i+1}${placed.includes(i)?', восстановлено':''}`}><div className="piece-window"><Detail id={element.id} part={i} muted={!placed.includes(i)}/></div>{!placed.includes(i)&&<span>{i+1}</span>}</button>)}
    </div>
    <div className="piece-tray">{order.map(i=><button key={i} aria-label={`Фрагмент ${i+1}`} aria-pressed={selected===i} disabled={placed.includes(i)} className={selected===i?'selected':''} onClick={()=>{fieldworkSound('brush',sound);setSelected(i);setHint('Теперь выберите место на схеме.')}}><div className="piece-window"><Detail id={element.id} part={i}/></div><span>{placed.includes(i)?'✓':'Взять'}</span></button>)}</div>
    <p className="feedback" role="status">{hint||'Подсказка: ориентируйтесь на форму и продолжение линий.'}</p>
   </>:<>
    <div className="assembled-mini"><Detail id={element.id}/><span>Деталь собрана <b>✓</b></span></div>
    <h3>{element.question}</h3><div className="answers">{element.options.map((option,i)=><button key={option} disabled={correct} onClick={()=>{setAnswer(i);if(i===element.correct)fieldworkSound('complete',sound)}} className={answer===i?(correct?'correct':'incorrect'):''}><span>{String(i+1).padStart(2,'0')}</span>{option}{answer===i&&correct&&<b>✓</b>}</button>)}</div>
    <div className="feedback" role="status">{answer===null?'У реставратора всегда есть причина для каждого решения.':correct?element.explanation:'Попробуйте ещё раз. Подумайте, как сохранить подлинный материал и изучить здание.'}</div>
    {correct&&<button className="primary" onClick={onDone}>Сохранить в альбом <span>↗</span></button>}
   </>}
  </div>
 </div>
}
