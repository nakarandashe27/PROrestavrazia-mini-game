/** Historic urban scenery. Every traversable surface is painted from the physics
 * platforms; architectural decoration stays behind the player. Units are world px. */
type Ctx = CanvasRenderingContext2D;
interface Zone { x:number; w:number; kind:string; name:string; floor:number }
interface Surface { x:number; y:number; w:number; h:number; kind:string; scenery?:string }
interface Scene { kind:string; seed:number; height:number; ground:number; zones:Zone[]; platforms:Surface[]; length:number }
const shade = (night:boolean, day:string, dark:string) => night ? dark : day;
const hash = (a:number,b=0) => { const n=Math.sin(a*127.1+b*311.7)*43758.5453; return n-Math.floor(n); };
function rect(c:Ctx,x:number,y:number,w:number,h:number,color:string) { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h)); }
function line(c:Ctx,x:number,y:number,x2:number,y2:number,color:string,w=1) { c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke(); }
function poly(c:Ctx,points:number[][],color:string) { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill(); }
function brick(c:Ctx,x:number,y:number,w:number,h:number,night:boolean,large=false) {
 const bh=large?23:13,bw=large?54:31;
 rect(c,x,y,w,h,shade(night,'#9b6050','#493e40'));
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 for(let row=0;row<h/bh;row++) {
  const yy=y+row*bh;
  line(c,x,yy,x+w,yy,shade(night,'#b79278','#645454'));
  for(let col=-1;col<w/bw+1;col++) {
   const xx=x+col*bw+(row%2)*bw/2, n=hash(col+Math.floor(x),row);
   if(n>.66)rect(c,xx+2,yy+2,bw-4,bh-4,shade(night,n>.86?'#ad6d55':'#855b50',n>.86?'#584749':'#44393b'));
   line(c,xx,yy,xx,yy+bh,shade(night,'#b18b75','#615253'));
  }
 }
 c.restore();
}
function plaster(c:Ctx,x:number,y:number,w:number,h:number,night:boolean,color='#d7cabb') {
 rect(c,x,y,w,h,shade(night,color,'#484950'));
 for(let i=0;i<Math.floor(w*h/1350);i++) {
  const xx=x+hash(i,x)*w,yy=y+hash(i+19,y)*h;
  rect(c,xx,yy,2+hash(i,12)*9,1,shade(night,'#b8ad9d66','#81808922'));
 }
 rect(c,x+w-14,y,14,h,shade(night,'#615e5b24','#181b252e'));
}
function arch(c:Ctx,x:number,y:number,w:number,h:number,color:string|CanvasGradient) {
 c.fillStyle=color;c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath();c.fill();
}
function windowBay(c:Ctx,x:number,y:number,w:number,h:number,night:boolean,seed:number,arched=false) {
 const trim=shade(night,'#e6dcca','#787470'), shadow=shade(night,'#665e56','#222731');
 if(arched)arch(c,x-7,y-8,w+14,h+16,trim);else rect(c,x-7,y-8,w+14,h+16,trim);
 rect(c,x-3,y-3,w+6,h+6,shadow);
 const lit=night&&hash(seed,3)>.32;
 const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,lit?'#ddb66e':shade(night,'#a7bbc2','#263847'));g.addColorStop(.55,lit?'#786d58':shade(night,'#596f78','#1d2d3c'));g.addColorStop(1,lit?'#c09253':shade(night,'#83999b','#394652'));
 c.fillStyle=g;if(arched)arch(c,x,y,w,h,g);else c.fillRect(x,y,w,h);
 // Curtain, reflection and room depth remain subordinate to the mullions.
 rect(c,x+4,y+4,w*.18,h-8,lit?'#e9d7a64d':'#d4ddd235');
 poly(c,[[x+w*.65,y+3],[x+w-4,y+3],[x+w-4,y+h*.45],[x+w*.3,y+h*.8]],lit?'#fff0b51a':'#e0edf52d');
 const f=shade(night,'#4e5c59','#33383a');
 rect(c,x+w/2-2,y,4,h,f);rect(c,x,y+h*.35,w,4,f);rect(c,x,y+h*.72,w,3,f);
 rect(c,x-10,y+h+5,w+22,5,shade(night,'#eee5d4','#87817b'));rect(c,x-6,y+h+10,w+16,4,shade(night,'#787169','#333642'));
}
function cornice(c:Ctx,x:number,y:number,w:number,night:boolean) {
 rect(c,x-10,y-9,w+20,5,shade(night,'#e9dfcd','#77777a'));
 rect(c,x-7,y-4,w+14,10,shade(night,'#afa390','#50535c'));
 rect(c,x-3,y+6,w+6,3,shade(night,'#6f6860','#292e38'));
 for(let xx=x+10;xx<x+w-8;xx+=23)rect(c,xx,y+9,8,8,shade(night,'#e0d5c3','#6b6c71'));
}
function pipe(c:Ctx,x:number,top:number,bottom:number,night:boolean,bend=0) {
 const color=shade(night,'#59696b','#6c7580');
 line(c,x,top,x,bottom-24,shade(night,'#333e4580','#131d28'),9);
 line(c,x-1,top,x-1,bottom-24,color,6);line(c,x-3,top,x-3,bottom-24,shade(night,'#9ca7a5','#969891'),1);
 line(c,x-1,bottom-24,x+12+bend,bottom-10,color,6);
 for(let y=top+40;y<bottom-30;y+=90)rect(c,x-5,y,9,4,shade(night,'#414e50','#272f3c'));
}
function lamp(c:Ctx,x:number,y:number,night:boolean,short=false) {
 const h=short?115:205;
 rect(c,x-6,y-9,12,9,'#3d4446');rect(c,x-3,y-h,6,h-9,shade(night,'#3d494b','#3f4957'));
 poly(c,[[x-13,y-h-29],[x+13,y-h-29],[x+10,y-h],[x-10,y-h]],shade(night,'#758786','#efc17b'));
 rect(c,x-17,y-h-34,34,5,'#3a4448');rect(c,x-12,y-h,24,4,'#3a4448');
 line(c,x,y-h-29,x,y-h,'#434e53',3);
 if(night) { const g=c.createRadialGradient(x,y-h-12,3,x,y-h-12,95);g.addColorStop(0,'#ffda8952');g.addColorStop(1,'#ffd68500');c.fillStyle=g;c.fillRect(x-95,y-h-107,190,190); }
}
function ironFence(c:Ctx,x:number,y:number,w:number,night:boolean,h=64) {
 const color=shade(night,'#4e6160','#465663');
 line(c,x,y-h*.75,x+w,y-h*.75,color,3);line(c,x,y-10,x+w,y-10,color,3);
 for(let xx=x;xx<x+w;xx+=17) {
  line(c,xx,y,xx,y-h,color,3);poly(c,[[xx-3,y-h+1],[xx,y-h-7],[xx+3,y-h+1]],color);
 }
 for(let xx=x;xx<=x+w;xx+=100){rect(c,xx-4,y-h-10,8,h+10,color);rect(c,xx-7,y-h-15,14,5,color);}
}
function tree(c:Ctx,x:number,y:number,size:number,night:boolean,seed:number) {
 line(c,x,y,x-4,y-size*.67,shade(night,'#74614c','#414249'),11);
 line(c,x,y-size*.4,x-size*.22,y-size*.75,shade(night,'#74614c','#414249'),5);
 line(c,x-2,y-size*.52,x+size*.2,y-size*.89,shade(night,'#74614c','#414249'),5);
 for(let i=0;i<52;i++) {
  const xx=x+(hash(i,seed)-.5)*size*.75, yy=y-size*.5-hash(i+10,seed)*size*.5;
  const radius=10+hash(i+4,seed)*22;
  rect(c,xx,yy,radius*1.4,radius,shade(night,hash(i,seed+4)>.5?'#738876':'#91a180',hash(i,seed+4)>.5?'#314b4b':'#435955'));
 }
}
function crate(c:Ctx,x:number,y:number,w:number,h:number,night:boolean) {
 rect(c,x,y-h,w,h,shade(night,'#a18862','#665c4c'));
 for(let k=0;k<5;k++){line(c,x,y-h+k*h/5,x+w,y-h+k*h/5,shade(night,'#786648','#433f39'),2);}
 rect(c,x+3,y-h+3,6,h-6,shade(night,'#c3a879','#85775e'));rect(c,x+w-9,y-h+3,6,h-6,shade(night,'#c3a879','#85775e'));
 line(c,x+8,y-6,x+w-8,y-h+6,shade(night,'#c3a879','#85775e'),6);
 for(const xx of [x+6,x+w-6])for(const yy of [y-h+6,y-6])rect(c,xx,yy,2,2,'#4a4540');
}
function factory(c:Ctx,z:Zone,night:boolean,seed:number,warehouse=false) {
 const x=z.x+24,w=z.w-48,top=warehouse?205:85,base=600;
 brick(c,x,top,w,base-top,night);
 const bays=Math.max(3,Math.floor(w/105)),gap=w/bays;
 for(let i=0;i<bays;i++) {
  const bx=x+i*gap;
  rect(c,bx,top,11,base-top,shade(night,'#ba8667','#665151'));
  rect(c,bx+11,top,4,base-top,'#312d3025');
  if(warehouse)windowBay(c,bx+26,top+48,gap-46,91,night,seed+i,true);
  else for(let f=0;f<3;f++)windowBay(c,bx+24,top+37+f*126,gap-44,85,night,seed+i+f*4,f===0);
 }
 cornice(c,x,top,w,night);
 rect(c,x-8,top-16,w+16,7,shade(night,'#536469','#323e4b'));
 if(warehouse) {
  const gateX=x+w*.36,gateW=Math.min(150,w*.38);
  arch(c,gateX-9,base-190,gateW+18,190,shade(night,'#c99a78','#735959'));
  arch(c,gateX,base-181,gateW,181,shade(night,'#3c4d50','#29323b'));
  for(let i=0;i<gateW;i+=12)line(c,gateX+i,base-130,gateX+i,base,'#82918b44',2);
  line(c,gateX+gateW/2,base-154,gateX+gateW/2,base,'#222c31',3);
  crate(c,x+30,base-3,57,50,night);crate(c,x+80,base-3,45,69,night);
 }
 pipe(c,x+w-16,top+12,base,night);
}
function house(c:Ctx,z:Zone,night:boolean,seed:number) {
 const x=z.x+20,w=z.w-40,top=140;
 plaster(c,x,top,w,460,night,seed%2?'#d8c9ae':'#c5c5b8');
 poly(c,[[x-12,top-2],[x+25,top-60],[x+w-35,top-60],[x+w+12,top-2]],shade(night,'#687b80','#354450'));
 rect(c,x+60,top-95,30,50,shade(night,'#a77962','#655559'));
 cornice(c,x,top,w,night);
 for(let f=0;f<3;f++) {
  rect(c,x,top+f*135+127,w,7,shade(night,'#a79e8c','#373d49'));
  for(let xx=x+35,i=0;xx<x+w-65;xx+=94,i++)windowBay(c,xx,top+28+f*135,47,76,night,seed+i+f*7);
 }
 for(const xx of [x+5,x+w-17])for(let y=top+23;y<586;y+=22)rect(c,xx,y,12,17,shade(night,'#e7dcc6','#74716c'));
 // A recessed entrance gives the courtyard a recognisable human scale.
 const dx=x+w*.49-38;
 arch(c,dx-9,449,94,151,shade(night,'#e1d4bd','#77756d'));
 arch(c,dx,460,76,140,shade(night,'#465754','#283e48'));
 rect(c,dx+6,498,64,102,shade(night,'#6b6855','#414c4b'));
 for(const xx of [dx+10,dx+40]) {
  rect(c,xx,505,25,40,shade(night,'#8e8970','#657069'));
  rect(c,xx+3,508,19,34,shade(night,'#595e50','#34474b'));
  rect(c,xx,551,25,40,shade(night,'#8e8970','#657069'));
  rect(c,xx+3,554,19,34,shade(night,'#595e50','#34474b'));
 }
 rect(c,dx+37,502,3,98,shade(night,'#b3a88a','#8e8f78'));
 rect(c,dx+29,546,3,10,'#bfa473');rect(c,dx+45,546,3,10,'#bfa473');
 for(let i=1;i<5;i++)line(c,dx+38,497,dx+9+i*12,468,'#adb3a077',2);
 // Fixed enamel plate and metal canopy are environment details, not controls.
 const sx=x+w*.18;
 rect(c,sx-3,534,144,25,shade(night,'#ece2ce','#868479'));
 rect(c,sx,537,138,19,shade(night,'#506e6b','#304d58'));
 c.font="500 10px 'Inter Tight',sans-serif";c.textAlign='center';c.textBaseline='middle';c.fillStyle=shade(night,'#eee7d3','#d2c4a0');c.fillText('РЕСТАВРАЦИОННАЯ МАСТЕРСКАЯ',sx+69,547,128);
 poly(c,[[dx-14,452],[dx+85,452],[dx+95,464],[dx-24,464]],shade(night,'#70847d','#465e66'));
 rect(c,dx-24,464,119,4,shade(night,'#b3bbb0','#758b8b'));
 line(c,dx-11,466,dx-5,478,shade(night,'#4b605e','#344f5a'),2);line(c,dx+82,466,dx+76,478,shade(night,'#4b605e','#344f5a'),2);
 pipe(c,x+w-28,top+10,599,night);
 lamp(c,x+w*.45,596,night);
}
function arcade(c:Ctx,z:Zone,night:boolean) {
 const x=z.x+15,w=z.w-30,top=260,bays=Math.max(3,Math.floor(w/130)),gap=w/bays;
 plaster(c,x,top,w,340,night,'#d2c5ad');
 for(let i=0;i<bays;i++) {
  const bx=x+i*gap+15,bw=gap-30;
  arch(c,bx-6,top+40,bw+12,300,shade(night,'#e7dcc8','#74736c'));
  arch(c,bx,top+49,bw,290,shade(night,'#4d6569','#213443'));
  arch(c,bx+9,top+63,bw-18,275,shade(night,'#87938a','#354a4e'));
  rect(c,bx+9,470,bw-18,130,shade(night,'#647d75','#253c42'));
  ironFence(c,bx+8,598,bw-16,night,99);
  rect(c,bx-14,top+106,16,8,shade(night,'#ede5d4','#8a8479'));
 }
 cornice(c,x,top,w,night);ironFence(c,x,top-10,w,night,40);
}
function garden(c:Ctx,z:Zone,night:boolean,seed:number) {
 plaster(c,z.x,465,z.w,135,night,'#bebfb0');
 brick(c,z.x,576,z.w,24,night);
 for(let i=0;i<4;i++)tree(c,z.x+60+i*(z.w-100)/3,580,220+hash(i,seed)*75,night,seed+i);
 ironFence(c,z.x+12,590,z.w-24,night,104);
 for(let xx=z.x+35;xx<z.x+z.w;xx+=100){rect(c,xx,584,60,13,shade(night,'#6b7c67','#334b44'));}
 lamp(c,z.x+z.w*.72,599,night);
}
function bridge(c:Ctx,z:Zone,night:boolean,aqueduct=false) {
 const x=z.x,w=z.w,top=aqueduct?310:440;
 if(aqueduct) {
  brick(c,x,590,w,520,night,true);
  rect(c,x,608,w,21,shade(night,'#8a8c7a','#566473'));
  for(let xx=x+35;xx<x+w-80;xx+=145) {
   arch(c,xx,666,107,360,shade(night,'#c1ac8c','#777469'));
   arch(c,xx+9,677,89,350,shade(night,'#384f54','#233b4c'));
   arch(c,xx+19,687,69,340,shade(night,'#55716c','#2d4a55'));
   for(let yy=790;yy<1020;yy+=45)line(c,xx+21,yy,xx+85,yy,'#9daf9829',1);
  }
  line(c,x+15,644,x+w-15,644,shade(night,'#65827d','#5d7e88'),14);
  line(c,x+15,639,x+w-15,639,shade(night,'#b4b9a0','#95aba6'),2);
  for(let xx=x+45;xx<x+w;xx+=122)rect(c,xx,631,9,26,shade(night,'#475557','#344b5e'));
  const g=c.createLinearGradient(0,790,0,1120);g.addColorStop(0,'#12263400');g.addColorStop(1,'#122634c9');c.fillStyle=g;c.fillRect(x,790,w,330);
 }
 plaster(c,x,top,w,600-top,night,'#bcb7a7');
 const bays=aqueduct?5:3,gap=w/bays;
 for(let i=0;i<bays;i++) {
  const bx=x+i*gap+15,bw=gap-30;
  arch(c,bx-7,top+31,bw+14,600-top,shade(night,'#e0d5bf','#75746f'));
  arch(c,bx,top+38,bw,600-top,shade(night,'#8b9f9d','#314956'));
  for(let a=0;a<7;a++) {
   const angle=Math.PI+a*Math.PI/6,cx=bx+bw/2,cy=top+38+bw/2;
   line(c,cx+Math.cos(angle)*(bw/2+1),cy+Math.sin(angle)*(bw/2+1),cx+Math.cos(angle)*(bw/2+10),cy+Math.sin(angle)*(bw/2+10),shade(night,'#9f9a8b','#4e555b'),2);
  }
 }
 cornice(c,x,top,w,night);ironFence(c,x,top-12,w,night,46);
}
function rooftops(c:Ctx,z:Zone,night:boolean,seed:number) {
 const gap=z.w/3;
 for(let i=0;i<3;i++) {
  const top=280-i%2*80,x=z.x+i*gap;
  plaster(c,x,top,gap-8,600-top,night,i%2?'#b9b9aa':'#c5b8a7');
  poly(c,[[x-9,top],[x+28,top-63],[x+gap-39,top-63],[x+gap+2,top]],shade(night,'#65767c','#344552'));
  for(let rx=x+16;rx<x+gap-15;rx+=29)line(c,rx,top-3,rx+16,top-56,shade(night,'#8e9c9d','#5b6975'),1);
  cornice(c,x,top,gap-8,night);
  for(let f=0;f<2;f++)for(let j=0;j<2;j++)windowBay(c,x+20+j*(gap-36)/2,top+35+f*116,40,73,night,seed+i+j+f);
  brick(c,x+gap*.6,top-104,29,64,night);rect(c,x+gap*.6-4,top-110,37,8,shade(night,'#d1c7b3','#747573'));
  line(c,x+35,top-62,x+35,top-145,shade(night,'#596269','#495968'),3);line(c,x+16,top-126,x+56,top-126,shade(night,'#596269','#495968'),2);
 }
}
function workshop(c:Ctx,z:Zone,night:boolean) {
 const x=z.x+24,w=z.w-48,top=350;
 plaster(c,x,top,w,250,night,'#b8c3bb');
 poly(c,[[x-15,top],[x+15,top-62],[x+w-15,top-62],[x+w+15,top]],shade(night,'#647c7a','#344b54'));
 for(let i=0;i<3;i++)windowBay(c,x+24+i*(w-50)/3,top+34,Math.min(75,(w-70)/3),112,night,i+7);
 rect(c,x+15,top+179,w-30,8,shade(night,'#816e50','#625947'));
 for(let i=0;i<5;i++){const xx=x+29+i*(w-60)/5;rect(c,xx,top+150,16,26,shade(night,i%2?'#acb5a0':'#b4906c','#6a6e68'));line(c,xx+8,top+148,xx+13,top+130,'#6b6250',3);}
 pipe(c,x+w-13,top,600,night);
}
function excavation(c:Ctx,z:Zone,night:boolean) {
 // The open excavation has a cut-away basement; the walkable floor is supplied
 // by the generated platforms, so these courses never create hidden collision.
 const x=z.x,base=600,depth=Math.max(200,z.floor-base+100);
 brick(c,x,base,z.w,depth,night,true);
 rect(c,x,base,z.w,25,shade(night,'#676663','#373d47'));
 const g=c.createLinearGradient(0,base,0,base+depth);g.addColorStop(0,'#18262b16');g.addColorStop(1,'#14212a9e');c.fillStyle=g;c.fillRect(x,base+25,z.w,depth-25);
 for(let xx=x+80;xx<x+z.w-70;xx+=155){arch(c,xx,base+65,90,depth-30,'#17262f80');arch(c,xx+10,base+78,70,depth-42,shade(night,'#344549','#1e303b'));}
 line(c,x+10,base+63,x+z.w-10,base+63,shade(night,'#5b7378','#52677a'),11);
 line(c,x+10,base+59,x+z.w-10,base+59,shade(night,'#9fa89c','#7d8b91'),2);
 for(let xx=x+40;xx<x+z.w;xx+=91)rect(c,xx,base+51,7,22,shade(night,'#393f44','#263747'));
 for(let xx=x+105;xx<x+z.w-40;xx+=210) {
  line(c,xx,base+4,xx,base+115,'#393d40',2);rect(c,xx-10,base+115,20,9,'#c9b786');
  const glow=c.createRadialGradient(xx,base+130,2,xx,base+130,130);glow.addColorStop(0,'#ffcc743b');glow.addColorStop(1,'#ffcc7400');c.fillStyle=glow;c.fillRect(xx-130,base,260,260);
 }
 ironFence(c,x+12,base,z.w-24,night,46);
 // A low skyline leaves the excavation silhouette clear.
 plaster(c,x+40,445,z.w-80,155,night,'#b9b6a7');
 for(let xx=x+65;xx<x+z.w-60;xx+=80)windowBay(c,xx,480,38,67,night,xx);
}
const backdropCache = new Map<string,HTMLCanvasElement>();
function cutawayBase(c:Ctx,stage:Scene,left:number,right:number,night:boolean) {
 const y=stage.ground,h=stage.height-y;
 if(h<=0)return;
 // The whole subsurface is a recess. It never receives the pale collision rim
 // used by terrain, so negative space reads as a shaft rather than walkable soil.
 const base=c.createLinearGradient(0,y,0,stage.height);
 base.addColorStop(0,shade(night,'#505655','#33424c'));
 base.addColorStop(.25,shade(night,'#3a464b','#253743'));
 base.addColorStop(1,shade(night,'#192932','#162631'));
 c.fillStyle=base;c.fillRect(left,y,right-left,h);
 const tileW=96,rowH=46;
 c.save();c.beginPath();c.rect(left,y,right-left,h);c.clip();
 for(let row=0;row<Math.min(10,h/rowH);row++) {
  const yy=y+20+row*rowH;
  const offset=(row%2)*tileW*.5;
  for(let xx=Math.floor(left/tileW)*tileW-tileW+offset;xx<right;xx+=tileW) {
   const n=hash(xx,row+stage.seed),alpha=Math.max(.035,.13-row*.015);
   poly(c,[[xx+5,yy+4],[xx+67+n*14,yy],[xx+88,yy+15],[xx+79,yy+34],[xx+11,yy+36]],`rgba(155,158,138,${alpha})`);
   line(c,xx+13,yy+37,xx+77,yy+35,`rgba(10,27,36,${.2+n*.13})`,2);
   if(n>.72)line(c,xx+38,yy+6,xx+31,yy+25,'#101e2b22',2);
  }
 }
 // Soil strata and restrained roots appear just below the cut edge.
 for(let xx=Math.floor(left/170)*170;xx<right;xx+=170) {
  const n=hash(xx,stage.seed);
  poly(c,[[xx,y+7],[xx+103,y+13],[xx+150,y+27],[xx+109,y+34],[xx+8,y+25]],shade(night,'#756d5c26','#7c827322'));
  if(n>.5) { line(c,xx+76,y+5,xx+66,y+46,'#171e2366',2);line(c,xx+66,y+46,xx+85,y+72,'#171e2355',2);line(c,xx+71,y+24,xx+95,y+41,'#171e2355'); }
 }
 c.restore();
}
function drawZone(c:Ctx,z:Zone,night:boolean,seed:number) {
 switch(z.kind) {
  case 'courtyard':house(c,z,night,seed);break;
  case 'arcade':arcade(c,z,night);break;
  case 'excavation':excavation(c,z,night);break;
  case 'bridge':bridge(c,z,night);break;
  case 'warehouse':factory(c,z,night,seed,true);break;
  case 'garden':garden(c,z,night,seed);break;
  case 'rooftops':rooftops(c,z,night,seed);break;
  case 'aqueduct':bridge(c,z,night,true);break;
  case 'workshop':workshop(c,z,night);break;
  case 'printyard':factory(c,z,night,seed);break;
  default:house(c,z,night,seed);
 }
}
/** Called before the engine translates by -camX. Backdrops are baked once per
 * location and lighting mode, then culled and composited in world coordinates. */
export function drawLocationBackdrop(c:Ctx,stage:Scene,camX:number,W:number,night:boolean,_time:number) {
 if(stage.kind==='facade')return;
 c.save();c.translate(-camX,0);
 cutawayBase(c,stage,camX-80,camX+W+80,night);
 for(const z of stage.zones) {
  if(z.x+z.w<camX-70||z.x>camX+W+70)continue;
  const key=`${stage.seed}:${z.x}:${z.w}:${z.floor}:${z.kind}:${night}`;
  let canvas=backdropCache.get(key);
  if(!canvas) {
   canvas=document.createElement('canvas');canvas.width=Math.ceil(z.w+80);canvas.height=Math.max(940,stage.height);
   const b=canvas.getContext('2d')!;b.translate(40-z.x,0);drawZone(b,z,night,stage.seed+Math.floor(z.x));
   if(backdropCache.size>36)backdropCache.delete(backdropCache.keys().next().value!);
   backdropCache.set(key,canvas);
  }
  c.drawImage(canvas,z.x-40,0);
 }
 c.restore();
}
function ground(c:Ctx,p:Surface,stage:Scene,night:boolean,left:number,right:number) {
 const x=Math.max(p.x,left),end=Math.min(p.x+p.w,right),w=end-x;if(w<=0)return;
 const deep=p.y>stage.ground+60;
 rect(c,x,p.y,w,Math.max(p.h,stage.height-p.y),shade(night,deep?'#514e48':'#767971',deep?'#30343d':'#3b4550'));
 rect(c,x,p.y+18,w,6,shade(night,'#4d5458','#242f3b'));
 // Stone pavement is the collision edge: bright rim, dark vertical face.
 rect(c,x,p.y,w,4,shade(night,'#e6dfce','#949994'));
 rect(c,x,p.y+4,w,14,shade(night,'#b9b5a8','#626e76'));
 for(let xx=Math.floor(x/42)*42;xx<end;xx+=42){line(c,xx,p.y+4,xx+3,p.y+17,shade(night,'#787e79','#404e5c'),2);}
 for(let row=0;row<7;row++) {
  const yy=p.y+28+row*17;if(yy>stage.height)break;
  line(c,x,yy,end,yy,shade(night,'#aaa19030','#8d9d9f15'));
  for(let xx=Math.floor(x/53)*53+(row%2)*26;xx<end;xx+=53) {
   const n=hash(xx,row);
   if(n>.6)rect(c,xx+3,yy+4,20+n*21,6,shade(night,'#494f4c','#273743'));
   line(c,xx,yy,xx,yy+17,shade(night,'#aaa19030','#8d9d9f15'));
  }
 }
 // Recessed basement masonry is visible only below the pavement.
 if(p.y+150<stage.height) {
  const gradient=c.createLinearGradient(0,p.y+115,0,stage.height);gradient.addColorStop(0,'#1b242900');gradient.addColorStop(1,'#15222caa');c.fillStyle=gradient;c.fillRect(x,p.y+115,w,stage.height-p.y-115);
 }
 for(const edge of [p.x,p.x+p.w-9])if(edge>=left&&edge<=right) {
  rect(c,edge,p.y+18,9,stage.height-p.y-18,shade(night,'#c6b293','#7d7b72'));
  for(let yy=p.y+28;yy<stage.height;yy+=29)rect(c,edge,yy,9,3,shade(night,'#6a665b','#3e4a54'));
 }
}
function beam(c:Ctx,p:Surface,night:boolean,moving:boolean,time:number) {
 const metal=p.scenery==='iron'||moving;
 const color=shade(night,metal?'#627f88':'#94714d',metal?'#47606e':'#786342');
 rect(c,p.x,p.y,p.w,p.h,color);
 rect(c,p.x,p.y,p.w,4,shade(night,metal?'#bfd1cc':'#d6b685',metal?'#a3b5b8':'#b09a74'));
 rect(c,p.x,p.y+p.h-4,p.w,4,shade(night,'#424946','#293c48'));
 if(metal) {
  for(let xx=p.x+10;xx<p.x+p.w-8;xx+=34){rect(c,xx,p.y+6,3,3,'#c1cac2');line(c,xx,p.y+7,xx+17,p.y+p.h-5,'#304a5780',2);}
 }else {
  for(let xx=p.x+15;xx<p.x+p.w;xx+=47){line(c,xx,p.y+4,xx,p.y+p.h-5,'#5b4d3980');rect(c,xx+5,p.y+7,2,2,'#4b4d43');}
  line(c,p.x+8,p.y+p.h*.6,p.x+p.w-8,p.y+p.h*.6,'#c8ab7355');
 }
 if(moving) {
  for(const xx of [p.x+13,p.x+p.w-13]) { line(c,xx,p.y,xx,p.y-60,'#5e7077',2);rect(c,xx-5,p.y-65,10,7,'#8b9694'); }
  const alpha=.45+Math.sin(time*2)*.2;rect(c,p.x+p.w/2-12,p.y+5,24,4,`rgba(208,233,126,${alpha})`);
 }
}
function stone(c:Ctx,p:Surface,night:boolean) {
 rect(c,p.x,p.y,p.w,p.h,shade(night,'#a4a698','#69757b'));
 rect(c,p.x,p.y,p.w,4,shade(night,'#e5dfca','#a7aca0'));
 rect(c,p.x,p.y+p.h-4,p.w,4,shade(night,'#5e6868','#3a4a58'));
 for(let xx=p.x+33;xx<p.x+p.w;xx+=37)line(c,xx,p.y+4,xx-2,p.y+p.h-4,shade(night,'#727c75','#465967'),2);
 for(let i=0;i<p.w/23;i++)rect(c,p.x+hash(i,p.x)*(p.w-6),p.y+6+hash(i,8)*Math.max(2,p.h-13),3,2,shade(night,'#d3d1b9','#8e9c97'));
}
/** Called after ctx.translate(-camX,0). Scaffold platforms are left to drawScaffold. */
export function drawTerrain(c:Ctx,stage:Scene,camX:number,viewWidth:number,night:boolean,time:number) {
 const left=camX-60,right=camX+viewWidth+60;
 for(const p of stage.platforms) {
  if(p.x+p.w<left||p.x>right)continue;
  if(p.kind==='ground')ground(c,p,stage,night,left,right);
  else if(p.kind==='beam'||p.kind==='moving')beam(c,p,night,p.kind==='moving',time);
  else if(p.kind==='stone') {
   const zone=stage.zones.find(z=>p.x+p.w/2>=z.x&&p.x+p.w/2<z.x+z.w);
   if(zone?.kind==='excavation'||zone?.kind==='aqueduct') {
    // Individual masonry piers read as surviving basement foundations.
    const width=Math.min(58,p.w*.42),x=p.x+(p.w-width)/2,base=Math.min(stage.height,p.y+300);
    rect(c,x,p.y+p.h,width,base-p.y-p.h,shade(night,'#777366','#4b5960'));
    rect(c,x+width-10,p.y+p.h,10,base-p.y-p.h,shade(night,'#565c57','#334854'));
    for(let yy=p.y+p.h+22;yy<base;yy+=29)line(c,x,yy,x+width,yy,shade(night,'#b0a58a','#798784'),2);
   }else if(zone?.kind==='rooftops') {
    // Roof ledges are fastened to the wall, with slim iron corbels in the
    // background; only the bright stone cap is a traversable surface.
    rect(c,p.x+8,p.y+p.h,p.w-16,7,'#182c3840');
    for(const xx of [p.x+22,p.x+p.w-22]) {
     line(c,xx,p.y+p.h,xx,p.y+p.h+44,shade(night,'#536667','#455c6a'),4);
     line(c,xx,p.y+p.h+41,xx+21,p.y+p.h+3,shade(night,'#637677','#5b7180'),4);
     rect(c,xx-4,p.y+p.h+38,8,8,shade(night,'#3e555b','#294758'));
    }
   }
   stone(c,p,night);
  }
 }
 if(stage.kind==='facade') {
  // A foundation course anchors the enlarged facade in the same material world.
  const y=stage.ground;
  for(let xx=Math.floor(left/115)*115;xx<right;xx+=115) {
   rect(c,xx,y-16,110,12,shade(night,'#b5aa96','#687078'));
   rect(c,xx,y-4,110,3,shade(night,'#62696b','#384a5a'));
  }
 }
}
