import {API_BASE} from './cloud-config.js';
const KEY='ylg-cloud-credentials-v1';
const PENDING='ylg-cloud-pending-v1';
export function backendReady(){return /^https:\/\/[a-z0-9.-]+\.workers\.dev\/?$/.test(API_BASE)||/^https:\/\/[a-z0-9.-]+\/?$/.test(API_BASE)}
export function readCredentials(){
  try{const val=JSON.parse(localStorage.getItem(KEY)||'null');
    if(val&&/^[a-f0-9]{32}$/.test(val.accountId)&&/^[A-Za-z0-9_-]{43}$/.test(val.accessKey))return val;
  }catch{}
  return null;
}
export function saveCredentials(creds){localStorage.setItem(KEY,JSON.stringify({accountId:creds.accountId,accessKey:creds.accessKey}))}
export function clearCredentials(){localStorage.removeItem(KEY)}
export async function request(path,{method='GET',body,creds,signal}={}){
  if(!backendReady())throw Error('BACKEND_NOT_CONFIGURED');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  if(signal)signal.addEventListener('abort',()=>ctrl.abort(),{once:true});
  try{
    const headers={Accept:'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(creds){headers['x-account-id']=creds.accountId;headers.Authorization='Bearer '+creds.accessKey}
    const res=await fetch(API_BASE.replace(/\/$/,'')+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:ctrl.signal,cache:'no-store'});
    const data=await res.json().catch(()=>({error:'INVALID_RESPONSE'}));
    if(!res.ok)throw Error(data.error||'HTTP_'+res.status);
    return data;
  }finally{clearTimeout(timer)}
}
export async function registerAccount(name,timezone){
  return request('/api/accounts',{method:'POST',body:{name,timezone}});
}
export function cloudState(creds,date){return request('/api/state?date='+encodeURIComponent(date),{creds})}
export function cloudUpdate(creds,body){return request('/api/account',{method:'PATCH',body,creds})}
export function cloudFeed(creds,date,slot,done,completedAt){return request('/api/feed',{method:'PUT',body:{date,slot,done,completedAt},creds})}
export function cloudHistory(creds,days=30){return request('/api/history?days='+days,{creds})}
export function cloudSubscribe(creds,subscription){return request('/api/subscription',{method:'PUT',body:{subscription},creds})}
export function cloudUnsubscribe(creds){return request('/api/subscription',{method:'DELETE',creds})}
export function queueChange(change){
 try{
  const list=JSON.parse(localStorage.getItem(PENDING)||'[]');
  const id=crypto.randomUUID();
  list.push({...change,id});
  localStorage.setItem(PENDING,JSON.stringify(list.slice(-200)));
 }catch{}
}
let activeFlush=null;
export async function syncPending(creds){
 if(!creds||!backendReady())return false;
 if(activeFlush)return activeFlush;
 activeFlush=(async()=>{
  for(let i=0;i<250;i++){
   let queue;
   try{queue=JSON.parse(localStorage.getItem(PENDING)||'[]')}catch{return false}
   if(!Array.isArray(queue)||!queue.length)return true;
   const job=queue[0];
   try{
    if(job.kind==='feed')await cloudFeed(creds,job.date,job.slot,job.done,job.completedAt);
    else if(job.kind==='account')await cloudUpdate(creds,job.patch);
   }catch{return false}
   // Preserve any edits queued while this network request was in flight.
   let latest;
   try{latest=JSON.parse(localStorage.getItem(PENDING)||'[]')}catch{return false}
   if(!Array.isArray(latest))return false;
   if(latest[0]?.id===job.id)latest.shift();
   else latest=latest.filter(x=>x.id!==job.id);
   if(latest.length)localStorage.setItem(PENDING,JSON.stringify(latest));
   else localStorage.removeItem(PENDING);
  }
  return false;
 })();
 try{return await activeFlush}finally{activeFlush=null}
}
export function queueLength(){try{return JSON.parse(localStorage.getItem(PENDING)||'[]').length}catch{return 0}}
export function subscriptionSupported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
function base64ToBytes(b64){
 const padding='='.repeat((4-b64.length%4)%4);
 const str=atob((b64+padding).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(str,ch=>ch.charCodeAt(0));
}
export async function enableCloudPush(creds){
  if(!subscriptionSupported())throw Error('PUSH_UNSUPPORTED');
  // Request notification permission directly from the click gesture before network awaits.
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('NOTIFICATION_DENIED');
  const {publicKey}=await request('/api/push/public-key');
  const reg=await navigator.serviceWorker.ready;
  const subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToBytes(publicKey)});
  const saved=await cloudSubscribe(creds,subscription.toJSON());
  return saved.account;
}
export async function disableCloudPush(creds){
  await cloudUnsubscribe(creds);
  if('serviceWorker' in navigator){
    const registration=await navigator.serviceWorker.ready;
    const sub=await registration.pushManager.getSubscription();
    if(sub)await sub.unsubscribe();
  }
}
