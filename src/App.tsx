import { useCallback, useEffect, useRef, useState } from 'react';
import { Engine } from './game/engine';
import { H, generateFacadeStage, generateLetterStage, type Collectible } from './game/level';
import { FACADE_ELEMENTS, TERMS, SOURCES, type FacadeElement } from './game/content';
import { newSeed } from './game/rng';
import { chime, actionSound, unlockSound, setSoundscape, stopSoundscape, audioStatus, setWorkAmbience, voiceCue } from './game/sound';
import { DEFAULT_AVATAR_PRESET } from './game/avatars';
import type { Avatar } from './game/draw';
import type { FieldStation } from './game/fieldwork';
import { CharacterStudio } from './components/CharacterStudio';
import { Fieldwork, FIELD_NOTES } from './components/Fieldwork';
import type { LightingMode } from './game/lighting';
import { Detail } from './components/Detail';
import { Workshop } from './components/Workshop';
import { Modal } from './components/Modal';
import { Reveal } from './components/Reveal';
import { Certificate } from './components/Certificate';
import { StartSetup, LightingPicker } from './components/StartSetup';
import './setup.css';

type Screen='start'|'studio'|'intro'|'play'|'term'|'workshop'|'fieldwork'|'pause'|'album'|'about'|'end'|'certificate';
type Route='short'|'full';
const AVATAR=DEFAULT_AVATAR_PRESET.avatar;
function Mark(){return <svg viewBox="0 0 40 44" aria-hidden="true"><path fill="#F74C2E" d="M0 30H14V44H0Z"/><path fill="#F28D05" d="M12 16H26V44H12Z"/><path fill="#D0E97E" d="M24 2H38V44H24Z"/></svg>}

export default function App(){
 const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null),engine=useRef<Engine|null>(null);
 const [screen,setScreen]=useState<Screen>('start'),[route,setRoute]=useState<Route>('short'),[phase,setPhase]=useState<1|2>(1),[termIdx,setTermIdx]=useState(0),[seed,setSeed]=useState(newSeed);
 const [count,setCount]=useState(0),[restored,setRestored]=useState<string[]>([]),[current,setCurrent]=useState<FacadeElement|null>(null),[termsDone,setTermsDone]=useState(0);
 const [sound,setSound]=useState(true),[lighting,setLighting]=useState<LightingMode>('cycle'),[assist,setAssist]=useState(false),[seconds,setSeconds]=useState(0),[toast,setToast]=useState('');
 const [playerName,setPlayerName]=useState(''),[avatar,setAvatar]=useState<Avatar>({...AVATAR});
 const [field,setField]=useState<FieldStation|null>(null),[nearby,setNearby]=useState<FieldStation|null>(null),[fieldNotes,setFieldNotes]=useState<FieldStation[]>([]);
 const studioBack=useRef<'start'|'pause'>('start');
 const back=useRef<Screen>('start');
 const state=useRef({screen,phase,termIdx,sound});state.current={screen,phase,termIdx,sound};
 const totalTerms=route==='short'?1:3,totalParts=route==='short'?3:6;
 const onCollect=useCallback((c:Collectible,remaining:number)=>{
  chime(state.current.sound);setCount(n=>n+1);
  if(c.kind==='letter'&&remaining===0){engine.current!.paused=true;engine.current!.clearInput();setTermsDone(n=>n+1);setScreen('term')}
  if(c.kind==='element'){engine.current!.paused=true;engine.current!.clearInput();setCurrent(FACADE_ELEMENTS.find(el=>el.id===c.elementId)!);setScreen('workshop')}
 },[]);

 useEffect(()=>{
  const eng=new Engine(canvas.current!,AVATAR,{onCollect,onAction:kind=>actionSound(kind,state.current.sound),onVoice:()=>voiceCue(state.current.sound),onFieldwork:station=>{setField(station);setNearby(null);setScreen('fieldwork')}});engine.current=eng;
  const resize=()=>{const box=host.current!.getBoundingClientRect();if(!box.width||!box.height)return;const dpr=Math.min(devicePixelRatio||1,2);eng.viewHeight=box.height<380?Math.max(300,Math.round(box.height*1.35)):600;eng.W=Math.max(1,Math.round(box.width/box.height*eng.viewHeight));eng.camY=Math.max(0,Math.min((eng.stage?.height??H)-eng.viewHeight,eng.py+84-eng.viewHeight*.7));eng.camX=Math.max(0,Math.min((eng.stage?.length??eng.W)-eng.W,eng.px-eng.W*.38));eng.dpr=dpr;canvas.current!.width=eng.W*dpr;canvas.current!.height=eng.viewHeight*dpr;};
  const observer=new ResizeObserver(resize);observer.observe(host.current!);resize();eng.start();
  void Promise.all([document.fonts.load('400 24px AdvakenSans-Expanded','РЕСТАВРАЦИЯ'),document.fonts.load('400 14px "Inter Tight"','Типография')]).then(()=>eng.refreshTypography());
  // Development-only readout lets deterministic QA drive the same physics and inputs.
  if(import.meta.env.DEV)Object.assign(window,{__game:eng,__audioStatus:audioStatus});
  return()=>{observer.disconnect();eng.stop();stopSoundscape();engine.current=null};
 },[onCollect]);
 useEffect(()=>{if(engine.current){engine.current.paused=screen!=='play';if(screen!=='play')engine.current.clearInput()}},[screen]);
 useEffect(()=>{if(engine.current){engine.current.setLighting(lighting);engine.current.autoJump=assist;engine.current.setAvatar(avatar)}},[lighting,assist,avatar]);
 useEffect(()=>{setWorkAmbience(engine.current?.location??'');setSoundscape(sound,screen==='play',engine.current?.nightAmount??0)},[sound,screen,seconds]);
 useEffect(()=>{if(screen!=='play'){setNearby(null);return;}const poll=()=>{const next=engine.current?.nearbyStation??null;setNearby(prev=>prev?.id===next?.id?prev:next)};poll();const id=setInterval(poll,150);return()=>clearInterval(id)},[screen]);
 useEffect(()=>{
  const down=(e:KeyboardEvent)=>{
   const s=state.current.screen;
   if(e.code==='Escape'){
    if(s==='play'){setScreen('pause');e.preventDefault()}
    else if(s==='pause')setScreen('play');
    else if(s==='album'||s==='about')setScreen(back.current);
    else if(s==='fieldwork')setScreen('play');
    return;
   }
   if(s==='play'&&!e.repeat){if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyA','KeyD','KeyW','KeyS','KeyR','KeyE'].includes(e.code)){e.preventDefault();engine.current?.press(e.code)}}
  };
  const up=(e:KeyboardEvent)=>engine.current?.release(e.code);
  const blur=()=>{engine.current?.clearInput();if(state.current.screen==='play')setScreen('pause')};
  const visibility=()=>{if(document.hidden)blur()};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 useEffect(()=>{if(screen!=='play')return;const id=setInterval(()=>setSeconds(Math.floor(engine.current?.time??0)),500);return()=>clearInterval(id)},[screen]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(id)},[toast]);

 function load(p:1|2,idx:number,sd=seed){engine.current!.loadStage(p===1?generateLetterStage(TERMS[idx],sd+idx*101):generateFacadeStage(FACADE_ELEMENTS.slice(0,totalParts),sd));setCount(0);setPhase(p);setTermIdx(idx);setScreen('play')}
 function start(p:1|2=1){unlockSound();if(sound)chime(true);const sd=newSeed();setSeed(sd);setPhase(p);setTermIdx(0);setCount(0);setRestored([]);setFieldNotes([]);setField(null);setTermsDone(0);setSeconds(0);setToast('');engine.current!.time=0;engine.current!.restored=0;if(lighting==='cycle')engine.current!.nightAmount=0;setScreen('intro')}
 function nextTerm(){if(termIdx+1<totalTerms)load(1,termIdx+1);else{setPhase(2);setScreen('intro')}}
 function finishDetail(){const result=[...restored,current!.id];setRestored(result);engine.current!.restored=result.length*6/totalParts;chime(sound);if(result.length===totalParts){setSeconds(Math.floor(engine.current!.time));setToast('');setScreen('end')}else{setToast(`${current!.name} — сохранено в альбоме`);setScreen('play')}}
 function open(s:'about'|'album'){back.current=screen;setScreen(s)}
 function regenerate(){const sd=newSeed();setSeed(sd);if(phase===2){setRestored([]);engine.current!.restored=0}load(phase,termIdx,sd);setToast('Новый путь готов. Дворы, высоты и проходы изменились.')}
 function toggleSound(){unlockSound();setSound(s=>!s);if(!sound)chime(true)}
 function openStudio(){studioBack.current=screen==='pause'?'pause':'start';setScreen('studio')}
 function finishField(){if(!field)return;engine.current!.completeFieldwork(field.id);setFieldNotes(notes=>notes.some(n=>n.id===field.id)?notes:[...notes,{...field,completed:true}]);setField(null);setScreen('play')}
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setToast('Полный экран недоступен в этом окне. Игра продолжает работать.')}}
 const inWorld=!['start','studio','about','end','certificate'].includes(screen)||((screen==='about')&&back.current!=='start');
 return <div className="app">
  <header className="topbar"><button className="brand" onClick={()=>{if(screen==='play')setScreen('pause');else if(screen==='start')return;}} aria-label="Архисбор"><Mark/><span>АРХИСБОР<small>ЖИВОЕ НАСЛЕДИЕ</small></span></button><span className="topbar-context">Интерактивная экспедиция <i/> Типография Сытина</span><div className="top-actions"><button className="icon-button" onClick={toggleSound} aria-label={sound?'Выключить звук':'Включить звук'} aria-pressed={sound}>{sound?'♫':'♪'}<span>{sound?'Звук вкл.':'Без звука'}</span></button><button className="icon-button" onClick={fullscreen} aria-label="Полный экран">⛶</button>{screen==='start'?<button className="text-button" onClick={()=>open('about')}>О проекте ↗</button>:screen==='play'?<button className="icon-button" onClick={()=>setScreen('pause')} aria-label="Пауза">Ⅱ</button>:null}</div></header>
  <div className={'world '+(!inWorld?'world-hidden':'')} ref={host}><canvas ref={canvas} aria-label="Игровая сцена. Стрелки влево и вправо — движение, пробел — прыжок, стрелка вниз — спуск."/></div>
  {screen==='start'&&<main className="welcome">
   <div className="hero-art" style={{backgroundImage:`url(${import.meta.env.BASE_URL}images/sytin-hero.png)`}}/><div className="hero-wash"/>
   <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/>ИГРА О ТОМ, ЧТО СТОИТ СОХРАНИТЬ</div><h1>Собери<br/><span className="accent-orange">слово</span> и<br/><span className="accent-blue">фасад</span></h1><p>От первых букв — к деталям фасада.<br/>Отправляйтесь в типографию Сытина<br/>и попробуйте себя в роли реставратора.</p>
    <StartSetup name={playerName} avatar={avatar} onOpen={openStudio} lighting={lighting} onLighting={setLighting}/>
    <div className="route-picker" aria-label="Длина маршрута"><button aria-pressed={route==='short'} onClick={()=>setRoute('short')} className={route==='short'?'active':''}>Знакомство <small>≈ 4–6 мин</small></button><button aria-pressed={route==='full'} onClick={()=>setRoute('full')} className={route==='full'?'active':''}>Экспедиция <small>≈ 8–12 мин</small></button></div>
    <button className="primary start-button" onClick={()=>start()}>Начать путешествие <span>↗</span></button><button className="text-button direct" onClick={()=>start(2)}>Сразу в мастерскую на лесах →</button>
    <div className="hero-meta"><span>6+ <small>рекомендуемый возраст</small></span><span>Без спешки <small>и штрафов за ошибки</small></span></div>
   </div>

   <div className="location-tag"><span className="location-cross">⌖</span><div>МОСКВА, ЗАМОСКВОРЕЧЬЕ<br/><b>Пятницкая, 71/5с1</b></div><span className="location-year">1903</span></div>
   <div className="journey-strip"><div><span>01</span><b>Соберите слово</b><small>Узнайте язык реставрации</small></div><div><span>02</span><b>Исследуйте фасад</b><small>Поднимитесь на леса</small></div><div><span>03</span><b>Сохраните историю</b><small>Восстановите детали</small></div><a href="https://прореставрацию.рф/" target="_blank" rel="noreferrer">ПРО<br/><strong>РЕСТАВРАЦИЮ ↗</strong></a></div>
  </main>}
  {screen==='play'&&<>
   <div className="hud"><div className="chapter"><span className="eyebrow">{phase===1?'01 / путь к типографии':'02 / мастерская на лесах'}</span><b>{phase===1?'Соберите буквы по порядку':'Найдите следующую деталь'}</b></div><div className="progress-area">{phase===1?<div className="letter-slots" aria-label={`Слово ${TERMS[termIdx].word}, собрано ${count} из ${TERMS[termIdx].word.length}`}>
    {[...TERMS[termIdx].word].map((letter,i)=><span key={i} className={i<count?'done':i===count?'next':''}>{letter.toUpperCase()}</span>)}
   </div>:<div className="restoration-progress"><span>{restored.length} <small>/ {totalParts} деталей</small></span><div className="progress-track"><i style={{width:restored.length/totalParts*100+'%'}}/></div></div>}</div><button className="album-button" onClick={()=>open('album')}>▤ <span>Альбом</span><b>{restored.length}</b></button></div>
   {nearby&&<button className="field-action" onClick={()=>engine.current?.interact()} aria-label={`Исследовать: ${nearby.title}`}><kbd>E</kbd><span>{nearby.title}</span><b>↗</b></button>}
   <div className="play-footer"><div className="keyboard-help"><span><kbd>←</kbd><kbd>→</kbd> идти</span><span><kbd>Пробел</kbd> прыжок</span><span><kbd>↓</kbd> спуск</span><span><kbd>R</kbd> вернуться</span><span className="route-caption">{phase===1?`Слово ${termIdx+1} из ${totalTerms}`:'Сохраняем подлинное'}</span></div><div className="touch-controls">
    {(['left','right','jump'] as const).map((key,i)=><button key={key} aria-label={['Идти влево','Идти вправо','Прыжок'][i]} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);engine.current?.touch(key,true)}} onPointerUp={e=>{engine.current?.touch(key,false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>engine.current?.touch(key,false)} onLostPointerCapture={()=>engine.current?.touch(key,false)}>{['←','→','↑'][i]}</button>)}
    <button aria-label="Спуститься с площадки" onPointerDown={()=>engine.current?.press('ArrowDown')}>↓</button>
   </div></div>
  </>}
  {toast&&<div className="toast" role="status">✓ {toast}</div>}
  {screen==='intro'&&<Modal label="Начало этапа"><div className="intro-illustration">{phase===1?<><span>Р</span><span>Е</span><span>С</span><i>→</i></>:<Detail id="portal"/>}</div><span className="eyebrow">{phase===1?'01 / по Пятницкой':'02 / у фасада типографии'}</span><h2>{phase===1?'История начинается с буквы':'Время стать реставратором'}</h2><p>{phase===1?'Собирайте буквы по порядку. Впереди дворы, крыши, мосты и подземные галереи. У полевых станций можно остановиться и исследовать находку: нажмите E или кнопку на экране. Прыгайте через разрывы; после падения вы вернётесь на последнюю площадку с сохранёнными находками.':'Прыгайте по ярусам лесов к пронумерованным деталям. Соберите каждую по образцу и выберите бережный способ работы.'}</p><div className="intro-controls"><div><kbd>← →</kbd><span>Двигайтесь</span></div><div><kbd>Пробел</kbd><span>Удерживайте для высокого прыжка</span></div>{phase===2&&<div><kbd>↓</kbd><span>Спуститесь на ярус ниже</span></div>}</div><label className="check-setting"><input type="checkbox" checked={assist} onChange={e=>setAssist(e.target.checked)}/>Помогать с прыжками <small>герой помогает перепрыгивать разрывы и подниматься на площадки</small></label><button className="primary" onClick={()=>load(phase,termIdx)}>В путь <span>→</span></button><button className="text-button" onClick={()=>setScreen('start')}>На главную</button></Modal>}
  {screen==='term'&&<Modal label="Слово собрано"><span className="round-seal">✓</span><span className="eyebrow">СЛОВО СОБРАНО / {TERMS[termIdx].tag}</span><h2 className="term-title">{TERMS[termIdx].word}</h2><h3>{TERMS[termIdx].short}</h3><p>{TERMS[termIdx].def}</p><div className="reference-note"><p>{TERMS[termIdx].example}</p></div><button className="primary" onClick={nextTerm}>{termIdx+1<totalTerms?'К следующему слову':'К типографии Сытина'} <span>→</span></button></Modal>}
  {screen==='workshop'&&current&&<Modal label={`Реставрация: ${current.name}`} wide><Workshop key={current.id} element={current} seed={seed} sound={sound} onDone={finishDetail}/></Modal>}
  {screen==='pause'&&<Modal label="Пауза"><span className="eyebrow">МОЖНО НЕ ТОРОПИТЬСЯ</span><h2>История подождёт</h2><p>Отдохните или настройте путешествие под себя.</p><div className="settings"><div className="lighting-setting"><span>Время суток</span><LightingPicker value={lighting} onChange={setLighting}/><small>В режиме «День → ночь» свет постепенно меняется по ходу экспедиции.</small></div><label><span>Помощь с прыжками</span><input type="checkbox" checked={assist} onChange={e=>setAssist(e.target.checked)}/></label><label><span>Музыка и звуки</span><input type="checkbox" checked={sound} onChange={toggleSound}/></label><button className="secondary" onClick={openStudio}>Изменить образ героя ↗</button></div><button className="primary" onClick={()=>setScreen('play')}>Продолжить <span>→</span></button><button className="secondary" onClick={()=>{engine.current?.recover();setScreen('play')}}>Вернуться на последнюю площадку</button><button className="secondary" onClick={regenerate}>Новая раскладка этого этапа</button><p className="small">Начнёт текущий этап заново. Маршрут № {seed}.</p><div className="dialog-links"><button className="text-button" onClick={()=>open('about')}>О здании и источниках ↗</button><button className="text-button" onClick={()=>setScreen('start')}>Завершить прогулку</button></div></Modal>}
  {screen==='album'&&<Modal label="Альбом реставратора" wide><div className="modal-heading"><div><span className="eyebrow">КОЛЛЕКЦИЯ НАХОДОК</span><h2>Альбом реставратора</h2></div><button className="close-button" onClick={()=>setScreen(back.current)} aria-label="Закрыть альбом">×</button></div><p>Каждая деталь — маленькая часть большой истории. Сохранено {restored.length} из {totalParts}.</p><section className="field-notebook"><h3>Полевые заметки · {fieldNotes.length}</h3>{fieldNotes.length?<ul>{fieldNotes.map(n=><li key={n.id}>{n.title}<small>{FIELD_NOTES[n.kind]}</small></li>)}</ul>:<p>По пути ищите станции исследования. Клеймо, обмер и снимок сохранятся здесь.</p>}</section><div className="album-grid">{FACADE_ELEMENTS.slice(0,totalParts).map(el=><article key={el.id} className={restored.includes(el.id)?'':'locked'}><Detail id={el.id}/><span className="eyebrow">{restored.includes(el.id)?'✓ СОХРАНЕНО':'ЕЩЁ ПРЕДСТОИТ НАЙТИ'}</span><h3>{el.name}</h3><p>{restored.includes(el.id)?el.def:'Поднимитесь к этой детали на лесах.'}</p></article>)}</div></Modal>}
  {screen==='about'&&<Modal label="О проекте" wide><div className="modal-heading"><div><span className="eyebrow">НАСТОЯЩЕЕ МЕСТО / ИГРОВАЯ ИСТОРИЯ</span><h2>Типография Сытина</h2></div><button className="close-button" onClick={()=>setScreen(back.current)} aria-label="Закрыть информацию">×</button></div><div className="about-grid"><figure><img src="./images/sytin-portal.jpg" alt="Фотография высокого стрельчатого портала типографии Сытина с круглым окном"/><figcaption>Фотография из предоставленных референсов.</figcaption></figure><div><p>Пятницкая улица, 71/5с1, Москва. Здание типографии Ивана Сытина связано с архитектором Адольфом Эрихсоном и инженером Владимиром Шуховым.</p><p>На выставке «ПРОреставрацию» встречаются специалисты и все, кому интересно сохранение наследия. Эта игра знакомит с их подходом: исследовать, беречь подлинное, давать зданию новую жизнь.</p><p className="small">Фасад и детали в игре — художественные упрощения. Иллюстрация заставки создана с помощью ИИ по фотографиям; она не является историческим документом. Сборка фрагментов и повреждения условные. Игра не заменяет профессиональные рекомендации.</p><div className="sources">{SOURCES.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer"><b>{s.title} ↗</b><small>{s.note}</small></a>)}</div></div></div></Modal>}
  {screen==='end'&&<main className="ending"><div className="ending-heading"><span className="eyebrow">ЭКСПЕДИЦИЯ ЗАВЕРШЕНА</span><h1>История <em>продолжается.</em></h1><p className="end-personal">{playerName.trim()||'Юный реставратор'}, вы — хранитель наследия!</p><p>Сохранить дом — значит заметить каждую деталь.</p></div><Reveal/><div className="end-bottom"><div className="end-achievement"><span className="round-seal">✦</span><div><span className="eyebrow">ХРАНИТЕЛЬ НАСЛЕДИЯ</span><h3>{restored.length} деталей · {termsDone} {termsDone===1?'слово':'слова'}</h3><p>{Math.floor(seconds/60)} мин {seconds%60} с активной прогулки. Без спешки.</p></div></div><div className="end-actions"><button className="primary" onClick={()=>setScreen('certificate')}>Именной сертификат <span>↗</span></button><button className="secondary" onClick={()=>open('album')}>Открыть альбом</button><button className="text-button" onClick={()=>{setPlayerName('');setScreen('start')}}>Новое путешествие →</button></div></div></main>}
  {screen==='studio'&&<CharacterStudio name={playerName} onName={setPlayerName} avatar={avatar} onAvatar={setAvatar} onClose={()=>setScreen(studioBack.current)}/>}
  {screen==='fieldwork'&&field&&<Fieldwork key={field.id} station={field} sound={sound} onDone={finishField} onClose={()=>setScreen('play')}/>}
  {screen==='certificate'&&<Certificate name={playerName.trim()||'Юный реставратор'} terms={termsDone} details={restored.length} onClose={()=>setScreen('end')}/>}
 </div>
}
