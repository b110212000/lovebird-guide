import React,{useEffect,useMemo,useState} from 'react';
import {CLOCK_RE,MAX_SLOTS,normalizeSlots,activeCount} from './feed-slots.js';

const C={
 hans:{title:'今日喂食',due:'该喂食啦',soon:'快到时间',future:'尚未到时间',done:'已完成',next:'下次喂食',
  complete:'确认已喂',cancel:'✓ 已喂食',actual:'实际喂食',planned:'计划喂食',
  add:'＋ 新增喂食时段',addDone:'已增加喂食时段',choose:'选择时间',save:'喂食时间已保存',
  delete:'删除时段',confirmDelete:'确定删除这个时段？过去的喂食记录不会删除。',
  min:'至少需要一个喂食时段',max:'最多设置 12 个时段',
  completed:'已记录喂食时间',undone:'已取消本次喂食',history:'最近 7 天喂食记录',
  empty:'之前没有记录',all:'今天所有时段都打卡了',
  note:'喂食次数请按鸟儿年龄和健康情况，并依鸟类兽医指导调整。已断奶鸟的适当主食及饮水不应限为固定几餐。',
  old:'旧时段',slot:i=>`第${i+1}餐`},
 hant:{title:'今日餵食',due:'該餵食囉',soon:'快到時間',future:'尚未到時間',done:'已完成',next:'下次餵食',
  complete:'確認已餵',cancel:'✓ 已餵食',actual:'實際餵食',planned:'預定餵食',
  add:'＋ 新增餵食時段',addDone:'已新增餵食時段',choose:'選擇時間',save:'餵食時間已儲存',
  delete:'刪除時段',confirmDelete:'確定刪除此時段？過去的餵食紀錄會保留。',
  min:'至少需要一個餵食時段',max:'最多可設定 12 個時段',
  completed:'已記錄實際餵食時間',undone:'已取消本次餵食',history:'最近 7 天餵食紀錄',
  empty:'先前沒有紀錄',all:'今日所有時段都完成打卡了',
  note:'餵食次數請依鳥兒年齡、健康狀況及鳥類獸醫建議調整。已斷奶鳥的適當主食與清水不應限為固定幾餐。',
  old:'舊時段',slot:i=>`第${i+1}餐`}
};
export function shortClock(value,lang){
 if(!value||!Number.isFinite(Date.parse(value)))return '';
 return new Intl.DateTimeFormat(lang==='hans'?'zh-CN':'zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
}
export function labelForSlot(id,slots,lang){
 const locale=lang==='hans'?'hans':'hant',position=slots.findIndex(s=>s.id===id);
 if(position>=0)return C[locale].slot(position);
 if(id==='morning')return locale==='hans'?'早上':'早上';
 if(id==='evening')return locale==='hans'?'晚上':'晚上';
 return C[locale].old;
}
export function evaluateSlots(feed={},slots=[],now=new Date()){
 const minute=now.getHours()*60+now.getMinutes();
 return normalizeSlots(slots).map((slot,index)=>{
  const scheduledMinute=Number(slot.time.slice(0,2))*60+Number(slot.time.slice(3,5));
  const completedAt=typeof feed?.[slot.id]==='string'&&Number.isFinite(Date.parse(feed[slot.id]))?feed[slot.id]:null;
  return {...slot,slot:slot.id,index,scheduledMinute,completedAt,
   state:completedAt?'done':minute>=scheduledMinute?'due':scheduledMinute-minute<=30?'soon':'upcoming'};
 });
}
export function closestFeeding(feed,slots,now){return evaluateSlots(feed,slots,now).find(s=>s.state!=='done')||null}
function localDay(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function readHistory(dateKey){
 const result=[],base=new Date(dateKey+'T12:00:00');
 if(!Number.isFinite(base.getTime()))return result;
 for(let offset=1;offset<=7;offset++){
  const d=new Date(base);d.setDate(d.getDate()-offset);
  const date=localDay(d);
  try{
   const record=JSON.parse(localStorage.getItem('ylg-feed-'+date)||'{}');
   if(record&&typeof record==='object'&&Object.values(record).some(Boolean))result.push({date,record});
  }catch{}
 }
 return result;
}
export function FeedingCheckIn({lang,dateKey,feed,slots,onMarkFeed,onChangeTime,onAddSlot,onDeleteSlot,toast}){
 const c=C[lang==='hans'?'hans':'hant'];
 const [now,setNow]=useState(()=>new Date());
 const [addTime,setAddTime]=useState('12:00');
 useEffect(()=>{
  const update=()=>setNow(new Date()),id=setInterval(update,30000);
  document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);
  return()=>{clearInterval(id);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update)};
 },[]);
 const items=evaluateSlots(feed,slots,now);
 const done=activeCount(feed,slots);
 const next=closestFeeding(feed,slots,now);
 const history=useMemo(()=>readHistory(dateKey),[dateKey,feed]);
 const saveTime=(id,v)=>{if(!CLOCK_RE.test(v))return;onChangeTime(id,v);toast(c.save)};
 const mark=(item)=>{
  const complete=item.state!=='done';
  onMarkFeed(item.id,complete);
  toast(complete?c.completed+' · '+shortClock(new Date().toISOString(),lang):c.undone);
 };
 const add=()=>{
  if(items.length>=MAX_SLOTS){toast(c.max,'error');return}
  if(!CLOCK_RE.test(addTime))return;
  onAddSlot(addTime);toast(c.addDone);
 };
 const remove=id=>{
  if(items.length===1){toast(c.min,'error');return}
  if(window.confirm(c.confirmDelete))onDeleteSlot(id);
 };
 return <section className="feeding-app" aria-label={c.title}>
  <div className="feeding-summary"><div><span className="feeding-kicker">🍽️ {c.title}</span><strong>{done} / {items.length}</strong></div>
   <p>{done===items.length?'✅ '+c.all:next?(next.state==='due'?'🔔 '+c.due:'⏰ '+c.next)+' · '+c.slot(next.index)+' '+next.time:c.all}</p>
  </div>
  <div className="feeding-list">{items.map(item=><article className={'feeding-card '+item.state} key={item.id}>
   <div className="feeding-card-top">
    <span className="feeding-avatar">{item.index===0?'🌅':item.index===items.length-1?'🌙':'🥣'}</span>
    <div className="feeding-heading"><strong>{c.slot(item.index)}</strong><span className={'feeding-state '+item.state}>{item.state==='done'?'✓ '+c.done:item.state==='due'?'🔔 '+c.due:item.state==='soon'?'⏳ '+c.soon:c.future}</span></div>
    <button type="button" className="feeding-remove" aria-label={c.delete+' '+c.slot(item.index)} onClick={()=>remove(item.id)}>✕</button>
   </div>
   <label className="feeding-time-line"><span>{c.planned}</span><input type="time" aria-label={c.slot(item.index)+' '+c.planned} value={item.time} onChange={e=>saveTime(item.id,e.target.value)}/></label>
   {item.completedAt&&<div className="feeding-record"><span>✓ {c.actual}</span><strong>{shortClock(item.completedAt,lang)}</strong></div>}
   <button type="button" className={'feeding-check-button '+(item.completedAt?'done':'')} onClick={()=>mark(item)}>{item.completedAt?c.cancel:c.complete}</button>
  </article>)}</div>
  <div className="feeding-add"><label>{c.choose}<input type="time" value={addTime} onChange={e=>setAddTime(e.target.value)} aria-label={c.choose}/></label>
   <button type="button" disabled={items.length>=MAX_SLOTS} onClick={add}>{c.add}</button></div>
  <details className="feeding-history"><summary>📒 {c.history}<span>⌄</span></summary>
   <div>{history.length?history.map(({date,record})=><div className="feeding-history-row" key={date}><strong>{date}</strong><span>{Object.entries(record).filter(([,stamp])=>stamp).map(([slot,stamp])=>labelForSlot(slot,slots,lang)+' '+shortClock(stamp,lang)).join(' · ')}</span></div>):<p>{c.empty}</p>}</div>
  </details>
  <p className="minor-copy">{c.note}</p>
 </section>;
}
