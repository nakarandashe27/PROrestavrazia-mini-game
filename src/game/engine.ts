import { H, GROUND, type Stage, type Collectible, type Platform } from './level';
import { paintFacade } from './facade';
import { drawTerrain, drawLocationBackdrop } from './environment';
import { RUN_PHASE_PER_PIXEL } from './character';
import { mixPalette, cycleTarget, type LightingMode } from './lighting';
import { FACADE_ELEMENTS } from './content';
import { FIELD_STATION_INFO, ZONE_LINES, type FieldStation } from './fieldwork';
import {
  DAY,
  NIGHT,
  STRIP_W,
  buildStrip,
  drawFar,
  drawDecor,
  drawScaffold,
  drawPlayer,
  DISPLAY_FONT,
  TEXT_FONT,
  type Avatar,
  type Palette,
} from './draw';

const G = 2500;
const SPEED = 350;
const JUMP = 880;
const PW = 40;
const PH = 84;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  r: number;
}

export interface EngineCallbacks {
  onCollect: (c: Collectible, remaining: number) => void;
  onAction?: (kind:'jump'|'land'|'step'|'recover')=>void;
  onFieldwork?: (station:FieldStation)=>void;
  onVoice?: ()=>void;
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stage: Stage | null = null;
  avatar: Avatar;
  lighting:LightingMode='cycle';
  nightAmount=0;
  get night(){return this.nightAmount>.5;}
  set night(value:boolean){this.setLighting(value?'night':'day');}
  setLighting(mode:LightingMode){this.lighting=mode;if(mode!=='cycle')this.nightAmount=mode==='night'?1:0;}
  cb: EngineCallbacks;
  /** логическая ширина сцены — подстраивается под соотношение сторон окна */
  W = 1280;
  viewHeight = H;
  dpr = 1;

  px = 120;
  py = GROUND - PH;
  vx = 0;
  vy = 0;
  facing = 1;
  onGround = false;
  standing: Platform | null = null;
  run = 0;
  landing = 0;
  recoveries = 0;
  checkpoint = { x:120, y:GROUND-PH };
  private cameraFloor = 0;
  coyote = 0;
  jumpBuffer = 0;
  camX = 0;
  camY = 0;
  time = 0;
  restored = 0;
  autoJump = false;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private dropTimer = 0;
  private accumulator = 0;

  input = { left: false, right: false, jump: false };
  private jumpQueued = false;

  paused = true;
  private raf = 0;
  private last = 0;
  private particles: Particle[] = [];
  private stripDay: HTMLCanvasElement | null = null;
  private stripNight: HTMLCanvasElement | null = null;
  private toast: { text: string; t: number } | null = null;
  private speech:{text:string;t:number}|null=null;
  private voiceCooldown=0;
  private visitedZones=new Set<number>();
  private duskMentioned=false;
  private indicatorBounds:{x:number;y:number;w:number;h:number}|null=null;
  private targetBounds:{x:number;y:number;w:number;h:number}|null=null;

  constructor(canvas: HTMLCanvasElement, avatar: Avatar, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.avatar = avatar;
    this.cb = cb;
    this.loop = this.loop.bind(this);
  }

  /* ---------- управление ---------- */
  press(key: string) {
    if (key === 'KeyE' || key === 'e' || key === 'E') { this.interact(); return; }
    if (key === 'KeyR') { this.recover(); return; }
    if ((key === 'ArrowDown' || key === 'KeyS') && this.standing?.kind!=='ground') { this.dropTimer = .23; this.onGround = false; this.coyote=0; this.jumpBuffer=0; }
    if (key === 'ArrowLeft' || key === 'KeyA') this.input.left = true;
    if (key === 'ArrowRight' || key === 'KeyD') this.input.right = true;
    if (key === 'ArrowUp' || key === 'KeyW' || key === 'Space') {
      if (!this.input.jump) this.jumpQueued = true;
      this.input.jump = true;
    }
  }
  release(key: string) {
    if (key === 'ArrowLeft' || key === 'KeyA') this.input.left = false;
    if (key === 'ArrowRight' || key === 'KeyD') this.input.right = false;
    if (key === 'ArrowUp' || key === 'KeyW' || key === 'Space') this.input.jump = false;
  }
  touch(what: 'left' | 'right' | 'jump', down: boolean) {
    if (what === 'jump') {
      if (down && !this.input.jump) this.jumpQueued = true;
      this.input.jump = down;
    } else this.input[what] = down;
  }
  clearInput() {
    this.input = { left: false, right: false, jump: false };
    this.jumpQueued = false;
  }

  /* ---------- жизненный цикл ---------- */
  loadStage(stage: Stage) {
    this.stage = stage;
    this.px = stage.spawn.x;
    this.py = stage.spawn.y;
    this.checkpoint = { ...stage.spawn };
    this.recoveries = 0;
    this.vx = 0;
    this.vy = 0;
    this.camX = 0;
    this.camY = Math.max(0,Math.min(stage.height-this.viewHeight,this.py+PH-this.viewHeight*.70));
    this.camX=Math.max(0,Math.min(stage.length-this.W,this.px-this.W*.38));
    this.cameraFloor=this.camY;
    this.onGround = false;
    this.standing = null;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.dropTimer = 0;
    this.accumulator = 0;
    this.clearInput();
    this.facing = 1;
    this.particles = [];
    this.toast = null;
    this.speech=null;
    this.voiceCooldown=0;
    this.visitedZones.clear();
    this.duskMentioned=this.nightAmount>=.35;
  }
  setNight(n: boolean) {
    this.night = n;
  }
  setAvatar(a: Avatar) {
    this.avatar = a;
  }
  start() {
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }
  stop() {
    cancelAnimationFrame(this.raf);
  }
  refreshTypography() {
    this.stripDay=null;
    this.stripNight=null;
  }
  say(text: string) {
    this.toast = { text, t: 2.5 };
  }
  private speak(text:string,important=false){
    if(!important&&this.voiceCooldown>0)return;
    this.speech={text,t:4.2};this.voiceCooldown=8;
    this.cb.onVoice?.();
  }
  get nearbyStation():FieldStation|null {
    if(!this.onGround)return null;
    const cx=this.px+PW/2,cy=this.py+PH/2;
    let best:FieldStation|null=null,distance=110;
    for(const station of this.stage?.fieldStations??[]){
      if(station.completed)continue;
      const d=Math.hypot(station.x-cx,station.y-cy);
      if(d<=distance){best=station;distance=d;}
    }
    return best;
  }
  interact():boolean {
    if(this.paused||!this.cb.onFieldwork)return false;
    const station=this.nearbyStation;
    if(!station)return false;
    this.paused=true;this.clearInput();this.vx=0;
    this.speech=null;
    this.cb.onFieldwork(station);
    return true;
  }
  completeFieldwork(id:string):void {
    const station=this.stage?.fieldStations.find(s=>s.id===id);
    if(!station||station.completed)return;
    station.completed=true;
    this.burst(station.x,station.y,14,FIELD_STATION_INFO[station.kind].color,3);
    this.speak(FIELD_STATION_INFO[station.kind].line,true);
  }
  recover() {
    this.px=this.checkpoint.x; this.py=this.checkpoint.y;
    this.vx=0; this.vy=0; this.onGround=false; this.standing=null;
    this.clearInput(); this.dropTimer=0; this.jumpBuffer=0;
    this.recoveries++;
    this.cb.onAction?.('recover');
    this.camX=Math.max(0,Math.min((this.stage?.length??this.W)-this.W,this.px-this.W*.4));
    this.camY=Math.max(0,Math.min((this.stage?.height??H)-this.viewHeight,this.py+PH-this.viewHeight*.7));
    this.cameraFloor=this.camY;
    this.toast=null;
    this.speak('Ничего страшного. Попробую ещё раз, находки со мной.',true);
  }
  get location() { return this.stage?.zones.find(z=>this.px>=z.x&&this.px<z.x+z.w)?.name??'Путь к типографии'; }

  private loop(now: number) {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) {
      this.accumulator += dt;
      while (this.accumulator >= 1/120 && !this.paused) { this.update(1/120); this.accumulator -= 1/120; }
    } else this.accumulator = 0;
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------- физика ---------- */
  update(dt: number) {
    const st = this.stage;
    if (!st) return;
    this.time += dt;
    this.voiceCooldown=Math.max(0,this.voiceCooldown-dt);
    if(this.speech){this.speech.t-=dt;if(this.speech.t<=0)this.speech=null;}
    if(this.lighting==='cycle'){
      const target=cycleTarget(this.time,st.kind==='facade',this.restored);
      this.nightAmount+=(target-this.nightAmount)*(1-Math.exp(-dt*.4));
    }
    if(this.nightAmount>=.35&&!this.duskMentioned&&this.voiceCooldown<=0){
      this.duskMentioned=true;
      this.speak('Свет становится мягче. Фасад вечером совсем другой.');
    }
    this.landing=Math.max(0,this.landing-dt*5);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }

    // подвижные платформы
    for (const p of st.platforms) {
      if (p.kind === 'moving') {
        const nx = p.baseX! + Math.sin(this.time * p.speed! + p.phase!) * p.range!;
        p.dx = nx - p.x;
        p.x = nx;
      }
    }

    const ax = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const targetSpeed=ax*SPEED;
    const acceleration=this.onGround?(ax?2600:3400):1900;
    this.vx+=Math.max(-acceleration*dt,Math.min(acceleration*dt,targetSpeed-this.vx));
    // Keep the stride facing its actual travel while braking into a turn.
    if (Math.abs(this.vx) > 10) this.facing = Math.sign(this.vx);
    else if (ax !== 0) this.facing = ax;
    if (this.autoJump && this.onGround && ax !== 0) {
      const feet=this.py+PH,center=this.px+PW/2;
      const higher=st.platforms.some(p=>p.y<feet-15&&p.y>=feet-130&&(p.x+p.w/2-center)*ax>15&&(p.x+p.w/2-center)*ax<175);
      const probe=center+ax*65;
      const safeAhead=st.platforms.some(p=>Math.abs(p.y-feet)<12&&probe>p.x+6&&probe<p.x+p.w-6);
      if (higher||!safeAhead) this.jumpQueued = true;
    }

    if (this.jumpQueued) {
      this.jumpBuffer = 0.12;
      this.jumpQueued = false;
    }
    this.jumpBuffer -= dt;
    if (this.onGround) this.coyote = 0.1;
    else this.coyote -= dt;

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -JUMP;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.burst(this.px + PW / 2, this.py + PH, 6, '#ffffff', 2);
      this.cb.onAction?.('jump');
    }
    // переменная высота прыжка
    if (!this.input.jump && !this.autoJump && this.vy < 0) this.vy += G * 1.4 * dt;
    this.vy += G * dt;
    if (this.vy > 1500) this.vy = 1500;

    if (this.onGround && this.standing?.kind === 'moving') this.px += this.standing.dx ?? 0;

    this.px += this.vx * dt;
    this.px = Math.max(0, Math.min(st.length - PW, this.px));

    const prevBottom = this.py + PH;
    this.py += this.vy * dt;

    this.onGround = false;
    this.standing = null;
    if (this.vy >= 0) {
      let floor:Platform|null=null;
      for (const p of st.platforms) {
        if ((p.kind === 'scaffold'||p.kind==='moving'||p.kind==='beam') && this.dropTimer > 0) continue;
        if (this.px + PW > p.x + 6 && this.px < p.x + p.w - 6 && prevBottom <= p.y + 1 && this.py + PH >= p.y) {
          if(!floor||p.y<floor.y)floor=p;
        }
      }
      if(floor){
          if(this.vy>300){this.landing=Math.min(1,this.vy/1100);this.cb.onAction?.('land');}
          this.py = floor.y - PH;
          this.vy = 0;
          this.onGround = true;
          this.standing = floor;
          if(floor.kind!=='moving' && st.path.some(n=>st.platforms[n.platformIndex]===floor)){
            this.checkpoint={x:Math.max(0,Math.min(st.length-PW,floor.x+floor.w/2-PW/2)),y:floor.y-PH};
          }
      }
    }
    if(this.py>st.height+100){this.recover();return;}
    if (this.onGround && Math.abs(this.vx)>10){
      const oldStep=Math.floor(this.run/Math.PI);
      this.run+=Math.abs(this.vx)*dt*RUN_PHASE_PER_PIXEL;
      if(Math.floor(this.run/Math.PI)!==oldStep)this.cb.onAction?.('step');
    }
    else if (this.onGround) this.run = 0;

    const zone=st.zones.find(z=>this.px+PW/2>=z.x&&this.px+PW/2<z.x+z.w);
    if(zone&&!this.visitedZones.has(zone.x)){
      this.visitedZones.add(zone.x);
      this.speak(st.kind==='facade'?'Вот она, типография. Начнём с портала!':ZONE_LINES[zone.kind]);
    }

    // сбор
    const cx = this.px + PW / 2;
    const cy = this.py + PH / 2;
    for (const c of st.collectibles) {
      if (c.collected) continue;
      if (st.collectibles.find(k => !k.collected)?.id !== c.id) continue;
      const bob = this.reducedMotion ? 0 : Math.sin(this.time * 3 + c.phase) * 6;
      const dx = c.x - cx;
      const dy = c.y + bob - cy;
      if (dx * dx + dy * dy < 52 * 52) {
        c.collected = true;
        this.burst(c.x, c.y, 18, c.color, 4);
        this.burst(c.x, c.y, 8, '#ffffff', 3);
        const remaining = st.collectibles.filter((k) => !k.collected).length;
        this.cb.onCollect(c, remaining);
        break;
      }
    }

    // частицы
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 900 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // камера
    const W = this.W;
    const target = Math.max(0, Math.min(st.length - W, this.px - W * (this.facing>0?.38:.62)));
    this.camX += (target - this.camX) * (1 - Math.exp(-7 * dt));
    // A jump-sized window avoids pumping the entire world up and down.
    // Reframe at landings; follow early when approaching a screen boundary.
    if(this.onGround)this.cameraFloor=this.py+PH-this.viewHeight*.7;
    if(this.py<this.camY+this.viewHeight*.23)this.cameraFloor=this.py-this.viewHeight*.23;
    if(this.py+PH>this.camY+this.viewHeight*.82)this.cameraFloor=this.py+PH-this.viewHeight*.82;
    const targetY=Math.max(0,Math.min(st.height-this.viewHeight,this.cameraFloor));
    this.camY+=(targetY-this.camY)*(1-Math.exp(-8*dt));
  }

  private burst(x: number, y: number, n: number, color: string, r: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 120 + Math.random() * 260;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.5 + Math.random() * 0.4, color, r: r * (0.6 + Math.random()) });
    }
  }

  /* ---------- рендер ---------- */
  render() {
    const ctx = this.ctx;
    const amount=this.nightAmount;
    const p: Palette = mixPalette(DAY,NIGHT,amount);
    const st = this.stage;
    const W = this.W;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, -this.camY*this.dpr);

    // небо
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(1, p.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, this.camY, W, this.viewHeight);
    if (amount>0) {
      ctx.save();ctx.globalAlpha=amount;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 331 + 77) % W) - ((this.camX * 0.02) % W);
        const sy = (i * 197) % 360;
        ctx.fillRect(((sx % W) + W) % W, sy, 2, 2);
      }
      ctx.fillStyle = '#F7F7F7';
      ctx.beginPath();
      ctx.arc(1100 - this.camX * 0.03, 110, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawFar(ctx, this.camX, p, W);

    // полоса фасадов
    if (st?.kind === 'facade') {
      this.litLayers(ctx,night=>paintFacade(ctx,70-this.camX,120,3260,1200,night,this.restored));
    } else {
      this.litLayers(ctx,night=>{
        const strip=night?(this.stripNight??=buildStrip(true)):(this.stripDay??=buildStrip(false));
        const off=-((this.camX*.45)%STRIP_W);
        for(let k=-1;k<=Math.ceil(W/STRIP_W)+1;k++)ctx.drawImage(strip,off+k*STRIP_W,0);
      });
    }

    if (!st) return;
    this.litLayers(ctx,night=>drawLocationBackdrop(ctx,st,this.camX,W,night,this.time));

    ctx.save();
    ctx.translate(-this.camX, 0);
    this.litLayers(ctx,night=>drawTerrain(ctx,st,this.camX,W,night,this.time));
    if(st.kind==='facade'){
      ctx.save();ctx.strokeStyle=this.night?'#a2b1b080':'#576d7570';ctx.lineWidth=2;
      ctx.beginPath();
      for(let sx=550;sx<3200;sx+=250){
        ctx.moveTo(sx,200);ctx.lineTo(sx,st.ground);
        for(let sy=220;sy<st.ground;sy+=200){ctx.moveTo(sx,sy);ctx.lineTo(sx+250,Math.min(st.ground,sy+200));ctx.moveTo(sx,sy);ctx.lineTo(sx+250,sy);}
      }
      ctx.stroke();ctx.restore();
    }

    // декор
    for (const d of st.decor) {
      if (d.x < this.camX - 200 || d.x > this.camX + W + 200) continue;
      drawDecor(ctx, d.kind, d.x, d.v, p, this.night);
    }
    // платформы
    for (const pl of st.platforms) {
      if (pl.kind !== 'scaffold' && pl.kind !== 'moving') continue;
      if (pl.x + pl.w < this.camX - 50 || pl.x > this.camX + W + 50) continue;
      drawScaffold(ctx, pl.x, pl.y, pl.w, p, pl.kind === 'moving', st.ground,st.kind!=='facade');
    }
    // предметы
    this.targetBounds=null;
    this.drawFieldStations(ctx,st);
    for (const c of st.collectibles) {
      if (c.collected) continue;
      if (c.x < this.camX - 100 || c.x > this.camX + W + 100) continue;
      this.drawCollectible(ctx, c);
    }
    // игрок
    drawPlayer(ctx, this.px, this.py, this.facing, this.run, this.onGround, this.avatar, this.vy, {speed:this.vx,time:this.time,landing:this.landing});
    // частицы
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (amount>0) {
      ctx.fillStyle = `rgba(10,10,20,${amount*.12})`;
      ctx.fillRect(0, this.camY, W, this.viewHeight);
    }

    this.drawIndicator(ctx, st);
    this.drawRoute(ctx,st);
    this.drawToast(ctx);
    this.drawSpeech(ctx);
  }
  private drawFieldStations(ctx:CanvasRenderingContext2D,st:Stage){
    const nearby=this.nearbyStation;
    for(const station of st.fieldStations){
      if(station.x<this.camX-80||station.x>this.camX+this.W+80)continue;
      const {x,y,kind,completed}=station,active=nearby?.id===station.id;
      ctx.save();ctx.globalAlpha=completed?.55:1;
      // Small work marker and narrow pedestal stay visually distinct from letters.
      ctx.fillStyle='#53676c';ctx.fillRect(x-2,y+16,4,27);ctx.fillRect(x-13,y+40,26,4);
      ctx.fillStyle=completed?'#D0E97E':FIELD_STATION_INFO[kind].color;
      roundRect(ctx,x-22,y-20,44,39,8);ctx.fill();ctx.strokeStyle='#263c43';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='#263c43';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';
      if(completed){ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x-2,y+6);ctx.lineTo(x+10,y-7);ctx.stroke();}
      else if(kind==='brush'){
        ctx.beginPath();ctx.moveTo(x+10,y-11);ctx.lineTo(x-2,y+1);ctx.stroke();
        ctx.fillStyle='#263c43';ctx.beginPath();ctx.moveTo(x-4,y-1);ctx.lineTo(x+2,y+5);ctx.lineTo(x-6,y+12);ctx.lineTo(x-12,y+6);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#f5e5c4';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-10+i*2,y+7);ctx.lineTo(x-5+i*2,y+2);ctx.stroke();}
      }else if(kind==='measure'){
        ctx.strokeRect(x-13,y-6,26,13);for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(x-10+i*4,y-5);ctx.lineTo(x-10+i*4,y+(i%2?0:3));ctx.stroke();}
      }else{
        roundRect(ctx,x-13,y-8,26,19,4);ctx.stroke();ctx.strokeRect(x-8,y-12,9,4);
        ctx.beginPath();ctx.arc(x,y+1,5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#263c43';ctx.fillRect(x+8,y-4,2,2);
      }
      if(active&&!this.paused){
        ctx.globalAlpha=1;ctx.font=`600 12px ${TEXT_FONT}`;const label='E · Исследовать';
        const width=ctx.measureText(label).width+20;
        const left=Math.max(this.camX+8,Math.min(this.camX+this.W-width-8,x-width/2));
        ctx.fillStyle='#262626';roundRect(ctx,left,y+48,width,26,7);ctx.fill();
        ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,left+width/2,y+61);
      }
      ctx.restore();
    }
  }
  private drawSpeech(ctx:CanvasRenderingContext2D){
    if(!this.speech||this.nearbyStation)return;
    ctx.save();ctx.font=`500 13px ${TEXT_FONT}`;
    const maxWidth=Math.min(252,this.W-42),lines:string[]=[];let current='';
    for(const word of this.speech.text.split(' ')){
      const next=current?current+' '+word:word;
      if(current&&ctx.measureText(next).width>maxWidth-26){lines.push(current);current=word;}else current=next;
    }
    if(current)lines.push(current);
    const width=Math.min(maxWidth,Math.max(...lines.map(s=>ctx.measureText(s).width))+26),height=lines.length*18+20;
    const headX=this.px+PW/2-this.camX;
    let x=Math.max(10,Math.min(this.W-width-10,headX-width*.4));
    let y=Math.max(this.camY+12,Math.min(this.camY+this.viewHeight-height-92,this.py-height-19));
    const markers=[this.indicatorBounds,this.targetBounds].flatMap(marker=>marker?[marker]:[]);
    if(markers.length){
      const overlaps=(px:number,py:number)=>markers.some(marker=>px<marker.x+marker.w&&px+width>marker.x&&py<marker.y+marker.h&&py+height>marker.y);
      if(overlaps(x,y)){
        const clampY=(py:number)=>Math.max(this.camY+12,Math.min(this.camY+this.viewHeight-height-92,py));
        const clampX=(px:number)=>Math.max(10,Math.min(this.W-width-10,px));
        const choices=markers.flatMap(marker=>[{x:clampX(marker.x-width-12),y},{x:clampX(marker.x+marker.w+12),y},{x,y:clampY(marker.y-height-12)},{x,y:clampY(marker.y+marker.h+12)}]);
        const place=choices.filter(p=>!overlaps(p.x,p.y)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
        if(place){x=place.x;y=place.y;}
      }
    }
    ctx.globalAlpha=Math.min(1,this.speech.t*2);ctx.fillStyle='#fff9e9';ctx.strokeStyle='#52656b';ctx.lineWidth=1.5;
    roundRect(ctx,x,y,width,height,12);ctx.fill();ctx.stroke();
    const tail=Math.max(x+16,Math.min(x+width-16,headX));
    ctx.beginPath();ctx.moveTo(tail-5,y+height-1);ctx.lineTo(tail,y+height+8);ctx.lineTo(tail+7,y+height-1);ctx.fill();
    ctx.fillStyle='#263b42';ctx.textAlign='left';ctx.textBaseline='top';lines.forEach((text,i)=>ctx.fillText(text,x+13,y+10+i*18));ctx.restore();
  }
  private litLayers(ctx:CanvasRenderingContext2D,draw:(night:boolean)=>void){
    if(this.nightAmount<.995)draw(false);
    if(this.nightAmount>.005){ctx.save();ctx.globalAlpha=this.nightAmount;draw(true);ctx.restore();}
  }

  private drawRoute(ctx:CanvasRenderingContext2D,st:Stage){
    const w=Math.min(280,this.W-40),x=this.W-w-20,y=this.camY+this.viewHeight-42;
    ctx.save();ctx.fillStyle='rgba(38,38,38,.86)';roundRect(ctx,x-10,y-13,w+20,39,8);ctx.fill();
    ctx.fillStyle='#aaa';ctx.fillRect(x,y+11,w,2);
    for(const c of st.collectibles){ctx.fillStyle=c.collected?'#D0E97E':'#aaa';ctx.fillRect(x+c.x/st.length*w-2,y+8,4,7)}
    ctx.fillStyle='#F28D05';ctx.fillRect(x+(this.px+PW/2)/st.length*w-3,y+5,6,12);
    ctx.fillStyle='#fff';ctx.font=`500 11px ${TEXT_FONT}`;ctx.textAlign='left';
    const label=st.kind==='facade'?`Ярус ${Math.max(0,Math.round((st.ground-this.py-PH)/100))} · у фасада`:this.location;
    ctx.fillText(label,x,y+1);ctx.restore();
  }

  private drawCollectible(ctx: CanvasRenderingContext2D, c: Collectible) {
    const active = this.stage?.collectibles.find(k=>!k.collected)?.id === c.id;
    ctx.save();
    if (!active) ctx.globalAlpha = .5;
    const bob = this.reducedMotion ? 0 : Math.sin(this.time * 3 + c.phase) * 6;
    const y = c.y + bob;
    if(active)this.targetBounds={x:c.x-this.camX-30,y:y-55,w:60,h:85};
    // подсветка
    ctx.fillStyle = c.color;
    ctx.globalAlpha = 0.18 + Math.sin(this.time * 4 + c.phase) * 0.06;
    ctx.beginPath();
    ctx.arc(c.x, y, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = active ? 1 : .48;
    if (c.kind === 'letter') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      roundRect(ctx, c.x - 24, y - 26, 48, 52, 12);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 2;
      roundRect(ctx, c.x - 24, y - 26, 48, 52, 12);
      ctx.stroke();
      ctx.fillStyle = '#262626';
      ctx.font = `500 30px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.letter!.toUpperCase(), c.x, y + 3);
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x - 14, y + 16, 28, 3);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      roundRect(ctx, c.x - 34, y - 34, 68, 68, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 2;
      roundRect(ctx, c.x - 34, y - 34, 68, 68, 16);
      ctx.stroke();
      ctx.fillStyle=c.color;ctx.font=`600 26px ${TEXT_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(String(c.id+1).padStart(2,'0'),c.x,y);
      if(active){
        const label=FACADE_ELEMENTS.find(e=>e.id===c.elementId)!.name;
        ctx.font=`600 13px ${TEXT_FONT}`;
        const lw=ctx.measureText(label).width+24;
        this.targetBounds={x:c.x-this.camX-Math.max(lw/2,38),y:y-77,w:Math.max(lw,76),h:115};
        ctx.fillStyle='#262626';roundRect(ctx,c.x-lw/2,y-72,lw,26,6);ctx.fill();
        ctx.fillStyle='#ffffff';ctx.fillText(label,c.x,y-58);
      }
    }
    if(active){ctx.fillStyle='#262626';ctx.beginPath();ctx.moveTo(c.x,y-41);ctx.lineTo(c.x-6,y-49);ctx.lineTo(c.x+6,y-49);ctx.fill();}
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  private drawIndicator(ctx: CanvasRenderingContext2D, st: Stage) {
    this.indicatorBounds=null;
    const W = this.W;
    const cx = this.px + PW / 2;
    let best: Collectible | null = null;
    let bd = Infinity;
    for (const c of st.collectibles) {
      if (c.collected) continue;
      const d = Math.abs(c.x - cx);
      if (d < bd) {
        bd = d;
        best = c;
        break;
      }
    }
    if (!best) return;
    const sx = best.x - this.camX;
    const horizontalVisible=sx>40&&sx<W-40;
    const verticalVisible=best.y>this.camY+35&&best.y<this.camY+this.viewHeight-65;
    if (horizontalVisible&&verticalVisible) return;
    const vertical=horizontalVisible&&!verticalVisible;
    const verticalDir=best.y<this.camY+35?-1:1;
    const dir = sx <= 40 ? -1 : 1;
    const ix = vertical?Math.max(56,Math.min(W-56,sx)):dir < 0 ? 56 : W - 56;
    const iy = vertical?(verticalDir<0?this.camY+50:this.camY+this.viewHeight-75):Math.max(this.camY+65, Math.min(this.camY+this.viewHeight-90, best.y));
    this.indicatorBounds={x:ix-42,y:iy-38,w:84,h:105};
    ctx.fillStyle = '#262626';
    ctx.beginPath();
    ctx.arc(ix, iy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D0E97E';
    ctx.beginPath();
    if(vertical){ctx.moveTo(ix,iy+verticalDir*33);ctx.lineTo(ix-9,iy+verticalDir*23);ctx.lineTo(ix+9,iy+verticalDir*23)}
    else{ctx.moveTo(ix + dir * 30, iy);ctx.lineTo(ix + dir * 18, iy - 9);ctx.lineTo(ix + dir * 18, iy + 9)}
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 18px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(best.kind === 'letter' ? best.letter!.toUpperCase() : String(best.id+1), ix, iy + 2);
    ctx.font = `500 10px ${TEXT_FONT}`;
    ctx.fillStyle = '#262626';
    roundRect(ctx,ix-31,iy+36,62,21,6);ctx.fill();ctx.fillStyle='#ffffff';
    ctx.fillText(vertical?(verticalDir<0?'выше':'ниже'):dir<0?'назад':'вперёд', ix, iy + 49);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawToast(ctx: CanvasRenderingContext2D) {
    if (!this.toast) return;
    const W = this.W;
    const bottom = this.camY+this.viewHeight;
    const a = Math.min(1, this.toast.t * 2);
    ctx.globalAlpha = a;
    ctx.font = `500 14px ${TEXT_FONT}`;
    const tw = ctx.measureText(this.toast.text).width + 48;
    ctx.fillStyle = '#262626';
    roundRect(ctx, W / 2 - tw / 2, bottom - 110, tw, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#D0E97E';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `400 10px ${TEXT_FONT}`;
    ctx.fillText('[ ЗАДАЧА ]', W / 2 - tw / 2 + 16, bottom - 90);
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 14px ${TEXT_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.toast.text, W / 2 + 28, bottom - 90);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
