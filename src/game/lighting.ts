import type { Palette } from './draw';
export type LightingMode='day'|'night'|'cycle';
export function mixColor(a:string,b:string,t:number){
 if(!/^#[0-9a-f]{6}$/i.test(a)||!/^#[0-9a-f]{6}$/i.test(b))return t<.5?a:b;
 return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
export function mixPalette(day:Palette,night:Palette,t:number):Palette{
 const p={...day};for(const key of Object.keys(day) as (keyof Palette)[]){if(key==='houses')p.houses=day.houses.map((v,i)=>mixColor(v,night.houses[i],t));else p[key]=mixColor(day[key],night[key],t);}
 // A warm horizon passes through dusk before becoming deep blue.
 const dusk=Math.sin(t*Math.PI);
 p.skyBottom=mixColor(p.skyBottom,'#d99881',dusk*.38);return p;
}
export function cycleTarget(time:number,facade:boolean,restored:number){
 const progress=Math.max(0,Math.min(1,Math.max((time-30)/150,facade?.4+restored/6*.6:0)));
 return progress*progress*(3-2*progress);
}
