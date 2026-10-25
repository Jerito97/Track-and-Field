// The game as Vercel serves it, for the tests: the files of the repo and /api/t from api/t.js, on PORT (default
// 8090), with an empty database; plus POST /__sql (tests only) to set things up or look at them with plain SQL
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT=path.resolve(new URL('../..',import.meta.url).pathname), PORT=+(process.env.PORT||8090);
const {default:handler}=await import(path.join(ROOT,'api/t.js'));
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg'};
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/__sql'){ let body=''; for await(const c of req) body+=c; const q=JSON.parse(body);
    try{ const r=await globalThis.__pg.query(q.sql,q.params||[]); res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(r.rows)); }catch(e){ res.writeHead(500); res.end(String(e)); } return; }
  if(u.pathname==='/api/t'){ let body=''; for await(const c of req) body+=c;
    const r={method:req.method,query:Object.fromEntries(u.searchParams),body:body?JSON.parse(body):{}};
    const out={statusCode:200,headers:{},status(c){this.statusCode=c;return this;},setHeader(k,v){this.headers[k]=v;},json(o){res.writeHead(this.statusCode,{'Content-Type':'application/json',...this.headers});res.end(JSON.stringify(o));}};
    return handler(r,out); }
  let f=path.join(ROOT,decodeURIComponent(u.pathname)); if(!f.startsWith(ROOT)){ res.writeHead(403); res.end(); return; } if(f.endsWith('/')) f+='index.html';
  fs.readFile(f,(e,d)=>{ if(e){ res.writeHead(404); res.end(); return; } res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(d); });
}).listen(PORT,()=>console.log('listening '+PORT));
