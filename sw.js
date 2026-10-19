// Offline play: keeps a copy of the game (pages, code, pictures, fonts) so it opens and plays without internet.
// Code and pages: the network first, so every update arrives as soon as there's connection; the copy is the fallback.
// Pictures: the copy first (instant, no waiting on the network), refreshed in the background for next time.
// Server answers that can be read (world top 10, players, tournaments) are kept too: without connection the game
// shows the last ones seen, marked with the header x-offline. Sending things (results, records, logins) is never
// kept: the game queues those itself and sends them when the connection is back.
const CACHE='track-and-field-v1';  // one copy; old names are deleted on activate
const SHELL=['./','index.html','manifest.webmanifest','css/styles.css','js/main.js'];

self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
// the page lists what it already loaded before this worker was in charge (first visit), to keep a copy of it all
self.addEventListener('message',e=>{ if(e.data?.cache) e.waitUntil(caches.open(CACHE).then(c=>Promise.all(e.data.cache.map(u=>c.match(u).then(hit=>hit||c.add(u).catch(()=>{}))))));
});

const FONTS=/^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // fonts never change: the copy first
  if(FONTS.test(req.url)){ e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{ const c=r.clone(); caches.open(CACHE).then(k=>k.put(req,c)); return r; }))); return; }
  if(url.origin!==location.origin) return;
  e.respondWith(req.destination==='image'||url.pathname.includes('/assets/')?fromCache(req,e):fromNetwork(req,url));
});
async function fromCache(req,e){
  const cache=await caches.open(CACHE), hit=await cache.match(req);
  const fresh=fetch(req).then(r=>{ if(r.ok) cache.put(req,r.clone()); return r; });
  if(hit){ e.waitUntil(fresh.catch(()=>{})); return hit; }
  return fresh;
}
async function fromNetwork(req,url){
  const cache=await caches.open(CACHE);
  try{
    const r=await fetch(req);
    if(r.ok) cache.put(req,r.clone());
    return r;
  }catch(err){
    const hit=await cache.match(req,{ignoreSearch:req.mode==='navigate'})||(req.mode==='navigate'?await cache.match('index.html'):null);
    if(!hit) throw err;
    if(!url.pathname.endsWith('/api/t')) return hit;
    // an old server answer: say so
    const h=new Headers(hit.headers); h.set('x-offline','1');
    return new Response(await hit.blob(),{status:hit.status,headers:h});
  }
}
