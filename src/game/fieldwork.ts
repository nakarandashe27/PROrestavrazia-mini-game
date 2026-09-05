import { Rng } from './rng';

export type FieldKind = 'brush' | 'measure' | 'photo';
export interface FieldStation { id:string; kind:FieldKind; title:string; x:number; y:number; completed:boolean }
export const FIELD_STATION_INFO:Record<FieldKind,{title:string;color:string;line:string}>={
 brush:{title:'Клеймо кирпича',color:'#F28D05',line:'Вот и клеймо. Маленькая деталь — большая подсказка!'},
 measure:{title:'Обмер детали',color:'#D0E97E',line:'Размер записан. Теперь форму можно сравнить.'},
 photo:{title:'Фотофиксация',color:'#FFB6FC',line:'Снимок готов. Будет с чем сравнить результат.'},
};
interface StationSite { seed:number; word:string; path:{x:number;y:number;platformIndex:number}[]; platforms:{kind:string}[]; collectibles:{x:number;y:number}[] }

/** Each optional stop uses an already traversable, fixed landing after a letter.
 * A separate RNG leaves the main route's random stream untouched. */
export function placeFieldStations(site:StationSite):FieldStation[]{
 const {path,platforms,collectibles,seed,word}=site;
 if(collectibles.length<4)return [];
 const r=new Rng(seed^0x374bd921),last=collectibles.length-1;
 const after=[1,Math.max(2,Math.floor(last*.5)),Math.max(3,last-2)];
 const kinds:FieldKind[]=['brush','measure','photo'];
 const stations:FieldStation[]=[];
 for(let i=0;i<kinds.length;i++){
  const index=Math.min(after[i],last-1),lo=collectibles[index].x+100,hi=collectibles[index+1].x-100;
  const candidates=path.filter(p=>p.x>=lo&&p.x<=hi&&platforms[p.platformIndex].kind!=='moving'&&
   collectibles.every(c=>Math.hypot(c.x-p.x,c.y-(p.y-44))>=100)&&stations.every(s=>Math.abs(s.x-p.x)>250));
  // The nearest midpoint is a deliberate pause in the letter-to-letter rhythm.
  candidates.sort((a,b)=>Math.abs(a.x-(lo+hi)/2)-Math.abs(b.x-(lo+hi)/2));
  const point=r.pick(candidates.slice(0,Math.min(2,candidates.length)));
  if(!point)continue;
  const kind=kinds[i];
  stations.push({id:seed.toString(36)+':'+word+':'+kind,kind,title:FIELD_STATION_INFO[kind].title,x:point.x,y:point.y-44,completed:false});
 }
 return stations;
}

export const ZONE_LINES:Record<string,string>={
 courtyard:'У каждого двора есть своя история. Присмотримся?',
 arcade:'Арки держат вес и задают ритм. Красиво устроено!',
 excavation:'Здесь история скрывается под землёй. Смотрим под ноги.',
 bridge:'На мосту лучше выбрать момент. Я не спешу.',
 warehouse:'Камень, дерево, металл… У каждого материала свой характер.',
 garden:'Небольшая передышка. Даже исследователю нужен сад.',
 rooftops:'Сверху хорошо видны линии крыш. Но сначала — опора!',
 aqueduct:'Вода должна уходить от стен. Вот зачем нужны эти трубы.',
 workshop:'Сначала изучить деталь, потом работать. Заглянем в мастерскую?',
 printyard:'Когда-то здесь рождались книги. А сегодня — новые открытия.',
};
