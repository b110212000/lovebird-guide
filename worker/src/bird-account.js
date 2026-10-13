import {DurableObject} from 'cloudflare:workers';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}});
const VALID_TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const SLOT_IDS=['morning','evening'];
const DEFAULT_TIMES={morning:'08:00',evening:'18:00'};
const enc=new TextEncoder();
async function hexSha256(str){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(str)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function sameHash(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
function validateTimezone(timezone){
  if(typeof timezone!=='string'||timezone.length>80)throw new Error('INVALID_TIMEZONE');
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone}).format(new Date());return timezone}catch{throw new Error('INVALID_TIMEZONE')}
}
function validateName(name){
  if(typeof name!=='string'||!name.trim()||name.trim().length>32||/[\u0000-\u001f\u007f]/.test(name))throw new Error('INVALID_NAME');
  return name.trim();
}
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return false;const dt=new Date(v+'T00:00:00Z');return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===v}
function localComponents(ms,zone){
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 const data=Object.fromEntries(fmt.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {date:data.year+'-'+data.month+'-'+data.day,hour:Number(data.hour),minute:Number(data.minute)};
}
function localToEpoch(localDate,time,zone){
 const localMs=Date.parse(localDate+'T'+time+':00Z');
 if(!Number.isFinite(localMs))return null;
 let utc=localMs;
 for(let i=0;i<4;i++){
  const p=localComponents(utc,zone);
  const viewedMs=Date.parse(p.date+'T'+String(p.hour).padStart(2,'0')+':'+String(p.minute).padStart(2,'0')+':00Z');
  utc+=localMs-viewedMs;
 }
 const check=localComponents(utc,zone);
 return check.date===localDate&&check.hour===Number(time.slice(0,2))&&check.minute===Number(time.slice(3,5))?utc:null;
}
function shiftDate(localDate,by){const d=new Date(localDate+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+by);return d.toISOString().slice(0,10)}
function nextDue(state,now=Date.now()){
 if(!state.subscription||!state.notificationsEnabled)return null;
 const today=localComponents(now,state.timezone).date;
 const next=[];
 for(let day=0;day<4;day++)for(const id of SLOT_IDS){
  const date=shiftDate(today,day);
  const target=localToEpoch(date,state.times[id],state.timezone);
  if(target!==null&&target>now+1000)next.push(target);
 }
 return next.length?Math.min(...next):null;
}
function validSubscription(s){
 return !!(s&&typeof s.endpoint==='string'&&s.endpoint.startsWith('https://')&&s.endpoint.length<2300
  &&s.keys&&typeof s.keys.p256dh==='string'&&s.keys.p256dh.length<512
  &&typeof s.keys.auth==='string'&&s.keys.auth.length<512);
}
async function safeBody(req,max=16000){
 const raw=await req.text();
 if(raw.length>max)throw new Error('PAYLOAD_TOO_LARGE');
 try{return JSON.parse(raw||'{}')}catch{throw new Error('INVALID_JSON')}
}
export class BirdAccount extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;this.queue=Promise.resolve()}
 exclusive(task){const p=this.queue.then(task);this.queue=p.catch(()=>{});return p}
 async fetch(req){return this.exclusive(()=>this.handle(req))}
 async handle(req){
  const url=new URL(req.url),path=url.pathname,method=req.method;
  try{
   if(path==='/initialize'&&method==='POST'){
    if(await this.ctx.storage.get('state'))return json({error:'ALREADY_EXISTS'},409);
    const input=await safeBody(req);
    if(typeof input.accessKey!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(input.accessKey))return json({error:'INVALID_KEY'},400);
    const state={tokenHash:await hexSha256(input.accessKey),name:validateName(input.name),timezone:validateTimezone(input.timezone),
      times:{...DEFAULT_TIMES},notificationsEnabled:false,subscription:null,lastSent:{},createdAt:new Date().toISOString()};
    await this.ctx.storage.put('state',state);
    return json({account:this.publicAccount(state)},201);
   }
   const state=await this.ctx.storage.get('state');
   if(!state)return json({error:'NOT_FOUND'},404);
   const auth=req.headers.get('authorization')||'';
   if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(auth)||!sameHash(state.tokenHash,await hexSha256(auth.slice(7))))return json({error:'UNAUTHORIZED'},401);
   if(path==='/state'&&method==='GET'){
    const date=url.searchParams.get('date')||localComponents(Date.now(),state.timezone).date;
    if(!validDate(date))return json({error:'INVALID_DATE'},400);
    const record=await this.ctx.storage.get('feed:'+date)||{};
    return json({account:this.publicAccount(state),date,feed:record});
   }
   if(path==='/account'&&method==='PATCH'){
    const input=await safeBody(req);
    if(Object.hasOwn(input,'name'))state.name=validateName(input.name);
    if(Object.hasOwn(input,'timezone'))state.timezone=validateTimezone(input.timezone);
    if(Object.hasOwn(input,'times')){
      if(!input.times||typeof input.times!=='object'||Array.isArray(input.times))return json({error:'INVALID_TIMES'},400);
      for(const id of SLOT_IDS)if(Object.hasOwn(input.times,id)){
        if(!VALID_TIME.test(input.times[id]))return json({error:'INVALID_TIME'},400);
        state.times[id]=input.times[id];
      }
    }
    if(Object.hasOwn(input,'notificationsEnabled')){
      if(typeof input.notificationsEnabled!=='boolean')return json({error:'INVALID_ENABLED'},400);
      state.notificationsEnabled=input.notificationsEnabled;
    }
    await this.ctx.storage.put('state',state);await this.scheduleNext(state);
    return json({account:this.publicAccount(state)});
   }
   if(path==='/feed'&&method==='GET'){
    const date=url.searchParams.get('date')||localComponents(Date.now(),state.timezone).date;
    if(!validDate(date))return json({error:'INVALID_DATE'},400);
    return json({date,feed:await this.ctx.storage.get('feed:'+date)||{}});
   }
   if(path==='/feed'&&method==='PUT'){
    const body=await safeBody(req);
    const date=body.date||localComponents(Date.now(),state.timezone).date;
    if(!validDate(date)||!SLOT_IDS.includes(body.slot)||typeof body.done!=='boolean')return json({error:'INVALID_FEED'},400);
    const key='feed:'+date,record=await this.ctx.storage.get(key)||{};
    if(body.done&&!record[body.slot]){
      // Preserve the real check-in time even when the device was offline.
      // Legacy clients can omit completedAt and will use server time.
      const reported=body.completedAt;
      if(reported!==undefined&&reported!==null){
       const when=typeof reported==='string'?Date.parse(reported):NaN;
       if(!Number.isFinite(when)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(reported)
         ||when>Date.now()+300000||when<Date.now()-90*24*60*60*1000)
        return json({error:'INVALID_COMPLETED_AT'},400);
       record[body.slot]=new Date(when).toISOString();
      }else record[body.slot]=new Date().toISOString();
     }
    if(!body.done)delete record[body.slot];
    await this.ctx.storage.put(key,record);
    return json({date,feed:record});
   }
   if(path==='/history'&&method==='GET'){
    const days=Math.min(90,Math.max(1,Number(url.searchParams.get('days'))||30));
    const rows=await this.ctx.storage.list({prefix:'feed:',reverse:true,limit:days});
    return json({history:[...rows].map(([key,feed])=>({date:key.slice(5),feed}))});
   }
   if(path==='/subscription'&&method==='PUT'){
    const body=await safeBody(req);
    if(!validSubscription(body.subscription))return json({error:'INVALID_SUBSCRIPTION'},400);
    state.subscription=body.subscription;
    state.notificationsEnabled=true;
    await this.ctx.storage.put('state',state);await this.scheduleNext(state);
    return json({account:this.publicAccount(state)});
   }
   if(path==='/subscription'&&method==='DELETE'){
    state.subscription=null;state.notificationsEnabled=false;
    await this.ctx.storage.put('state',state);await this.scheduleNext(state);
    return json({account:this.publicAccount(state)});
   }
   return json({error:'NOT_FOUND'},404);
  }catch(e){
   const message=String(e?.message||'INTERNAL_ERROR');
   console.error('bird-account',message);
   return json({error:/^INVALID_|^PAYLOAD_TOO_LARGE/.test(message)?message:'INTERNAL_ERROR'},/^INVALID_|^PAYLOAD_TOO_LARGE/.test(message)?400:500);
  }
 }
 publicAccount(s){return {name:s.name,timezone:s.timezone,times:s.times,notificationsEnabled:s.notificationsEnabled,subscriptionActive:!!s.subscription,createdAt:s.createdAt}}
 async scheduleNext(state){
   const when=nextDue(state);
   if(when)await this.ctx.storage.setAlarm(when);
   else await this.ctx.storage.deleteAlarm();
 }
 async alarm(){return this.exclusive(async()=>{
  const state=await this.ctx.storage.get('state');if(!state)return;
  const now=Date.now(),today=localComponents(now,state.timezone).date;
  if(state.notificationsEnabled&&state.subscription){
   for(const id of SLOT_IDS){
    const scheduled=localToEpoch(today,state.times[id],state.timezone);
    if(scheduled===null||now<scheduled||now-scheduled>120*60000)continue;
    const mark=today+':'+id;
    if(state.lastSent[mark])continue;
    const feed=await this.ctx.storage.get('feed:'+today)||{};
    if(feed[id])continue;
    const label=id==='morning'?'早上':'晚上';
    try{
      const stub=this.env.PUSH_SERVICE.get(this.env.PUSH_SERVICE.idFromName('global'));
      const result=await stub.fetch('https://internal/send',{method:'POST',body:JSON.stringify({subscription:state.subscription,
       payload:{title:state.name+' · 餵食提醒',body:label+'時間到了，記得確認飼料與清水。',url:this.env.APP_URL||'https://b110212000.github.io/lovebird-guide/#journal',tag:'banana-'+today+'-'+id}})});
      const status=await result.json();
      if(status.ok)state.lastSent[mark]=new Date().toISOString();
      else if(status.expired){state.subscription=null;state.notificationsEnabled=false}
      else console.warn('Push temporarily unavailable',status.statusCode);
    }catch(e){console.warn('Push temporarily failed',String(e))}
   }
  }
  // Keep only recent idempotency keys to avoid unbounded account growth.
  const cutoff=shiftDate(today,-14);
  state.lastSent=Object.fromEntries(Object.entries(state.lastSent).filter(([key])=>key.slice(0,10)>=cutoff));
  await this.ctx.storage.put('state',state);
  await this.scheduleNext(state);
 })}
}
export const __accountTestHelpers={localToEpoch,nextDue,validDate};