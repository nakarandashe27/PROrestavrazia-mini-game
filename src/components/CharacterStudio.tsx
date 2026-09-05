import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Avatar } from '../game/draw';
import { AVATAR_PRESETS } from '../game/avatars';
import { AvatarPreview } from './AvatarPreview';
import './character-studio.css';

export interface CharacterStudioProps {
  name:string;
  onName:(value:string)=>void;
  avatar:Avatar;
  onAvatar:(avatar:Avatar)=>void;
  onClose:()=>void;
}

type Colour={value:string;name:string};
const CLOTHES:Colour[]=[
  {value:'#4D61F4',name:'Синий'},{value:'#F28D05',name:'Оранжевый'},
  {value:'#D0E97E',name:'Лаймовый'},{value:'#F74C2E',name:'Коралловый'},
  {value:'#FFB6FC',name:'Розовый'},{value:'#F7F7F7',name:'Белый'},
  {value:'#262626',name:'Графитовый'},
];
const PANTS:Colour[]=[
  {value:'#3F485B',name:'Серо-синий'},{value:'#262626',name:'Графитовый'},
  {value:'#4D61F4',name:'Синий'},{value:'#454459',name:'Серо-фиолетовый'},
  {value:'#A68D76',name:'Песочный'},
];
const SKIN:Colour[]=[
  {value:'#E5B799',name:'Светлый'},{value:'#D6A17D',name:'Золотистый'},
  {value:'#BD8662',name:'Тёплый'},{value:'#956345',name:'Бронзовый'},
  {value:'#704A35',name:'Тёмный'},
];
const HAIR:Colour[]=[
  {value:'#292928',name:'Чёрный'},{value:'#463E38',name:'Каштановый'},
  {value:'#926A41',name:'Русый'},{value:'#B77843',name:'Рыжий'},
  {value:'#CAC7BE',name:'Седой'},
];
const hatColour=(avatar:Avatar)=>avatar.hatColor??(avatar.hat==='helmet'?'#F28D05':'#4D61F4');
const matches=(a:Avatar,b:Avatar)=>a.jacket===b.jacket&&a.pants===b.pants&&a.skin===b.skin&&a.hair===b.hair&&a.hat===b.hat&&hatColour(a)===hatColour(b);

function Swatches({label,colours,value,onChange}:{label:string;colours:Colour[];value:string;onChange:(value:string)=>void}) {
  return <fieldset className="studio-field studio-swatches"><legend>{label}</legend><div>
    {colours.map(colour=><button key={colour.value} type="button" aria-label={`${label}: ${colour.name}`}
      aria-pressed={value===colour.value} title={colour.name} onClick={()=>onChange(colour.value)}
      style={{backgroundColor:colour.value}}><span aria-hidden="true">{value===colour.value?'✓':''}</span></button>)}
  </div></fieldset>;
}

export function CharacterStudio({name,onName,avatar,onAvatar,onClose}:CharacterStudioProps) {
  const id=useId(),rootRef=useRef<HTMLElement>(null),nameRef=useRef<HTMLInputElement>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const [running,setRunning]=useState(false);
  useEffect(()=>{
    const root=rootRef.current!,previous=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    nameRef.current?.focus({preventScroll:true});
    const nodes=()=>[...root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(node=>node.getClientRects().length);
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();return;}
      if(event.key!=='Tab')return;
      const focusable=nodes(),first=focusable[0],last=focusable[focusable.length-1];
      if(!first){event.preventDefault();root.focus();return;}
      if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus();}
    };
    const guard=(event:FocusEvent)=>{if(!root.contains(event.target as Node))nameRef.current?.focus({preventScroll:true});};
    document.addEventListener('keydown',keydown,true);document.addEventListener('focusin',guard);
    return()=>{
      document.removeEventListener('keydown',keydown,true);document.removeEventListener('focusin',guard);
      document.body.style.overflow=previousOverflow;
      if(previous?.isConnected)previous.focus({preventScroll:true});
    };
  },[]);
  const update=(key:keyof Avatar,value:string)=>onAvatar({...avatar,[key]:value});
  return createPortal(<section className="character-studio" ref={rootRef} role="dialog" aria-modal="true" aria-labelledby={id+'-title'} tabIndex={-1}>
    <div className="studio-shell">
      <header className="studio-header"><div><p>Архисбор / Перед путешествием</p><h1 id={id+'-title'}>Ваш реставратор</h1></div>
        <button className="studio-close" type="button" onClick={onClose} aria-label="Закрыть редактор персонажа">×</button>
      </header>
      <div className="studio-name"><label htmlFor={id+'-name'}>Ваше имя</label>
        <input ref={nameRef} id={id+'-name'} value={name} onChange={event=>onName(event.target.value)} maxLength={40} autoComplete="off" placeholder="Как вас зовут?" />
      </div>
      <div className="studio-layout">
        <div className="studio-preview-panel">
          <div className="studio-stage"><span className="studio-stage-number" aria-hidden="true">01 / Персонаж</span>
            <AvatarPreview avatar={avatar} size={220} animated running={running} className="studio-hero-avatar" />
            <div className="studio-ground" aria-hidden="true" />
          </div>
          <p className="studio-player-name">{name.trim()||'Ваш персонаж'}</p>
          <div className="studio-motion" role="group" aria-label="Предпросмотр движения">
            <button type="button" aria-pressed={!running} onClick={()=>setRunning(false)}>В покое</button>
            <button type="button" aria-pressed={running} onClick={()=>setRunning(true)}>В движении</button>
          </div>
          <p className="studio-note">Выберите готовый образ или соберите свой.</p>
        </div>
        <div className="studio-options">
          <fieldset className="studio-field"><legend>Готовые образы</legend><div className="studio-presets">
            {AVATAR_PRESETS.map(preset=><button key={preset.id} type="button" aria-label={`${preset.name}: ${preset.description}`} aria-pressed={matches(avatar,preset.avatar)} onClick={()=>onAvatar({...preset.avatar})}>
              <AvatarPreview avatar={preset.avatar} size={48} /><span>{preset.name}</span>
            </button>)}
          </div></fieldset>
          <div className="studio-outfit-row">
            <fieldset className="studio-field"><legend>Головной убор</legend><div className="studio-hats">
              <button type="button" aria-pressed={avatar.hat==='helmet'} onClick={()=>update('hat','helmet')}>Каска</button>
              <button type="button" aria-pressed={avatar.hat==='cap'} onClick={()=>update('hat','cap')}>Кепка</button>
            </div></fieldset>
            <Swatches label="Цвет головного убора" colours={CLOTHES.slice(0,6)} value={hatColour(avatar)} onChange={value=>update('hatColor',value)} />
          </div>
          <Swatches label="Куртка" colours={CLOTHES} value={avatar.jacket} onChange={value=>update('jacket',value)} />
          <Swatches label="Брюки" colours={PANTS} value={avatar.pants} onChange={value=>update('pants',value)} />
          <div className="studio-outfit-row studio-personal-row">
            <Swatches label="Тон кожи" colours={SKIN} value={avatar.skin} onChange={value=>update('skin',value)} />
            <Swatches label="Волосы" colours={HAIR} value={avatar.hair} onChange={value=>update('hair',value)} />
          </div>
        </div>
      </div>
      <footer className="studio-footer"><p>Имя появится в сертификате. Оно остаётся на этом устройстве.</p><button type="button" className="studio-done" onClick={onClose}>Готово <span aria-hidden="true">↗</span></button></footer>
    </div>
  </section>,document.body);
}
