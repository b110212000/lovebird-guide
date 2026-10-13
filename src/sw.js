/* Banana Care PWA __VERSION__ */
const NAME='banana-react-__VERSION__';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/app-__VERSION__.js','./assets/app-__VERSION__.css','./icons/banana.svg','./icons/banana-180.png','./icons/banana-192.png','./icons/banana-512.png'];
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