import { AvatarPreview } from './AvatarPreview';
import type { Avatar } from '../game/draw';
import type { LightingMode } from '../game/lighting';
export const LIGHT_OPTIONS:{value:LightingMode;label:string}[]=[{value:'day',label:'День'},{value:'night',label:'Ночь'},{value:'cycle',label:'День → ночь'}];
export function LightingPicker({value,onChange}:{value:LightingMode;onChange:(v:LightingMode)=>void}){
 return <div className="lighting-picker" role="group" aria-label="Время суток">{LIGHT_OPTIONS.map(o=><button type="button" key={o.value} aria-pressed={value===o.value} onClick={()=>onChange(o.value)}>{o.label}</button>)}</div>
}
export function StartSetup({name,avatar,onOpen,lighting,onLighting}:{name:string;avatar:Avatar;onOpen:()=>void;lighting:LightingMode;onLighting:(m:LightingMode)=>void}){
 return <section className="expedition-setup" aria-label="Подготовка к путешествию">
  <button className="open-studio" onClick={onOpen} aria-label="Создать своего героя"><AvatarPreview avatar={avatar}/><span><b>{name.trim()||'Создайте своего героя'}</b><small>{name.trim()?'Изменить имя и образ':'Имя, головной убор и цвета одежды'}</small></span><i aria-hidden="true">↗</i></button>
  <div className="setup-light"><span>Свет</span><LightingPicker value={lighting} onChange={onLighting}/></div>
 </section>
}
