import assert from 'node:assert/strict';
import { Engine } from '../src/game/engine';
import { generateLetterStage,generateFacadeStage,PROFILE_VARIANTS,type Stage,type ZoneKind } from '../src/game/level';
import { TERMS,FACADE_ELEMENTS } from '../src/game/content';

(globalThis as any).window={matchMedia:()=>({matches:false})};
const shapes=new Map<ZoneKind,Set<string>>();
const wings={full:new Set<string>(),short:new Set<string>()};
let maxRise=0,maxSpan=0,maxDepth=0,shortFrames=0;
for(let seed=1;seed<=300;seed++) {
 const stage=generateLetterStage(TERMS[2],seed);
 for(const z of stage.zones) {
  const points=stage.path.filter(p=>p.x>=z.x&&p.x<=z.x+z.w);
  const shape=JSON.stringify(points.map(p=>[p.x-z.x,p.y]));
  if(!shapes.has(z.kind))shapes.set(z.kind,new Set());
  shapes.get(z.kind)!.add(shape);
  assert.equal(z.floor,Math.max(600,...points.map(p=>p.y)),'underground art follows its traversable floor');
  maxDepth=Math.max(maxDepth,z.floor-600);
 }
 for(let i=1;i<stage.path.length;i++) {
  maxRise=Math.max(maxRise,Math.abs(stage.path[i].y-stage.path[i-1].y));
  maxSpan=Math.max(maxSpan,Math.abs(stage.path[i].x-stage.path[i-1].x));
 }
 for(const route of ['full','short'] as const) {
  const facade=generateFacadeStage(route==='short'?FACADE_ELEMENTS.slice(0,3):FACADE_ELEMENTS,seed);
  wings[route].add(JSON.stringify(facade.collectibles.map(c=>[c.x,c.y])));
  assert.equal(facade.collectibles[0].elementId,'portal');
  assert.equal(facade.collectibles[0].x,1660,'both routes start at the main portal');
 }
 assert.deepEqual(stage,generateLetterStage(TERMS[2],seed),'seed reproduces geometry');
}
assert.equal(Object.values(PROFILE_VARIANTS).flat().length,30);
assert.equal(shapes.size,10);
for(const [kind,fingerprints]of shapes)assert.ok(fingerprints.size>=3,`${kind} needs at least three real terrain shapes`);
assert.ok(maxRise<=120);assert.ok(maxSpan<=180);assert.equal(maxDepth,440);
assert.equal(wings.full.size,2);assert.equal(wings.short.size,2);

/** Same normal-input controller used by the existing physics suite, additionally
 * exercising the three-station facade with a narrow camera. No teleport or skip. */
function solveShort(stage:Stage) {
 const e=new Engine({getContext:()=>({})} as any,{jacket:'#4D61F4',pants:'#262626',skin:'#edc79e',hair:'#604331',hat:'helmet'},{onCollect:()=>{}});
 e.W=320;e.viewHeight=450;e.loadStage(stage);
 const tick=(n=1)=>{for(let i=0;i<n;i++){e.update(1/120);shortFrames++}};
 const aim=(x:number)=>{
  const d=x-e.px-20,predicted=e.vx*Math.abs(e.vx)/(2*(e.onGround?3400:1900));
  e.release('ArrowLeft');e.release('ArrowRight');
  if(Math.abs(d-predicted)>2)e.press(d-predicted>0?'ArrowRight':'ArrowLeft');
 };
 tick(2);
 for(const point of stage.path.slice(1)) {
  const surface=stage.platforms[point.platformIndex];
  let arrived=false,jumping=false,jumpedAt=-100;
  for(let i=0;i<480;i++) {
   aim(point.x);
   if(e.onGround&&jumping&&i-jumpedAt>10){e.release('Space');jumping=false;}
   if(e.onGround&&!(e.standing&&Math.abs(e.py+84-surface.y)<1&&point.x>e.standing.x&&point.x<e.standing.x+e.standing.w)&&!jumping) {
    if(e.standing&&point.y>e.standing.y+20&&Math.abs(point.x-e.px-20)<95){e.press('ArrowDown');e.release('Space');}
    else{e.press('Space');jumping=true;jumpedAt=i;}
   }
   if(e.onGround&&Math.abs(e.py+84-surface.y)<1&&Math.abs(e.px+20-point.x)<12) {
    e.release('Space');jumping=false;
    if(Math.abs(e.vx)<70){arrived=true;break;}
   }
   tick();
  }
  assert.ok(arrived,`short facade seed ${stage.seed}: ${point.x},${point.y}`);
  e.clearInput();tick(4);
  if(stage.collectibles.every(c=>c.collected))break;
 }
 assert.ok(stage.collectibles.every(c=>c.collected));assert.equal(e.recoveries,0);
}
for(let seed=1;seed<=64;seed++)solveShort(generateFacadeStage(FACADE_ELEMENTS.slice(0,3),seed));
console.log(JSON.stringify({passed:true,authoredPatterns:30,terrainShapes:Object.fromEntries([...shapes].map(([kind,set])=>[kind,set.size])),facadeRoutes:{full:wings.full.size,short:wings.short.size},maxRise,maxSpan,maxDepth,narrowShortFacadeRuns:64,shortFrames},null,2));
