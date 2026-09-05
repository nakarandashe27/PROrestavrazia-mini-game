import { useId } from 'react';
import type { IconId } from '../game/content';
export function Detail({id, part, muted=false}: {id:IconId;part?:number;muted?:boolean}) {
 const uid=useId().replace(/:/g,'');
 return <svg viewBox="0 0 240 240" fill="none" aria-hidden="true" className="detail-art">
  <defs><linearGradient id={uid} x1="40" y1="30" x2="190" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#719da8"/><stop offset="1" stopColor="#c6dbd6"/></linearGradient>
  <clipPath id={uid+'clip'}><rect x={part===undefined?0:part*80} width={part===undefined?240:80} height="240"/></clipPath></defs>
  <g clipPath={`url(#${uid}clip)`} opacity={muted?.25:1}>
  {id==='portal'&&<>
   <path d="M30 224V82Q40 40 120 15Q200 40 210 82V224H177V96Q170 67 120 40Q70 67 63 96V224Z" fill="#b65b4d" stroke="#80493e" strokeWidth="3"/>
   <path d="M65 222V100Q68 70 120 43Q172 70 175 100V222Z" fill={`url(#${uid})`} stroke="#584c40" strokeWidth="5"/>
   <circle cx="120" cy="85" r="24" stroke="#655042" strokeWidth="6"/>
   <path d="M67 132H174V224H67Z" fill="#6e5743"/><path d="M76 144H164V192H76Z" fill={`url(#${uid})`}/><path d="M120 133V222M76 166H164" stroke="#524538" strokeWidth="5"/>
   <path d="M24 224H216M28 87V224M211 87V224" stroke="#d78b6d" strokeWidth="6"/>
  </>}
  {id==='door'&&<>
   <path d="M43 223V50Q76 44 84 24H156Q164 44 197 50V223Z" fill="#6b5140" stroke="#443e32" strokeWidth="4"/>
   <path d="M54 66H186V114H54Z" fill={`url(#${uid})`}/><path d="M52 132H110V184H52ZM130 132H188V184H130Z" fill={`url(#${uid})`}/>
   <path d="M119 62V224M54 88H186M77 66V114M163 66V114" stroke="#594938" strokeWidth="5"/>
   <path d="M55 197H108V217H55ZM132 197H185V217H132Z" stroke="#b29570" strokeWidth="3"/><path d="M110 162V176M130 162V176" stroke="#d7b772" strokeWidth="4"/>
  </>}
  {id==='window'&&<>
   <rect x="35" y="23" width="170" height="193" fill="#dfd9c5"/><rect x="43" y="31" width="154" height="178" fill={`url(#${uid})`} stroke="#665449" strokeWidth="7"/>
   <path d="M80 32V208M120 32V208M160 32V208M45 67H196M45 170H196M45 191H196" stroke="#655246" strokeWidth="4"/>
   <path d="M49 151L179 37H192L61 207H49Z" fill="white" opacity=".16"/><path d="M26 218H214" stroke="#c4bdac" strokeWidth="8"/>
  </>}
  {id==='pylon'&&<>
   <path d="M67 219V39H78V20H162V39H174V219Z" fill="#b85e4c" stroke="#8c493c" strokeWidth="3"/>
   <path d="M82 41V215M156 41V215" stroke="#d99173" strokeWidth="7"/>
   {[54,74,94,114,134,154,174,194].map((y,i)=><g key={y} stroke="#974b3d" strokeWidth="2"><path d={`M89 ${y}H153M${i%2?108:132} ${y}V${y+20}`}/></g>)}
   <path d="M60 220H180M69 22H171" stroke="#ded5bf" strokeWidth="7"/>
  </>}
  {id==='cornice'&&<>
   <path d="M23 63H217V90H201V116H182V138H168V189H72V138H57V116H39V90H23Z" fill="#e4dec8" stroke="#938872" strokeWidth="3"/>
   <path d="M27 88H211M42 112H198M62 137H178M74 166H166" stroke="#b7a991" strokeWidth="5"/>
   <path d="M72 190H168V222H72Z" fill="#b85e4c"/>
  </>}
  {id==='drain'&&<>
   <path d="M70 24H166L150 64H132V178L170 207L158 225L104 189V64H87Z" fill="#92a49c" stroke="#526f68" strokeWidth="4"/>
   <path d="M110 66V177M84 32H153M133 185L161 207" stroke="#e4e6d5" strokeWidth="7"/><path d="M101 109H139M101 158H139" stroke="#526f68" strokeWidth="5"/>
  </>}
  </g>
 </svg>
}
