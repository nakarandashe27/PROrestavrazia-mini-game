// Original, synthesized soundscape. No recordings or network requests.
let context:AudioContext|undefined,master:GainNode|undefined,analyser:AnalyserNode|undefined;
let enabled=true,playing=false,dusk=0,timer:ReturnType<typeof setInterval>|undefined,beat=0;
let scheduled=0;
type WorkSound='brush'|'wood'|'rustle';
type FieldworkSound='brush'|'measure'|'photo'|'complete';
type AmbientVoice={source:AudioScheduledSourceNode;gain:GainNode};
const ambientVoices=new Set<AmbientVoice>();
let workLocation='',workProfile='quiet',ambientCycle:WorkSound[]=['rustle'],ambientEvery=12,nextAmbientBeat=5,ambientIndex=0;
let lastEvent='',lastVoiceAt=-Infinity;
const lastFieldAt:Record<FieldworkSound,number>={brush:-Infinity,measure:-Infinity,photo:-Infinity,complete:-Infinity};
const events={music:0,ambient:0,voice:0,chime:0,jump:0,land:0,step:0,recover:0,fieldwork:0};
const fieldworkEvents:Record<FieldworkSound,number>={brush:0,measure:0,photo:0,complete:0};
const ambientEvents:Record<WorkSound,number>={brush:0,wood:0,rustle:0};
function init(){if(!context){context=new AudioContext();master=context.createGain();master.gain.value=.65;analyser=context.createAnalyser();analyser.fftSize=256;master.connect(analyser);analyser.connect(context.destination);}return context;}
export function unlockSound(){try{const c=init();void c.resume();}catch{}}
function connectVoice(source:AudioScheduledSourceNode,gain:GainNode,at:number,end:number,ambient:boolean,filters:AudioNode[]=[]){
 if(!master)return;gain.connect(master);const voice={source,gain};if(ambient)ambientVoices.add(voice);
 source.start(at);source.stop(end);scheduled++;
 source.onended=()=>{ambientVoices.delete(voice);source.disconnect();gain.disconnect();filters.forEach(filter=>filter.disconnect());};
}
function note(freq:number,at:number,length:number,volume:number,type:OscillatorType='sine',ambient=false){
 if(!context||!master)return;const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.value=freq;
 g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+length);
 o.connect(g);connectVoice(o,g,at,at+length+.02,ambient);
}
function softNoise(at:number,length:number,volume:number,low:number,high:number,ambient=false){
 if(!context||!master)return;
 const source=context.createBufferSource(),gain=context.createGain(),highpass=context.createBiquadFilter(),lowpass=context.createBiquadFilter();
 const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate),samples=buffer.getChannelData(0);
 // Quiet irregular fibres, rather than a looped recording or a hard white-noise burst.
 for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(.62+.24*Math.sin(i/context.sampleRate*37));
 source.buffer=buffer;highpass.type='highpass';highpass.frequency.value=low;highpass.Q.value=.5;lowpass.type='lowpass';lowpass.frequency.value=high;lowpass.Q.value=.5;
 gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+Math.min(.055,length*.3));gain.gain.exponentialRampToValueAtTime(.0001,at+length);
 source.connect(highpass);highpass.connect(lowpass);lowpass.connect(gain);connectVoice(source,gain,at,at+length+.015,ambient,[highpass,lowpass]);
}
function workSound(kind:WorkSound,at:number,volume:number,ambient=false){
 if(kind==='brush'){
  softNoise(at,.34,volume,350,2300,ambient);softNoise(at+.26,.28,volume*.65,450,2500,ambient);
 }else if(kind==='wood'){
  note(172,at,.095,volume*.85,'triangle',ambient);note(690,at,.055,volume*.18,'sine',ambient);
 }else softNoise(at,.57,volume*.8,800,3400,ambient);
}
function stopWorkVoices(){
 if(!context)return;const now=context.currentTime;
 for(const voice of ambientVoices){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.008);try{voice.source.stop(now+.035);}catch{}}
}
/** Pass either a level's ZoneKind or its Russian location label. No location history is retained. */
export function setWorkAmbience(location:string){
 if(location===workLocation)return;
 workLocation=location;const value=location.toLowerCase();
 if(/facade|printyard|workshop|типограф|мастерск|печатн|фасад/.test(value)){workProfile='restoration';ambientCycle=['brush','rustle','wood','brush'];ambientEvery=9;}
 else if(/excavation|раскоп/.test(value)){workProfile='excavation';ambientCycle=['brush','rustle','brush'];ambientEvery=11;}
 else if(/warehouse|bridge|склад|мост/.test(value)){workProfile='timber';ambientCycle=['wood','rustle','wood'];ambientEvery=11;}
 else {workProfile='quiet';ambientCycle=['rustle'];ambientEvery=14;}
 ambientIndex=0;nextAmbientBeat=beat+4;stopWorkVoices();
}
function pulse(){if(!enabled||!playing||context?.state!=='running')return;
 const now=context.currentTime+.035;
 // Spacious pentatonic motif, changing register and spacing toward evening.
 const melody=[0,7,12,16,14,7,4,12,7,16,19,14,12,4,7,0];
 const base=dusk>.55?196:220;const index=melody[beat%melody.length];
 const beforeMusic=scheduled;
 if(beat%2===0||dusk<.5)note(base*Math.pow(2,index/12),now,1.2,.035,'sine');
 if(beat%4===0){note(base/2,now,2,.035,'triangle');note(base*.75,now,2,.013);}
 if(scheduled>beforeMusic)events.music++;
 if(workLocation&&beat>=nextAmbientBeat){
  const kind=ambientCycle[ambientIndex++%ambientCycle.length];
  // Work remains below the melody and gets more spacious in the evening.
  workSound(kind,now+.13,dusk>.55?.009:.012,true);events.ambient++;ambientEvents[kind]++;lastEvent=`ambient:${kind}`;
  nextAmbientBeat=beat+ambientEvery+(dusk>.55?3:0);
 }
 beat++;
}
export function setSoundscape(on:boolean,active:boolean,night:number){
 enabled=on;playing=active;dusk=night;
 if(!context)return;
 const now=context.currentTime;master!.gain.cancelScheduledValues(now);master!.gain.setTargetAtTime(on?(active?.7:.35):0,now,.09);
 if(on&&active&&!timer){pulse();timer=setInterval(pulse,580);}
 if(!on||!active){if(timer){clearInterval(timer);timer=undefined;}stopWorkVoices();}
}
export function chime(on:boolean){if(!on)return;try{unlockSound();const now=context!.currentTime;[523.25,659.25,783.99].forEach((f,i)=>note(f,now+i*.085,.5,.09));events.chime++;lastEvent='chime';}catch{}}
export function actionSound(kind:'jump'|'land'|'step'|'recover',on:boolean){
 if(!on||context?.state!=='running')return;const now=context.currentTime;
 if(kind==='jump'){note(246,now,.11,.016,'triangle');note(330,now+.07,.12,.011);}
 else if(kind==='recover'){[392,440,523].forEach((f,i)=>note(f,now+i*.1,.32,.04));}
 else {note(kind==='land'?73:90,now,kind==='land'?.13:.055,kind==='land'?.032:.018,'triangle');}
 events[kind]++;lastEvent=kind;
}
/** A small two-note cue announces text; it is deliberately not synthetic speech. */
export function voiceCue(on:boolean){
 if(!on||!enabled||context?.state!=='running')return;const now=context.currentTime;
 if(now-lastVoiceAt<.35)return;lastVoiceAt=now;
 note(440,now,.12,.016,'triangle');note(660,now+.055,.12,.009);
 events.voice++;lastEvent='voice';
}
/** Direct mini-game feedback also works while the platformer itself is paused. */
export function fieldworkSound(kind:FieldworkSound,on:boolean){
 if(!on||!enabled||context?.state!=='running')return;const now=context.currentTime;
 const cooldown={brush:.08,measure:.10,photo:.28,complete:.45}[kind];
 if(now-lastFieldAt[kind]<cooldown)return;lastFieldAt[kind]=now;
 if(kind==='brush')workSound('brush',now,.027);
 else if(kind==='measure'){workSound('wood',now,.028);note(880,now+.055,.08,.007);}
 else if(kind==='photo'){softNoise(now,.065,.035,500,3200);note(145,now+.025,.075,.018,'triangle');}
 else [392,523.25,659.25].forEach((freq,i)=>note(freq,now+i*.09,.48,.05));
 events.fieldwork++;fieldworkEvents[kind]++;lastEvent=`fieldwork:${kind}`;
}
export function stopSoundscape(){if(timer)clearInterval(timer);timer=undefined;playing=false;stopWorkVoices();if(context&&master)master.gain.setTargetAtTime(0,context.currentTime,.06);}
export function audioStatus(){let peak=0;if(analyser){const samples=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(samples);for(const s of samples)peak=Math.max(peak,Math.abs(s-128));}return {state:context?.state??'not-started',enabled,playing,scheduled,peak,gain:master?.gain.value??0,location:workLocation,workProfile,activeAmbientSources:ambientVoices.size,lastEvent,events:{...events},fieldworkEvents:{...fieldworkEvents},ambientEvents:{...ambientEvents}};}
