import React,{useEffect,useMemo,useState} from 'react';

export const CLOCK_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const FEED_SLOTS=['morning','evening'];
export const FALLBACK_TIMES={morning:'08:00',evening:'18:00'};
const COPY={
  hans:{
    heading:'今天的喂食',subtitle:'选好时间，喂完点确认，自动记下实际时间',
    scheduled:'计划喂食',actual:'实际完成',todo:'待喂食',upcoming:'未到时间',
    soon:'快到时间',due:'该喂食了',completed:'已完成',doneButton:'✓ 已喂食',
    markButton:'确认已喂',none:'今天都记录完成啦',next:'下次计划',overdue:'尚未确认',
    saved:'喂食时间已保存',marked:'已记录实际喂食时间',reversed:'已取消本次喂食',
    slot:['早上','晚上'],recent:'最近 7 天喂食记录',empty:'之前还没有记录',
    help:'这里只显示当日的计划与完成情况，提醒方式请点右上角「?」。'
  },
  hant:{
    heading:'今日餵食',subtitle:'選擇時間、餵完確認，便會自動記下實際時間',
    scheduled:'預定餵食',actual:'實際完成',todo:'待餵食',upcoming:'尚未到時間',
    soon:'快到時間',due:'該餵食囉',completed:'已完成',doneButton:'✓ 已餵食',
    markButton:'確認已餵',none:'今天都完成紀錄了',next:'下次預定',overdue:'尚未確認',
    saved:'餵食時間已儲存',marked:'已記錄實際餵食時間',reversed:'已取消這次餵食',
    slot:['早上','晚上'],recent:'最近 7 天餵食紀錄',empty:'之前尚無紀錄',
    help:'本頁只顯示今天的預定與完成紀錄，提醒方式可點右上角「?」。'
  }
};
function localDay(d){
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export function shortClock(timestamp,language){
 if(!timestamp||!Number.isFinite(Date.parse(timestamp)))return null;
 return new Intl.DateTimeFormat(language==='hans'?'zh-CN':'zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(timestamp));
}
export function evaluateSlots(feed={},schedule={},now=new Date()){
 const minute=now.getHours()*60+now.getMinutes();
 return FEED_SLOTS.map((slot,i)=>{
  const time=CLOCK_RE.test(schedule[slot]||'')?schedule[slot]:FALLBACK_TIMES[slot];
  const at=Number(time.slice(0,2))*60+Number(time.slice(3,5));
  const completedAt=typeof feed?.[slot]==='string'&&Number.isFinite(Date.parse(feed[slot]))?feed[slot]:null;
  return {slot,index:i,time,scheduledMinute:at,completedAt,minutesRemaining:at-minute,
    state:completedAt?'done':minute>=at?'due':at-minute<=30?'soon':'upcoming'};
 });
}
export function closestFeeding(feed,schedule,now){
 const slots=evaluateSlots(feed,schedule,now).filter(slot=>slot.state!=='done');
 return [...slots].sort((a,b)=>a.scheduledMinute-b.scheduledMinute)[0]||null;
}
function readHistory(dateKey){
 const output=[];
 const base=new Date(dateKey+'T12:00:00');
 if(!Number.isFinite(base.getTime()))return output;
 for(let offset=1;offset<=7;offset++){
  const d=new Date(base);
  d.setDate(base.getDate()-offset);
  const day=localDay(d);
  try{
   const records=JSON.parse(localStorage.getItem('ylg-feed-'+day)||'{}');
   if(records&&typeof records==='object'&&FEED_SLOTS.some(slot=>records[slot]))output.push({day,records});
  }catch{}
 }
 return output;
}
export function FeedingCheckIn({lang,dateKey,feed,schedule,onMarkFeed,onChangeSchedule,toast}){
 const c=COPY[lang==='hant'?'hant':'hans'];
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{
  const tick=()=>setNow(new Date());
  const timer=setInterval(tick,30000);
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('focus',tick);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);window.removeEventListener('focus',tick)};
 },[]);
 const slots=evaluateSlots(feed,schedule,now);
 const next=closestFeeding(feed,schedule,now);
 const count=slots.filter(x=>x.state==='done').length;
 const history=useMemo(()=>readHistory(dateKey),[dateKey,feed]);
 const change=(slot,time)=>{
  if(!CLOCK_RE.test(time))return;
  onChangeSchedule(slot,time);
  toast(c.saved);
 };
 const mark=(entry)=>{
  const shouldMark=entry.state!=='done';
  onMarkFeed(entry.slot,shouldMark);
  const actual=shortClock(new Date().toISOString(),lang);
  toast(shouldMark?c.marked+' · '+actual:c.reversed);
 };
 return <section className="feeding-app" aria-label={c.heading}>
  <div className="feeding-summary">
   <div><span className="feeding-kicker">🍽️ {c.heading}</span><strong>{count} / 2</strong></div>
   <p>{count===2?'✅ '+c.none:next?(next.state==='due'?'🔔 '+c.due+' · ':'⏰ '+c.next+' · ')+c.slot[next.index]+' '+next.time:c.none}</p>
  </div>
  <div className="feeding-list">
   {slots.map(entry=><article className={'feeding-card '+entry.state} key={entry.slot}>
    <div className="feeding-card-top">
     <span className="feeding-avatar">{entry.index?'🌙':'☀️'}</span>
     <div className="feeding-heading"><strong>{c.slot[entry.index]}</strong><span className={'feeding-state '+entry.state}>{entry.state==='done'?'✓ '+c.completed:entry.state==='due'?'🔔 '+c.due:entry.state==='soon'?'⏳ '+c.soon:c.upcoming}</span></div>
    </div>
    <label className="feeding-time-line"><span>{c.scheduled}</span>
     <input type="time" aria-label={c.slot[entry.index]+' '+c.scheduled} value={entry.time} onChange={e=>change(entry.slot,e.target.value)} />
    </label>
    {entry.state==='done'&&<div className="feeding-record"><span>✓ {c.actual}</span><strong>{shortClock(entry.completedAt,lang)}</strong></div>}
    <button type="button" className={'feeding-check-button '+(entry.state==='done'?'done':'')} onClick={()=>mark(entry)}>
     {entry.state==='done'?c.doneButton:c.markButton}
    </button>
   </article>)}
  </div>
  <details className="feeding-history">
   <summary>📒 {c.recent}<span>⌄</span></summary>
   <div>{history.length?history.map(({day,records})=><div key={day} className="feeding-history-row">
    <strong>{day}</strong>
    <span>{FEED_SLOTS.map((slot,i)=>records[slot]?c.slot[i]+' '+shortClock(records[slot],lang):null).filter(Boolean).join(' · ')}</span>
   </div>):<p>{c.empty}</p>}</div>
  </details>
 </section>;
}
