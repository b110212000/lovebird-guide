import {BirdAccount} from './bird-account.js';
import {PushService} from './push-service.js';
export {BirdAccount,PushService};

const ACCOUNT_ID=/^[a-f0-9]{32}$/;
const ORIGIN='https://b110212000.github.io';
const API_VERSION='0.1.1';
const apiJson=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function cors(origin){
  return {'access-control-allow-origin':ORIGIN,'vary':'Origin','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-allow-headers':'content-type,authorization,x-account-id','access-control-max-age':'3600'};
}
const randomSecret=()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
async function parseJSON(req){
  if(Number(req.headers.get('content-length'))>16384)throw new Error('PAYLOAD_TOO_LARGE');
  const content=await req.text();
  if(content.length>16384)throw new Error('PAYLOAD_TOO_LARGE');
  try{return JSON.parse(content||'{}')}catch{throw new Error('INVALID_JSON')}
}
export default {
  async fetch(request,env){
    const url=new URL(request.url),origin=request.headers.get('Origin');
    if(request.method==='OPTIONS'){
      if(origin&&origin!==ORIGIN)return new Response(null,{status:403});
      return new Response(null,{status:204,headers:cors(origin)});
    }
    if(origin&&origin!==ORIGIN)return apiJson({error:'ORIGIN_FORBIDDEN'},403);
    let response;
    try{
      const path=url.pathname,method=request.method;
      if(path==='/health'&&method==='GET'){
        response=apiJson({ok:true,app:'banana-care',version:API_VERSION,auth:'capability-token',push:true});
      }else if(path==='/api/push/public-key'&&method==='GET'){
        const obj=env.PUSH_SERVICE.get(env.PUSH_SERVICE.idFromName('global'));
        response=await obj.fetch('https://internal/public-key');
      }else if(path==='/api/accounts'&&method==='POST'){
        const body=await parseJSON(request);
        const accountId=crypto.randomUUID().replace(/-/g,'');
        const accessKey=randomSecret();
        const timezone=typeof body.timezone==='string'?body.timezone:'Asia/Taipei';
        const name=typeof body.name==='string'?body.name:'香蕉';
        const language=typeof body.language==='string'?body.language:'hant';
        const obj=env.BIRD_ACCOUNT.get(env.BIRD_ACCOUNT.idFromName(accountId));
        const created=await obj.fetch('https://internal/initialize',{method:'POST',body:JSON.stringify({name,timezone,language,accessKey})});
        if(!created.ok)response=created;
        else response=apiJson({accountId,accessKey,account:(await created.json()).account},201);
      }else if(path.startsWith('/api/')){
        const accountId=request.headers.get('x-account-id')||'';
        if(!ACCOUNT_ID.test(accountId)){
          response=apiJson({error:'ACCOUNT_ID_REQUIRED'},401);
        }else{
          const obj=env.BIRD_ACCOUNT.get(env.BIRD_ACCOUNT.idFromName(accountId));
          const route=path.slice('/api'.length);
          const proxied=new URL(request.url);proxied.pathname=route;
          // Only these routes can be reached from outside the Worker.
          if(!(/^\/(state|account|feed|history|subscription)$/.test(route))){
            response=apiJson({error:'NOT_FOUND'},404);
          }else{
            const headers=new Headers(request.headers);
            headers.set('content-type','application/json');
            const forwarded=new Request('https://internal'+route+proxied.search,{method,headers,body:['GET','HEAD'].includes(method)?undefined:request.body,duplex:'half'});
            response=await obj.fetch(forwarded);
          }
        }
      }else response=apiJson({error:'NOT_FOUND'},404);
    }catch(err){
      console.error('banana-worker-error',String(err?.message||err));
      response=apiJson({error:['PAYLOAD_TOO_LARGE','INVALID_JSON'].includes(err?.message)?err.message:'INTERNAL_ERROR'},err?.message==='PAYLOAD_TOO_LARGE'?413:err?.message==='INVALID_JSON'?400:500);
    }
    const out=new Headers(response.headers);
    for(const [k,v] of Object.entries(cors(origin)))out.set(k,v);
    out.set('cache-control','no-store');
    return new Response(response.body,{status:response.status,headers:out});
  }
};