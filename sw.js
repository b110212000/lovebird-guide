/* 香蕉养鸟 PWA service worker · v2.2.1 */
'use strict';
const CACHE_NAME='banana-care-v2.2.1';
const PREFIX='banana-care-';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/banana.svg',
  './icons/banana-180.png','./icons/banana-192.png','./icons/banana-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async(path)=>{
      try {const response=await fetch(new Request(path,{cache:'reload'}));
        if(response.ok)await cache.put(new Request(path),response);
      }catch(_){/* Offline during update: retain what can be cached. */}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE_NAME).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Never cache external Wikimedia API data or unrelated websites.
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try{
      // Network-first avoids stale app updates, with an offline fallback.
      const response=await fetch(req);
      if(response.ok){
        await cache.put(req,response.clone());
        if(req.mode==='navigate')await cache.put(new Request('./index.html'),response.clone());
      }
      return response;
    }catch(_){
      const cached=await cache.match(req,{ignoreSearch:true});
      if(cached)return cached;
      if(req.mode==='navigate'){
        const index=await cache.match(new Request('./index.html'));
        if(index)return index;
      }
      return Response.error();
    }
  })());
});
