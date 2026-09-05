import { Rng } from './rng';
import type { Term, FacadeElement, IconId } from './content';
import { placeFieldStations, type FieldStation } from './fieldwork';
export const W=1280, H=720, GROUND=600;
export interface Platform { x:number; y:number; w:number; h:number; kind:'ground'|'scaffold'|'moving'|'stone'|'beam'; baseX?:number; range?:number; speed?:number; phase?:number; dx?:number; scenery?:string }
export interface Collectible { id:number; x:number; y:number; kind:'letter'|'element'; letter?:string; slot?:number; elementId?:IconId; color:string; collected:boolean; phase:number }
export type ZoneKind='courtyard'|'arcade'|'excavation'|'bridge'|'warehouse'|'garden'|'rooftops'|'aqueduct'|'workshop'|'printyard';
export interface Zone { x:number; w:number; kind:ZoneKind; name:string; floor:number }
export interface RoutePoint { x:number; y:number; platformIndex:number }
export interface Decor { x:number; kind:'lamp'|'tree'|'bench'|'sign'|'bollard'; v:number }
export interface Stage { kind:'letters'|'facade'; seed:number; term?:Term; elements?:FacadeElement[]; platforms:Platform[]; collectibles:Collectible[]; decor:Decor[]; length:number; height:number; ground:number; spawn:{x:number;y:number}; zones:Zone[]; path:RoutePoint[]; fieldStations:FieldStation[] }
type Profile={kind:ZoneKind;name:string;w:number;points:[number,number][];pick:number};
// Authored passages shuffle without replacement. Common entry/exit elevation;
// each passage has a distinct traversal rhythm and silhouette.
export const PROFILES:Profile[]=[
 {kind:'courtyard',name:'Каменный двор',w:840,points:[[170,600],[340,500],[510,500],[680,600]],pick:2},
 {kind:'arcade',name:'Под арками',w:840,points:[[160,600],[330,485],[500,370],[670,485]],pick:2},
 {kind:'excavation',name:'Археологический раскоп',w:1120,points:[[160,720],[320,840],[480,950],[640,840],[800,720],[960,600]],pick:2},
 {kind:'bridge',name:'Временный мост',w:800,points:[[160,600],[320,550],[480,550],[640,600]],pick:2},
 {kind:'warehouse',name:'Склад материалов',w:850,points:[[160,510],[330,400],[500,400],[680,510]],pick:2},
 {kind:'garden',name:'Сад за оградой',w:820,points:[[170,600],[330,520],[490,520],[650,600]],pick:2},
 {kind:'rooftops',name:'Над крышами',w:850,points:[[160,490],[330,380],[500,380],[680,490]],pick:2},
 {kind:'aqueduct',name:'Водоотводная галерея',w:900,points:[[180,710],[360,820],[540,710],[720,600]],pick:1},
 {kind:'workshop',name:'Двор мастерской',w:900,points:[[180,500],[360,500],[540,390],[720,500]],pick:2},
 {kind:'printyard',name:'Печатный двор',w:860,points:[[170,600],[340,490],[510,490],[690,600]],pick:2},
];
function passage(base:Profile,heights:number[],pick:number,step=160):Profile {
 return {...base,w:step*(heights.length+1),points:heights.map((y,i)=>[step*(i+1),y]),pick};
}
/** Thirty authored silhouettes, each with a purposeful rhythm rather than tiny
 * coordinate noise. A reversed passage swaps its entrance/exit and the climb's
 * location. All boundary landings remain within 120 px of street level. */
export const PROFILE_VARIANTS:Record<ZoneKind,Profile[]>=Object.fromEntries(PROFILES.map(base=>{
 const alternatives:Record<ZoneKind,[number[],number][]>={
  courtyard:[[[600,520,420,520,600],2],[[510,510,600,500,600],3]],
  arcade:[[[490,380,270,380,490],2],[[600,500,500,390,500,600],3]],
  excavation:[[[710,820,820,710,600],2],[[710,820,930,1040,930,820,710,600],3]],
  bridge:[[[520,440,440,520],2],[[600,530,600,530,600],3]],
  warehouse:[[[500,500,600,500,400,500],4],[[490,380,270,380,490],2]],
  garden:[[[600,510,600,510,600],3],[[520,440,440,520],2]],
  rooftops:[[[490,380,270,270,380,490],3],[[500,400,500,400,500],3]],
  aqueduct:[[[720,840,960,840,720,600],2],[[710,710,820,820,710,600],3]],
  workshop:[[[490,380,490,600,490,600],2],[[600,500,400,300,400,500],3]],
  printyard:[[[500,400,500,600,500,600],1],[[600,500,390,390,500,600],3]],
 };
 return [base.kind,[base,...alternatives[base.kind].map(([heights,pick])=>passage(base,heights,pick))]];
})) as Record<ZoneKind,Profile[]>;

function reversePassage(profile:Profile):Profile {
 return {...profile,points:[...profile.points].reverse().map(([x,y])=>[profile.w-x,y]),pick:profile.points.length-1-profile.pick};
}
export function generateLetterStage(term:Term,seed:number):Stage {
 const r=new Rng(seed),platforms:Platform[]=[],collectibles:Collectible[]=[],zones:Zone[]=[],path:RoutePoint[]=[];
 const add=(x:number,y:number,w:number,kind:Platform['kind'])=>{path.push({x,y,platformIndex:platforms.length});platforms.push({x:x-w/2,y,w,h:kind==='ground'?540:kind==='stone'?38:18,kind})};
 add(120,600,300,'ground');let x=290;
 const order=[PROFILES[0],...r.shuffle(PROFILES.slice(1))];
 [...term.word].forEach((letter,slot)=>{
  const base=order[slot%order.length];
  // The first courtyard is a stable introduction; later visits can use any route.
  let profile=slot===0?base:r.pick(PROFILE_VARIANTS[base.kind]);
  if(slot!==0&&r.chance(.5))profile=reversePassage(profile);
  zones.push({x:x-50,w:profile.w+50,kind:profile.kind,name:profile.name,floor:Math.max(600,...profile.points.map(p=>p[1]))});
  add(x,600,170,'ground');
  profile.points.forEach(([dx,y],i)=>{
   const px=x+dx,py=y;
   const kind:Platform['kind']=py>=600?(profile.kind==='bridge'?'beam':profile.kind==='excavation'||profile.kind==='aqueduct'?'stone':'ground'):(profile.kind==='rooftops'?'stone':profile.kind==='warehouse'||profile.kind==='workshop'?'beam':'scaffold');
   add(px,py,r.pick([150,160,170]),kind);
   if(profile.kind==='bridge'&&i===1){const lift=platforms[platforms.length-1];lift.kind='moving';lift.baseX=lift.x;lift.range=30;lift.speed=.85;lift.phase=r.range(0,Math.PI*2);}
   if(i===profile.pick)collectibles.push({id:slot,x:px,y:py-60,kind:'letter',letter,slot,color:term.accent,collected:false,phase:r.range(0,6)});
  });
  // Calm passages alternate with exposed routes; high collectibles still invite
  // an optional climb, while the garden provides a forgiving place to practise.
  if(['garden','warehouse','printyard'].includes(profile.kind))platforms.push({x:x-80,y:600,w:profile.w+160,h:500,kind:'ground'});
  x+=profile.w;add(x,600,170,'ground');x+=150;
 });
 add(x,600,280,'ground');
 const fieldStations=placeFieldStations({seed,word:term.word,path,platforms,collectibles});
 return {kind:'letters',seed,term,platforms,collectibles,decor:[],length:x+250,height:1220,ground:600,spawn:{x:100,y:516},zones,path,fieldStations};
}
export function generateFacadeStage(elements:FacadeElement[],seed:number):Stage {
 const r=new Rng(seed^0x55aa),ground=1320,length=3400,platforms:Platform[]=[{x:0,y:ground,w:length,h:100,kind:'ground'}],path:RoutePoint[]=[{x:1500,y:ground,platformIndex:0}];
 const add=(x:number,y:number)=>{path.push({x,y,platformIndex:platforms.length});platforms.push({x:x-100,y,w:200,h:18,kind:'scaffold'})};
 const leftWing=r.chance(.5);
 const points:[number,number][]=[[1660,1320],[1810,1220],[1970,1120],[2130,1020],[2290,920],[2450,820],[2610,720],[2450,620],[2290,520],[2130,420],[1970,320],[1810,420],[1970,520],[1980,620]];
 points.forEach(([x,y],i)=>{if(y===ground)path.push({x,y,platformIndex:0});else add(leftWing&&i>0?length-x:x,y)});
 for(let y=1120;y>=420;y-=100)for(let x=550;x<3100;x+=500)if(!platforms.some(p=>Math.abs(p.x+100-x)<180&&Math.abs(p.y-y)<70))platforms.push({x:x-90,y,w:180,h:18,kind:'scaffold'});
 const stations=elements.length<=3?[1,4,8]:[1,2,4,6,11,14];
 const collectibles=elements.map((el,i)=>{const point=path[stations[i]];return{id:i,x:point.x,y:point.y-60,kind:'element' as const,elementId:el.id,color:el.color,collected:false,phase:r.range(0,6)}});
 return {kind:'facade',seed,elements,platforms,collectibles,decor:[],length,height:1450,ground,spawn:{x:1480,y:ground-84},zones:[{x:0,w:length,kind:'printyard',name:`Типография Сытина · ${leftWing?'левое':'правое'} крыло`,floor:ground}],path,fieldStations:[]};
}
