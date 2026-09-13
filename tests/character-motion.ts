import assert from 'node:assert/strict';
import {sampleRunningArm,sampleRunFoot,RUN_PHASE_PER_PIXEL} from '../src/game/character';

// Regression: independent elbow/wrist tracks used to collapse the forearm.
const distance=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1]);
for(let i=0;i<512;i++){
  const phase=i/512*Math.PI*2;
  for(const offset of [0,Math.PI]){
    const arm=sampleRunningArm([2,-62],phase+offset);
    assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-13)<1e-8,'Upper arm must not stretch');
    assert.ok(Math.abs(distance(arm.elbow,arm.hand)-12)<1e-8,'Forearm must not collapse');
    const upper=[arm.elbow[0]-arm.shoulder[0],arm.elbow[1]-arm.shoulder[1]];
    const lower=[arm.hand[0]-arm.elbow[0],arm.hand[1]-arm.elbow[1]];
    assert.ok(upper[0]*lower[1]-upper[1]*lower[0]<-100,'Elbow must bend forward, never invert');
    assert.ok(arm.hand[1]>arm.shoulder[1]+3,'Running glove must not enter the face');
  }
  const foot=sampleRunFoot(phase),next=sampleRunFoot(phase+.0001);
  if(foot.planted&&next.planted){
    const rootTravel=.0001/RUN_PHASE_PER_PIXEL;
    assert.ok(Math.abs(next.x-foot.x+rootTravel)<1e-8,'Planted foot must not slide');
  }
}
const first=sampleRunningArm([0,0],0),last=sampleRunningArm([0,0],Math.PI*2-1e-6);
assert.ok(distance(first.hand,last.hand)<.001,'Run loop must close without a wrist snap');
console.log('Character motion: 1024 arm poses, fixed bone lengths, elbow direction and planted-foot checks passed');
