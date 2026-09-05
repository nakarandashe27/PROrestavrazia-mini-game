/** Photo-informed game elevation of Pyatnitskaya 71/5. Canonical size 1600×540.
 * Sources and deliberate limits: FACADE-RESEARCH.md. */
type C = CanvasRenderingContext2D;
type Fill=string|CanvasGradient;
const red='#aa5145', redLight='#bd6856', redDark='#843f37', cream='#deded2', timber='#584b40';
const tone=(n:boolean,d:string,k:string)=>n?k:d;
const noise=(x:number,y:number)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v)};
function rect(c:C,x:number,y:number,w:number,h:number,color:Fill){c.fillStyle=color;c.fillRect(x,y,w,h)}
function line(c:C,x:number,y:number,x2:number,y2:number,color:string,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}
function poly(c:C,p:number[][],color:Fill){c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
function arch(c:C,x:number,y:number,w:number,h:number){c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath()}
function ogive(c:C,x:number,y:number,w:number,h:number){c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+h*.48);c.bezierCurveTo(x,y+h*.24,x+w*.19,y+h*.12,x+w/2,y);c.bezierCurveTo(x+w*.81,y+h*.12,x+w,y+h*.24,x+w,y+h*.48);c.lineTo(x+w,y+h);c.closePath()}
function brickwork(c:C,x:number,y:number,w:number,h:number,n:boolean){
 rect(c,x,y,w,h,tone(n,red,'#684b49'));c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 for(let row=0;row<h/1.8;row++)for(let col=-1;col<w/5.5+1;col++){
  const xx=x+col*5.5+(row%2)*2.75,yy=y+row*1.8,v=noise(col+Math.floor(x),row);
  rect(c,xx+.2,yy+.2,5.05,1.4,tone(n,v>.73?'#b25a49':v<.19?'#a24e43':red,v>.73?'#79554e':v<.19?'#5d4343':'#6d4c49'));
  if(v>.66)line(c,xx+1,yy+1.4,xx+4,yy+1.4,tone(n,'#793d3526','#362e3433'),.45);
 }c.restore();
}
function plaster(c:C,x:number,y:number,w:number,h:number,n:boolean){
 const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,tone(n,'#efeee2','#929087'));g.addColorStop(.55,tone(n,cream,'#7b7e77'));g.addColorStop(1,tone(n,'#c8ccc1','#687171'));rect(c,x,y,w,h,g);
 for(let i=0;i<w*h/260;i++)rect(c,x+noise(i,x)*w,y+noise(i,y)*h,1+noise(i,4)*4,.5,tone(n,'#797d7330','#b4b6a819'));
 rect(c,x,y,2,h,tone(n,'#67726e30','#1f354037'));
}
function moulding(c:C,x:number,y:number,w:number,n:boolean,s=1){
 rect(c,x-2,y-2,w+4,2*s,tone(n,'#eef1df','#bec1ad'));rect(c,x,y,w,4*s,tone(n,'#aab9b3','#839a9d'));
 rect(c,x+2,y+4*s,w-4,2*s,tone(n,'#f4efdf','#b5b7a5'));rect(c,x+2,y+6*s,w-4,2,tone(n,'#606c653c','#253a444c'));
}
function glass(c:C,x:number,y:number,w:number,h:number,n:boolean,seed:number){
 const lit=n&&noise(seed,9)>.46,g=c.createLinearGradient(x,y,x+w*.4,y+h);
 g.addColorStop(0,lit?'#b6a07a':tone(n,'#9eb6c3','#4b697f'));g.addColorStop(.5,lit?'#706c58':tone(n,'#617f88','#294657'));g.addColorStop(1,lit?'#b7955e':tone(n,'#a1b7b5','#435967'));rect(c,x,y,w,h,g);
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 poly(c,[[x,y+h*.64],[x+w*.2,y+h*.52],[x+w*.43,y+h*.6],[x+w*.6,y+h*.42],[x+w,y+h*.55],[x+w,y+h],[x,y+h]],tone(n,'#354f5935','#0d23383f'));
 rect(c,x+w*.11,y+2,w*.16,h-4,tone(n,'#eff6eb18','#c1d5c31a'));line(c,x,y+h*.69,x+w,y+h*.63,tone(n,'#c8d9d12b','#d8ceb22a'),1);
 const q=.5+noise(seed,7)*.35;poly(c,[[x+w*q,y],[x+w*(q+.18),y],[x+w*(q-.28),y+h],[x+w*(q-.4),y+h]],tone(n,'#edf8ff13','#a9cfdf0a'));c.restore();
}
function windowPane(c:C,x:number,y:number,w:number,h:number,n:boolean,seed:number,wide=false){
 rect(c,x-3,y-3,w+6,h+6,tone(n,'#bab8ac','#686c69'));rect(c,x-1,y-1,w+3,h+3,tone(n,'#65605a','#333f49'));rect(c,x,y,w,h,timber);glass(c,x+2.5,y+2.5,w-5,h-5,n,seed);
 const f=tone(n,'#635248','#4d4942'),hi=tone(n,'#ab9981','#8a8977'),div=wide?4:2;
 for(let k=1;k<div;k++){const xx=x+w*k/div;line(c,xx,y,xx,y+h,f,2);line(c,xx-.7,y+1,xx-.7,y+h-1,hi,.45)}
 for(const ry of [.1,.2,.8,.9])line(c,x,y+h*ry,x+w,y+h*ry,f,1.2);
 for(const ry of [.2,.8])line(c,x,y+h*ry+1,x+w,y+h*ry+1,hi,.5);
 for(let k=1;k<div*2;k++){if(k%2===0)continue;const xx=x+w*k/(div*2);line(c,xx,y,xx,y+h*.2,f,.9);line(c,xx,y+h*.8,xx,y+h,f,.9)}
 rect(c,x,y,2,h,f);rect(c,x+w-2,y,2,h,f);rect(c,x,y,w,2,f);rect(c,x,y+h-2,w,2,f);
 for(const xx of [x+1,x+w-2])for(const yy of [y+h*.31,y+h*.69])rect(c,xx,yy,1.7,3,tone(n,'#998570','#aaa28a'));
 rect(c,x-4,y+h+1,w+8,2,tone(n,'#edf1df','#c9c9b5'));rect(c,x-3,y+h+3,w+7,2,tone(n,'#7c8d87','#576f7b'));
}
function archedWindow(c:C,x:number,y:number,w:number,h:number,n:boolean){
 arch(c,x-3,y-3,w+6,h+6);c.fillStyle=tone(n,'#a69f91','#5c6466');c.fill();
 c.save();arch(c,x,y,w,h);c.clip();glass(c,x,y,w,h,n,15);
 for(const xx of [x+w/3,x+w*2/3]){line(c,xx,y,xx,y+h,timber,3);line(c,xx-1,y,xx-1,y+h,'#aa97866b',.6)}
 for(const ry of [.25,.45,.78,.91])line(c,x,y+h*ry,x+w,y+h*ry,timber,2);
 for(let i=1;i<6;i++){if(i%2===0)continue;line(c,x+w*i/6,y,x+w*i/6,y+h*.45,timber,1.1);line(c,x+w*i/6,y+h*.78,x+w*i/6,y+h,timber,1.1)}
 c.restore();arch(c,x,y,w,h);c.strokeStyle=timber;c.lineWidth=2.5;c.stroke();moulding(c,x-3,y+h+2,w+6,n,.4);
}
function downpipe(c:C,x:number,top:number,bottom:number,n:boolean,bend=7){
 c.save();c.lineJoin='round';c.lineCap='round';
 for(const [offset,width,color] of [[1,5,'#344a5150'],[0,3.5,tone(n,'#a2b7b7','#8aa2b0')],[-.7,1,tone(n,'#e2efdf','#bfd0d0')]] as [number,number,string][]){
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x+offset,top);c.lineTo(x+offset,413);c.bezierCurveTo(x+offset,417,x-bend+offset,419,x-bend+offset,427);c.lineTo(x-bend+offset,bottom-9);c.lineTo(x-bend-5+offset,bottom);c.stroke();
 }
 for(let yy=top+35;yy<bottom-15;yy+=48)line(c,x-2,yy,x+3,yy,'#718989',1);
 poly(c,[[x-4,top-6],[x+4,top-6],[x+2,top+3],[x-2,top+3]],tone(n,'#a9bcbc','#8fa6af'));c.restore();
}
function column(c:C,x:number,n:boolean){
 poly(c,[[x,18],[x+5,14],[x+24,14],[x+30,19],[x+30,300],[x,300]],tone(n,red,'#714b46'));rect(c,x+5,19,19,276,tone(n,'#b35a4b','#83564f'));
 poly(c,[[x,19],[x+5,14],[x+5,295],[x,300]],tone(n,'#c77460','#9b6d5d'));poly(c,[[x+24,14],[x+30,19],[x+30,300],[x+24,295]],tone(n,'#8f443d','#503b3e'));
 poly(c,[[x-2,275],[x+4,272],[x+25,272],[x+32,276],[x+32,300],[x-2,300]],tone(n,'#a94f44','#76534c'));line(c,x+4,273,x+25,273,tone(n,'#d38970','#ab8270'),1);line(c,x+25,273,x+32,277,redDark,1);
 for(const yy of [30,61])poly(c,[[x-1,yy],[x+5,yy-3],[x+24,yy-3],[x+31,yy],[x+31,yy+3],[x+24,yy],[x+5,yy],[x-1,yy+3]],tone(n,yy===30?'#c9c9b7':redDark,yy===30?'#b0b2a0':'#513d3c'));
 for(const dx of [4,13,23]){rect(c,x+dx,11,2,13,tone(n,'#813e37','#44363b'));rect(c,x+dx-1,10,3,11,redLight);rect(c,x+dx-1,23,3,1,'#d4dfd1')}
 poly(c,[[x-2,10],[x+5,6],[x+24,6],[x+32,10],[x+31,12],[x+24,9],[x+5,9],[x-1,13]],tone(n,'#d4dfd2','#b5c6be'));line(c,x+5,7,x+24,7,'#f1f1df',.8);
}
function doorPanel(c:C,x:number,y:number,w:number,h:number,n:boolean,central=false){
 rect(c,x,y,w,h,tone(n,'#655345','#4b4841'));
 const inset=(yy:number,hh:number,glazed:boolean)=>{
  c.save();c.beginPath();c.roundRect(x+2.5,yy,w-5,hh,[3.8,3.8,1,1]);c.clip();if(glazed)glass(c,x+3,yy,w-6,hh,n,8);else rect(c,x+3,yy,w-6,hh,tone(n,'#5f5040','#3e423d'));c.restore();
  c.beginPath();c.roundRect(x+2.5,yy,w-5,hh,[3.8,3.8,1,1]);c.strokeStyle=tone(n,'#a08766','#8d8b70');c.lineWidth=.6;c.stroke();
 };
 inset(y+3,15,true);inset(y+23,h-45,true);inset(y+h-19,15,false);
 for(let i=0;i<3;i++)line(c,x+3+i*4,y+h-16,x+3+i*4,y+h-6,'#ad916126',.5);
 if(central){rect(c,x+2,y+h-4,w-4,3,'#b79b57');line(c,x+w-4,y+42,x+w-4,y+50,'#d7bc7c',1.3);rect(c,x+w-5,y+44,2,1,'#e5d7a1')}
}
export function paintPortal(c:C,x:number,y:number,w:number,h:number,n=false){
 c.save();c.translate(x,y);c.scale(w/200,h/300);brickwork(c,0,0,200,300,n);rect(c,27,39,146,30,tone(n,'#ab5245','#724a46'));
 for(const yy of [37,42,66,70])line(c,27,yy,173,yy,tone(n,yy%2?'#ce8068':'#803c34',yy%2?'#976a59':'#47383b'),yy===42?2:1);
 rect(c,36,49,128,12,tone(n,'#ad584a','#724c46'));
 for(const [ax,ay,aw,ah,color] of [[28,70,144,230,redDark],[31,73,138,227,redLight],[35,77,130,223,red],[41,83,118,217,'#6b3d36'],[44,86,112,214,timber]] as [number,number,number,number,string][]){ogive(c,ax,ay,aw,ah);c.fillStyle=tone(n,color,color===redLight?'#996852':color===red?'#794d46':'#443c3c');c.fill()}
 // Circular transom, side lights and red masonry mullions are distinct layers.
 c.save();ogive(c,46,89,108,205);c.clip();glass(c,46,88,108,114,n,2);
 rect(c,77,89,7,78,tone(n,'#a85547','#795148'));rect(c,116,89,7,78,tone(n,'#a85547','#795148'));
 c.strokeStyle=timber;c.lineWidth=3;c.beginPath();c.arc(100,112,17,0,Math.PI*2);c.stroke();c.strokeStyle=tone(n,'#ab9781','#9b9b86');c.lineWidth=.8;c.beginPath();c.arc(100,112,15.4,0,Math.PI*2);c.stroke();
 for(const xx of [66,90,110,134])line(c,xx,132,xx,163,timber,1.5);line(c,46,148,154,148,timber,2);line(c,84,135,116,135,timber,2);
 poly(c,[[49,156],[71,147],[77,155],[77,165],[49,165]],'#182d373a');c.restore();line(c,44,164,156,164,tone(n,'#d6dfcd','#b3c5bf'),1.2);
 // Raised timber crown, sweeping shoulders, copper-capped posts.
 c.beginPath();c.moveTo(38,203);c.lineTo(38,181);c.bezierCurveTo(52,181,66,176,71,159);c.lineTo(76,156);c.lineTo(80,160);c.lineTo(120,160);c.lineTo(124,156);c.lineTo(129,159);c.bezierCurveTo(134,176,148,181,162,181);c.lineTo(162,203);c.closePath();c.fillStyle=tone(n,'#715b49','#575247');c.fill();
 c.strokeStyle=tone(n,'#d7daca','#bac9c1');c.lineWidth=1.2;c.beginPath();c.moveTo(38,180);c.bezierCurveTo(54,180,66,174,71,158);c.moveTo(129,158);c.bezierCurveTo(134,174,148,180,162,180);c.stroke();
 c.beginPath();c.moveTo(81,190);c.lineTo(81,172);c.bezierCurveTo(87,165,113,165,119,172);c.lineTo(119,190);c.closePath();c.strokeStyle='#4d433d';c.lineWidth=.7;c.stroke();
 rect(c,38,184,124,7,tone(n,'#463f39','#343d3e'));moulding(c,38,183,124,n,.45);rect(c,38,190,124,110,tone(n,'#675343','#4a453f'));
 // Four narrow lower panels: the inner pair are the double door leaves.
 for(let i=0;i<4;i++){const dx=41+i*29.4;c.save();c.beginPath();c.roundRect(dx,191,25,23,[4,4,0,0]);c.clip();glass(c,dx,191,25,23,n,3+i);for(let k=1;k<5;k++)line(c,dx+k*5,191,dx+k*5,214,tone(n,'#a39868','#aea779'),.55);for(const yy of [198,206])line(c,dx,yy,dx+25,yy,tone(n,'#a39868','#aea779'),.55);c.restore();doorPanel(c,dx,222,25,78,n,i===1||i===2)}
 moulding(c,38,215,124,n,.4);
 for(const px of [68,128]){rect(c,px,159,6,141,tone(n,'#79634e','#595547'));poly(c,[[px-3,160],[px+3,153],[px+9,160],[px+8,161],[px+3,156],[px-2,162]],tone(n,'#e1dfcf','#b9c7bf'));line(c,px+1,165,px+1,298,tone(n,'#ab8c6b','#969179'),.6)}
 column(c,0,n);column(c,170,n);rect(c,198,192,1.5,2,'#dedccb');rect(c,198.3,192.4,.9,1.1,'#3b3b3b');rect(c,-2,299,204,2,tone(n,'#b7b7a6','#819397'));c.restore();
}
function niche(c:C,x:number,y:number,w:number,h:number,n:boolean){
 arch(c,x,y,w,h);c.fillStyle=tone(n,'#863f37','#493b3d');c.fill();arch(c,x+1.3,y+1.5,w-2.6,h-1.5);c.fillStyle=tone(n,'#a04b40','#694747');c.fill();rect(c,x+1,y+h-10,w-2,2,tone(n,'#d9dfcf','#b1bfaf'));rect(c,x,y+h,w,2,tone(n,'#dedfcd','#b8bca8'));
}
function pilaster(c:C,x:number,top:number,bottom:number,n:boolean,w=25){
 brickwork(c,x,top,w,bottom-top,n);rect(c,x,top,2,bottom-top,tone(n,'#d17f63','#986c58'));rect(c,x+w-2,top,2,bottom-top,tone(n,'#833d333f','#28323a55'));
 if(top<70){niche(c,x+w*.44,top+21,3.4,36,n);for(let i=0;i<4;i++){const yy=top+95+i*4,s=i*2;rect(c,x+s,yy,w-s*2,4,tone(n,red,'#674746'));line(c,x+s,yy+4,x+w-s,yy+4,tone(n,'#733e343b','#292e394a'),.9)}}
 rect(c,x-2,top-2,w+4,2,tone(n,'#c1cfbe','#a1b2aa'));
}
function shoulder(c:C,x:number,w:number,n:boolean,flip:boolean){
 c.save();if(flip){c.translate(x+w,0);c.scale(-1,1);x=0}brickwork(c,x,14,w,151,n);for(let i=0;i<3;i++)niche(c,x+17+i*26,33,12,38,n);
 c.beginPath();c.moveTo(x,88);c.bezierCurveTo(x+w*.44,87,x+w*.7,68,x+w,45);c.lineTo(x+w,162);c.lineTo(x,162);c.closePath();c.fillStyle=tone(n,red,'#674746');c.fill();
 for(const [yy,color] of [[87,tone(n,'#edf0dc','#b9c4b7')],[90,tone(n,'#889e99','#728994')]] as [number,string][]){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x,yy);c.bezierCurveTo(x+w*.44,yy-1,x+w*.7,yy-20,x+w,yy-43);c.stroke()}
 c.beginPath();c.moveTo(x+15,153);c.quadraticCurveTo(x+w/2,136,x+w-15,153);c.lineTo(x+w-15,166);c.lineTo(x+15,166);c.closePath();c.fillStyle=tone(n,cream,'#777a76');c.fill();
 c.strokeStyle=tone(n,'#793a334f','#30333d66');c.lineWidth=2;c.beginPath();c.moveTo(x+15,153);c.quadraticCurveTo(x+w/2,136,x+w-15,153);c.stroke();c.restore();
}
function elevation(c:C,n:boolean){
 plaster(c,0,15,1600,525,n);brickwork(c,0,423,1600,117,n);rect(c,0,13,1600,2,tone(n,'#596f78','#435d6c'));
 // Five window levels. The upper ribbon is broad; lower ordinary bays are paired.
 for(const start of [0,1040])for(let i=0;i<5;i++){
  const bx=start+i*112;pilaster(c,bx,8,540,n,20);windowPane(c,bx+30,61,72,61,n,i,true);
  for(const yy of [163,257,350])for(let j=0;j<2;j++)windowPane(c,bx+28+j*39,yy,31,67,n,i*11+j+yy);
  for(let j=0;j<2;j++)windowPane(c,bx+28+j*39,443,31,79,n,i*11+j+2);
 }pilaster(c,1580,8,540,n,20);
 plaster(c,580,130,440,293,n);brickwork(c,580,13,440,151,n);shoulder(c,585,119,n,false);shoulder(c,896,119,n,true);
 brickwork(c,704,-40,192,180,n);for(const xx of [744,781,818])niche(c,xx,-2,17,42,n);moulding(c,704,-11,192,n,.7);rect(c,702,-43,196,3,tone(n,'#80958f','#708994'));
 plaster(c,724,47,152,375,n);archedWindow(c,730,56,140,80,n);
 for(const yy of [164,258])for(let i=0;i<3;i++)windowPane(c,731+i*46,yy,35,66,n,8+i+yy);
 for(const bx of [594,924])for(const yy of [165,259,351,443])for(let i=0;i<2;i++)windowPane(c,bx+i*43,yy,34,yy===443?79:65,n,bx+i+yy);
 for(const xx of [566,692,884,1014])pilaster(c,xx,12,540,n,23);
 for(const xx of [701,877]){
  brickwork(c,xx,-39,22,87,n);moulding(c,xx-1,-40,24,n,.4);
  for(const dx of [4,13]){rect(c,xx+dx,-37,3,13,tone(n,redDark,'#443b3e'));rect(c,xx+dx-1,-37,3,12,tone(n,redLight,'#956653'));rect(c,xx+dx-1,-24,3,1,'#dedfce')}
  moulding(c,xx-2,45,26,n,.7);for(let k=0;k<4;k++){rect(c,xx+k*2,53+k*3,22-k*4,3,tone(n,red,'#6c4a47'));line(c,xx+k*2,56+k*3,xx+22-k*2,56+k*3,redDark,.6)}
 }
 for(const yy of [147,246,340]){rect(c,725,yy,150,1.4,tone(n,'#a1a393','#555f61'));rect(c,725,yy+2,150,1.4,tone(n,'#edeedd','#9da393'))}
 moulding(c,0,422,1600,n,.65);paintPortal(c,704,299,192,241,n);
 for(const px of [127,351,575,719,903,1030,1254,1478])downpipe(c,px,14,535,n,px===719?-7:7);
 rect(c,0,534,1600,6,tone(n,'#994b41','#5f4846'));line(c,0,534,1600,534,tone(n,'#c87a60','#8c6a57'),.6);
 rect(c,944,479,18,24,tone(n,'#4c4b44','#3c4949'));rect(c,945,480,16,22,tone(n,'#686154','#595e54'));
 for(let i=0;i<6;i++)rect(c,947,484+i*2.3,12-i%2*3,.4,'#cfc2a072');
 for(const xx of [944.5,961.5])for(const yy of [480,501.5])rect(c,xx,yy,.7,.7,'#d6d1b1');
 rect(c,984,454,26,15,'#335b61');rect(c,985,455,24,13,'#42666a');c.font='8px Arial';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#e5e6d3';c.fillText('71',997,465);
}
const facadeCache=new Map<boolean,HTMLCanvasElement>();
export function paintFacade(c:C,x:number,y:number,w:number,h:number,night=false,restored=0){
 c.save();c.translate(x,y);c.scale(w/1600,h/540);let canvas=facadeCache.get(night);
 if(!canvas){canvas=document.createElement('canvas');canvas.width=3240;canvas.height=1180;const b=canvas.getContext('2d')!;b.scale(2,2);b.translate(10,48);elevation(b,night);facadeCache.set(night,canvas)}
 c.drawImage(canvas,-10,-48,1620,590);
 const wear=Math.max(0,1-restored/6);
 if(wear){const grime=c.createLinearGradient(0,40,0,540);grime.addColorStop(0,'rgba(65,64,55,'+wear*.06+')');grime.addColorStop(.65,'rgba(65,64,55,0)');grime.addColorStop(1,'rgba(62,65,57,'+wear*.2+')');rect(c,0,15,1600,525,grime);for(let i=0;i<48;i++)rect(c,28+i*32.9,130+noise(i,1)*290,1.2,9+noise(i,9)*40,'rgba(63,68,58,'+wear*.12+')')}
 c.restore();
}
