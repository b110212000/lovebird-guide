import {DurableObject} from 'cloudflare:workers';
import webpush from 'web-push';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function toBase64Url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function generateKeys(){
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const publicKey=toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)));
  const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  if(!jwk.d)throw Error('VAPID_EXPORT_FAILED');
  return {publicKey,privateKey:jwk.d};
}
export class PushService extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env}
  async vapid(){
    if(!this.promise)this.promise=(async()=>{
      let pair=await this.ctx.storage.get('vapid-keys');
      if(!pair){
        pair=await generateKeys();
        await this.ctx.storage.put('vapid-keys',pair);
      }
      return pair;
    })().catch(e=>{this.promise=null;throw e});
    return this.promise;
  }
  async fetch(req){
    const path=new URL(req.url).pathname;
    if(req.method==='GET'&&path==='/public-key'){
      const {publicKey}=await this.vapid();
      return json({publicKey});
    }
    if(req.method==='POST'&&path==='/send'){
      let body;
      try{body=await req.json()}catch{return json({error:'INVALID_JSON'},400)}
      const sub=body?.subscription,payload=body?.payload;
      if(!sub?.endpoint?.startsWith('https://')||!sub?.keys?.p256dh||!sub?.keys?.auth||!payload?.title)return json({error:'INVALID_PUSH'},400);
      try{
        const keys=await this.vapid();
        webpush.setVapidDetails(this.env.VAPID_SUBJECT||'mailto:admin@example.invalid',keys.publicKey,keys.privateKey);
        const message={title:String(payload.title).slice(0,100),body:String(payload.body||'').slice(0,220),
          url:this.env.APP_URL||'https://b110212000.github.io/lovebird-guide/#journal',tag:String(payload.tag||'banana-feed').slice(0,80)};
        await webpush.sendNotification(sub,JSON.stringify(message),{TTL:300,urgency:'normal'});
        return json({ok:true});
      }catch(e){
        const statusCode=Number(e?.statusCode)||0;
        console.warn('banana push service',statusCode,e?.message);
        return json({ok:false,expired:[400,404,410].includes(statusCode),statusCode},statusCode===0?502:200);
      }
    }
    return json({error:'NOT_FOUND'},404);
  }
}
