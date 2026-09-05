import assert from 'node:assert/strict';
import { Engine } from '../src/game/engine';
import { generateLetterStage,generateFacadeStage } from '../src/game/level';
import { TERMS,FACADE_ELEMENTS } from '../src/game/content';
import { newSeed } from '../src/game/rng';
(globalThis as any).window={matchMedia:()=>({matches:false})};
const avatar={jacket:'#4D61F4',pants:'#262626',skin:'#edc79e',hair:'#604331',hat:'helmet' as const};
const ids=new Set<string>();let stations=0,maxGap=0,oldEventGap=0,newEventGap=0,stages=0;
for(let seed=1;seed<=300;seed++)for(const term of TERMS){
 const s=generateLetterStage(term,seed);stages++;
 assert.equal(s.fieldStations.length,3,'three optional stops for every letter stage');
 assert.deepEqual(s.fieldStations,generateLetterStage(term,seed).fieldStations,'reproducible station placement');
 for(const station of s.fieldStations){
  assert.ok(!ids.has(station.id),'ids do not collapse across seeds or words');ids.add(station.id);stations++;
  const point=s.path.find(p=>p.x===station.x&&p.y===station.y+44);
  assert.ok(point,'station uses a normal route landing');assert.notEqual(s.platforms[point.platformIndex].kind,'moving');
  assert.ok(s.collectibles.every(c=>Math.hypot(c.x-station.x,c.y-station.y)>=100),'no collectible overlap');
  assert.ok(station.x>s.collectibles[1].x&&station.x<s.collectibles.at(-1)!.x,'all stops before the final letter');
 }
 const targets=[0,...s.collectibles.map(c=>c.x)];
 const events=[...targets,...s.fieldStations.map(f=>f.x)].sort((a,b)=>a-b);
 oldEventGap+=(targets.at(-1)!/ (targets.length-1));newEventGap+=(events.at(-1)!/(events.length-1));
 for(let i=1;i<s.path.length;i++)maxGap=Math.max(maxGap,s.path[i].x-s.path[i-1].x);
}
assert.equal(generateFacadeStage(FACADE_ELEMENTS,42).fieldStations.length,0);
assert.ok(maxGap<=180);

let interactions=0,frames=0,voices=0;
for(let seed=1;seed<=10;seed++)for(const term of TERMS){
 const stage=generateLetterStage(term,seed);
 const e=new Engine({getContext:()=>({})} as any,avatar,{onCollect:()=>{},onVoice:()=>voices++,onFieldwork:s=>{
  assert.equal(e.paused,true,'pause precedes UI callback');assert.deepEqual(e.input,{left:false,right:false,jump:false});
  const before=voices;e.completeFieldwork(s.id);assert.equal(s.completed,true);assert.equal(voices,before+1);
  e.completeFieldwork(s.id);assert.equal(voices,before+1,'completion is idempotent');interactions++;
 }});
 e.loadStage(stage);e.paused=false;
 const tick=(n=1)=>{for(let i=0;i<n;i++){e.update(1/120);frames++}};
 const aim=(x:number)=>{const d=x-e.px-20,pred=e.vx*Math.abs(e.vx)/(2*(e.onGround?3400:1900));e.release('ArrowLeft');e.release('ArrowRight');if(Math.abs(d-pred)>2)e.press(d-pred>0?'ArrowRight':'ArrowLeft');};
 tick(2);
 for(const point of stage.path.slice(1)){
  const surface=stage.platforms[point.platformIndex];let arrived=false,jumping=false,jumpedAt=-100;
  for(let i=0;i<480;i++){
   aim(point.x);if(e.onGround&&jumping&&i-jumpedAt>10){e.release('Space');jumping=false;}
   if(e.onGround&&!(e.standing&&Math.abs(e.py+84-surface.y)<1&&point.x>e.standing.x&&point.x<e.standing.x+e.standing.w)&&!jumping){
    if(e.standing&&point.y>e.standing.y+20&&Math.abs(point.x-e.px-20)<95){e.press('ArrowDown');e.release('Space');}
    else{e.press('Space');jumping=true;jumpedAt=i;}
   }
   if(e.onGround&&Math.abs(e.py+84-surface.y)<1&&Math.abs(e.px+20-point.x)<12){e.release('Space');jumping=false;if(Math.abs(e.vx)<70){arrived=true;break;}}
   tick();
  }
  assert.ok(arrived,'station itinerary uses actual jumps and landings');e.clearInput();tick(4);
  if(e.nearbyStation){
   e.onGround=false;assert.equal(e.interact(),false,'cannot interact in air');e.onGround=true;
   e.paused=true;assert.equal(e.interact(),false,'paused input ignored');e.paused=false;
   const before=interactions;e.press('KeyE');assert.equal(interactions,before+1);assert.equal(e.nearbyStation,null);e.paused=false;
  }
  if(stage.collectibles.every(c=>c.collected))break;
 }
 assert.equal(stage.fieldStations.filter(s=>s.completed).length,3);assert.equal(e.recoveries,0);assert.ok(stage.collectibles.every(c=>c.collected));
 const saved=stage.fieldStations.map(s=>s.completed);e.recover();assert.deepEqual(stage.fieldStations.map(s=>s.completed),saved,'recovery retains field notes');
}
assert.equal(interactions,90);

const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
const storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
let stored='123';
try{
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored,setItem:(_key:string,value:string)=>stored=value}});
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:(a:Uint32Array)=>{a[0]=123;return a;}}});
 let previous=Number(stored);
 for(let i=0;i<100;i++){const current=newSeed();assert.notEqual(current,previous,'repeated entropy still cannot repeat last visitor');assert.equal(stored,String(current));assert.ok(current>0&&current<=0xffffffff);previous=current;}
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:()=>{throw new Error('Unavailable offline');}}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw new Error('Storage blocked');}});
 for(let i=0;i<100;i++){const current=newSeed();assert.notEqual(current,previous,'fallback and denied storage remain playable');assert.ok(current>0);previous=current;}
}finally{
 if(cryptoDescriptor)Object.defineProperty(globalThis,'crypto',cryptoDescriptor);else delete (globalThis as any).crypto;
 if(storageDescriptor)Object.defineProperty(globalThis,'localStorage',storageDescriptor);else delete (globalThis as any).localStorage;
}
console.log(JSON.stringify({passed:true,stages,stations,uniqueStationIds:ids.size,realInputRoutes:30,interactions,frames,voices,seedFailureChecks:200,maxPathGap:maxGap,meanLetterGap:Math.round(oldEventGap/stages),meanGapWithStations:Math.round(newEventGap/stages)},null,2));
