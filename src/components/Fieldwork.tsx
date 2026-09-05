import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import type { FieldKind, FieldStation } from '../game/fieldwork';
import { fieldworkSound } from '../game/sound';
import './fieldwork.css';

export const FIELD_NOTES:Record<FieldKind,string>={
 brush:'Клеймо помогает исследовать происхождение кирпича. Сначала наблюдаем, затем бережно работаем.',
 measure:'Обмер сохраняет форму и пропорции детали. Даже небольшой элемент заслуживает внимания.',
 photo:'Фотография до начала работ помогает сравнивать состояние детали и сохранять её историю.'
};
const TITLES:Record<FieldKind,string>={brush:'Что скрывает пыль?',measure:'Сохраним пропорции',photo:'Остановим мгновение'};
const HINTS:Record<FieldKind,string>={brush:'Проведи по трём участкам мягкой кистью или нажми на каждый. Под пылью скрывается клеймо.',measure:'Передвигай конец линейки до правого края детали. Пунктир поможет совместить границы.',photo:'Передвинь кадр так, чтобы окно совпало с контуром. Затем сделай снимок до начала работ.'};

export function Fieldwork({station,sound,onDone,onClose}:{station:FieldStation;sound:boolean;onDone:()=>void;onClose:()=>void}){
 const [clean,setClean]=useState<number[]>([]),[value,setValue]=useState(station.kind==='photo'?18:25),[done,setDone]=useState(false),[feedback,setFeedback]=useState('');
 const lastSound=useRef(0);
 const saveButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(done)saveButton.current?.focus()},[done]);
 function cleanArea(i:number){if(clean.includes(i)||done)return;fieldworkSound('brush',sound);const next=[...clean,i];setClean(next);if(next.length===3){setDone(true);setFeedback('Клеймо проявилось. Теперь его можно зафиксировать в полевом журнале.');fieldworkSound('complete',sound)}}
 function change(v:number){setValue(v);setFeedback('');if(performance.now()-lastSound.current>140){fieldworkSound(station.kind==='photo'?'measure':station.kind,sound);lastSound.current=performance.now()}}
 function record(){const target=station.kind==='measure'?60:50;if(Math.abs(value-target)<=3){setDone(true);setFeedback(station.kind==='measure'?'Границы совпали. Обмер сохранит пропорции этой детали.':'Кадр готов. Теперь у детали есть фотография до начала работ.');fieldworkSound(station.kind==='photo'?'photo':'complete',sound)}else setFeedback(station.kind==='measure'?'Пока не совпало: подведи конец линейки к пунктирной границе справа.':'Окно ещё сдвинуто относительно рамки. Совмести два контура.');}
 return <Modal label={`Полевая остановка: ${station.title}`} wide>
  <div className="modal-heading"><span className="eyebrow">ПОЛЕВАЯ ОСТАНОВКА</span><button className="close-button" aria-label="Закрыть полевую остановку" onClick={onClose}>×</button></div>
  <h2 className="field-title">{TITLES[station.kind]}</h2><p>{HINTS[station.kind]}</p>
  <div className={`field-scene field-${station.kind}${done?' field-done':''}`}>
   <span className="field-specimen">{station.kind==='brush'?'УЧЕБНЫЙ ФРАГМЕНТ · КИРПИЧ':station.kind==='measure'?'ЭСКИЗ ОБМЕРА · ОКОННЫЙ ПРОЁМ':'ФОТОФИКСАЦИЯ · ОКОННЫЙ ПЕРЕПЛЁТ'}</span>
   {station.kind==='brush'?<div className="dust-brick" aria-label="Кирпич с клеймом"><div className="brick-stamp" aria-hidden="true">✦<span>КЛЕЙМО</span>✦</div><div className="dust-areas" onPointerMove={e=>{if(e.buttons!==1)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLButtonElement>('[data-dust]');if(target&&e.currentTarget.contains(target))cleanArea(Number(target.dataset.dust));}}>{[0,1,2].map(i=><button key={i} data-dust={i} className={clean.includes(i)?'clean':''} aria-label={`Очистить участок ${i+1}`} aria-pressed={clean.includes(i)} onClick={()=>cleanArea(i)} onPointerEnter={e=>{if(e.buttons===1)cleanArea(i)}} onPointerDown={e=>{e.preventDefault();cleanArea(i)}}><span aria-hidden="true">{clean.includes(i)?'':'⌁'}</span></button>)}</div></div>:
    <svg className="field-drawing" viewBox="0 0 400 270" role="img" aria-label={station.kind==='measure'?'Деталь с пунктирными границами и подвижной линейкой':'Окно и контрольная рамка для совмещения'}>
     <defs><pattern id="field-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ffffff0d"/></pattern></defs><rect width="400" height="270" fill="url(#field-grid)"/>
     {station.kind==='measure'?<><rect x="90" y="30" width="220" height="156" fill="#cfb595" stroke="#eaddca" strokeWidth="9"/><rect x="108" y="46" width="184" height="124" fill="#506b76"/><path d="M200 46V170M108 90H292" stroke="#d8c6aa" strokeWidth="6"/><path d="M90 12V240M310 12V240" stroke="#d0e97e" strokeDasharray="5 5"/><path d={`M90 210H${190+value*2}`} stroke="#f28d05" strokeWidth="5"/><path d={`M90 201V219M${190+value*2} 201V219`} stroke="#f28d05" strokeWidth="3"/><text x="200" y="253" textAnchor="middle" fill="#d0e97e" fontSize="12">СОВМЕСТИ ГРАНИЦЫ</text></>:
     <><g transform={`translate(${(value-50)*1.6} 0)`}><rect x="100" y="25" width="200" height="210" fill="#ba654d"/><rect x="120" y="42" width="160" height="176" fill="#ddcfb6"/><rect x="131" y="52" width="138" height="157" fill="#557986"/><path d="M200 52V209M131 113H269M131 174H269" stroke="#d7c8ad" strokeWidth="6"/><path d="M137 59L261 197M158 57L263 168" stroke="#ffffff1c" strokeWidth="9"/></g><rect x="120" y="42" width="160" height="176" rx="2" fill="none" stroke={Math.abs(value-50)<=3?'#d0e97e':'#fff'} strokeWidth="2" strokeDasharray="9 5"/><path d="M187 130H213M200 117V143" stroke="#d0e97e"/><text x="200" y="259" textAnchor="middle" fill="#d0e97e" fontSize="12">{done?'СНИМОК СОХРАНЁН':'КОНТРОЛЬНЫЙ КОНТУР'}</text></>}
    </svg>}
   {station.kind==='brush'&&<div className="field-meter" aria-live="polite">{clean.length} из 3 участков проявлено</div>}
  </div>
  {station.kind!=='brush'&&!done&&<label className="field-slider"><span>{station.kind==='measure'?'Длина измерения':'Положение кадра'}</span><input type="range" min="0" max="100" value={value} onChange={e=>change(Number(e.target.value))}/><small>Перетаскивай ползунок или используй стрелки клавиатуры.</small></label>}
  <p className={`field-feedback${done?' success':''}`} role="status">{feedback||'Можно не торопиться. Ошибки ничего не отнимают.'}</p>
  {done?<><p className="field-note">{FIELD_NOTES[station.kind]}</p><button key="save-note" ref={saveButton} className="primary" onClick={onDone}>Сохранить заметку и продолжить ↗</button></>:<>{station.kind!=='brush'&&<button className="primary" onClick={record}>{station.kind==='measure'?'Зафиксировать обмер':'Сделать снимок'}</button>}<button className="text-button field-skip" onClick={onClose}>Продолжить путь без остановки →</button></>}
 </Modal>
}
