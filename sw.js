/* Banana Care PWA 2.4.0 */
const NAME='banana-react-2.4.0';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/app-2.4.0.js','./assets/app-2.4.0.css','./icons/banana.svg','./icons/banana-180.png','./icons/banana-192.png','./icons/banana-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(NAME);
    await Promise.all(CORE.map(async url=>{
      try{const response=await fetch(new Request(url,{cache:'reload'}));if(response.ok)await cache.put(url,response)}catch{}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(x=>x.startsWith('banana-react-')&&x!==NAME).map(x=>caches.delete(x)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(NAME);
    try{
      const res=await fetch(req);
      if(res.ok)cache.put(req,res.clone()).catch(()=>{});
      return res;
    }catch{
      const found=await cache.match(req,{ignoreSearch:true});
      if(found)return found;
      if(req.mode==='navigate')return await cache.match('./index.html');
      return Response.error();
    }
  })());
});

// iOS/iPadOS 16.4+ home-screen PWA background push.
self.addEventListener('push',event=>{
  let payload={title:'香蕉养鸟提醒',body:'该检查小鸟饲料啦。',tag:'banana-feed',url:'./#journal'};
  try{if(event.data)payload={...payload,...event.data.json()}}catch{}
  const title=String(payload.title||'香蕉养鸟提醒').slice(0,100);
  const path=new URL(payload.url||'./#journal',self.registration.scope);
  const safeUrl=path.origin===self.location.origin&&path.pathname.startsWith(new URL(self.registration.scope).pathname)?path.href:new URL('./#journal',self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(title,{
    body:String(payload.body||'').slice(0,220),
    icon:'./icons/banana-192.png',
    badge:'./icons/banana-192.png',
    tag:String(payload.tag||'banana-feed').slice(0,80),
    data:{url:safeUrl}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||new URL('./#journal',self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(client.url.startsWith(self.registration.scope)){
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
