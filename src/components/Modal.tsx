import { useEffect, useRef, type ReactNode } from 'react';
export function Modal({children,label,wide=false}:{children:ReactNode;label:string;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const root=ref.current!;
  (root.querySelector('button:not([disabled]), a, input') as HTMLElement|null)?.focus();
  const focusable=()=>[...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const nodes=focusable();
   if(!nodes.length){e.preventDefault();return}const first=nodes[0],last=nodes[nodes.length-1];
   if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus()}
  };
  const guard=(e:FocusEvent)=>{if(!root.contains(e.target as Node))focusable()[0]?.focus()};
  const changes=new MutationObserver(()=>{const active=document.activeElement as HTMLElement|null;if(!root.contains(active)||active?.matches(':disabled'))focusable()[0]?.focus()});
  changes.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
  document.addEventListener('keydown',trap);document.addEventListener('focusin',guard);
  return()=>{changes.disconnect();document.removeEventListener('keydown',trap);document.removeEventListener('focusin',guard);previous?.focus()};
 },[]);
 return <div className="modal-backdrop"><div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={'modal '+(wide?'wide':'')}>{children}</div></div>
}
