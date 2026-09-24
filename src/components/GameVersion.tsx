import { useEffect, useState } from 'react';
import { version } from '../../package.json';
import { useTodayStarts } from './StandStats';

export function GameVersion({onStats}:{onStats?:()=>void}){
 const [latest,setLatest]=useState(version);
 const today=useTodayStarts();
 useEffect(()=>{
  if(location.protocol==='file:'||import.meta.env.DEV)return;
  let active=true;
  const check=()=>{
   if(document.hidden)return;
   const url=new URL('./version.json',location.href);url.searchParams.set('check',String(Date.now()));
   void fetch(url,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    if(active&&/^\d+\.\d+\.\d+$/.test(data?.version))setLatest(data.version);
   }).catch(()=>{});
  };
  check();window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);
  return()=>{active=false;window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check)};
 },[]);
 const update=()=>{
  const url=new URL(location.href);url.searchParams.set('v',latest);url.searchParams.set('refresh',String(Date.now()));location.replace(url.href);
 };
 return <div className="game-version"><span>Версия {version}</span>{onStats&&<button onClick={onStats} aria-label={`Статистика стенда: сегодня запусков ${today}`}>Сегодня запусков: {today}</button>}{location.protocol!=='file:'&&<button onClick={update}>{latest!==version?'Доступно обновление — обновить игру':'Обновить игру'}</button>}</div>;
}
