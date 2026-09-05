import assert from 'node:assert/strict';
import { Engine } from '../src/game/engine';
import { generateLetterStage, generateFacadeStage, type Stage } from '../src/game/level';
import { TERMS,FACADE_ELEMENTS } from '../src/game/content';
(globalThis as any).window={matchMedia:()=>({matches:false})};
const avatar={jacket:'#4D61F4',pants:'#262626',skin:'#edc79e',hair:'#604331',hat:'helmet' as const};
let pickups=0,frames=0;
function make(stage:Stage){const e=new Engine({getContext:()=>({})} as any,avatar,{onCollect:()=>pickups++});e.loadStage(stage);return e}
function tick(e:Engine,n=1){for(let i=0;i<n;i++){e.update(1/120);frames++}}
function aim(e:Engine,x:number){const d=x-e.px-20;const predicted=e.vx*Math.abs(e.vx)/(2*(e.onGround?3400:1900));e.release('ArrowLeft');e.release('ArrowRight');if(Math.abs(d-predicted)>2)e.press(d-predicted>0?'ArrowRight':'ArrowLeft')}
function solve(stage:Stage){const e=make(stage);tick(e,2);
 for(const point of stage.path.slice(1)){
  const surface=stage.platforms[point.platformIndex];
  let arrived=false,jumping=false,jumpedAt=-100;
  for(let i=0;i<480;i++){
   aim(e,point.x); if(e.onGround&&jumping&&i-jumpedAt>10){e.release('Space');jumping=false;}
   if(e.onGround&&!(e.standing&&Math.abs(e.py+84-surface.y)<1&&point.x>e.standing.x&&point.x<e.standing.x+e.standing.w)&&!jumping){if(e.standing&&point.y>e.standing.y+20&&Math.abs(point.x-e.px-20)<95){e.press('ArrowDown');e.release('Space')}else{e.press('Space');jumping=true;jumpedAt=i;}}
   if(e.onGround&&Math.abs(e.py+84-surface.y)<1&&Math.abs(e.px+20-point.x)<12){e.release('Space');jumping=false;if(Math.abs(e.px+20-point.x)<12&&Math.abs(e.vx)<70){arrived=true;break;}}

   tick(e);
  }
  assert.ok(arrived,`seed ${stage.seed} ${stage.kind} point ${point.x},${point.y}; hero ${e.px},${e.py}, standing ${e.standing?.x},${e.standing?.y}`);
  e.clearInput();tick(e,4);
  if(stage.collectibles.every(c=>c.collected))break;
 }
 assert.ok(stage.collectibles.every(c=>c.collected),'all ordered pickups');
 assert.equal(e.recoveries,0,'no hidden respawns on successful path');
}
const fingerprints=new Set<string>(),types=new Set<string>();
for(let seed=1;seed<=100;seed++){
 for(const t of TERMS){const s=generateLetterStage(t,seed);solve(s);s.zones.forEach(z=>types.add(z.kind));}
 solve(generateFacadeStage(FACADE_ELEMENTS,seed));
 fingerprints.add(JSON.stringify(generateLetterStage(TERMS[0],seed)));
}
assert.equal(types.size,10);assert.equal(fingerprints.size,100);
assert.deepEqual(generateLetterStage(TERMS[0],71),generateLetterStage(TERMS[0],71));
const e=make(generateLetterStage(TERMS[0],42));tick(e,2);
e.px=e.stage!.collectibles[1].x-20;e.py=e.stage!.collectibles[1].y-42;tick(e);assert.equal(e.stage!.collectibles[1].collected,false,'ordered pickup');
e.stage!.collectibles[0].collected=true;e.py=e.stage!.height+101;tick(e);assert.equal(e.recoveries,1);assert.equal(e.stage!.collectibles[0].collected,true,'fall retains findings');assert.equal(e.py,e.checkpoint.y);
e.press('Space');e.press('ArrowRight');e.loadStage(generateLetterStage(TERMS[1],43));assert.deepEqual(e.input,{left:false,right:false,jump:false});
// A released jump is materially lower than a held jump. Both use real inputs.
function height(held:boolean){const g=make(generateLetterStage(TERMS[0],1));tick(g,2);g.press('Space');tick(g);if(!held)g.release('Space');let min=g.py;for(let i=0;i<100;i++){tick(g);min=Math.min(min,g.py)}return 516-min}
assert.ok(height(true)>height(false)+50);
console.log(JSON.stringify({passed:true,routes:400,seeds:100,locationTypes:types.size,pickups,physicsFrames:frames,checks:['walk/jump reachability','no respawns in valid traversal','ordered letters','seed reproduction','fall recovery retains progress','variable jump','input reset']},null,2));
