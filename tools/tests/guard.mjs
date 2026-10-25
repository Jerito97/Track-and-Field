import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage();
let n=0; await p.route('**/js/ui/daily.js',async r=>{ n++; if(n===1) return r.fulfill({contentType:'text/javascript',body:'export const nada=1;'}); return r.continue(); });
p.on('framenavigated',f=>console.log('  nav',f.url())); p.on('console',m=>console.log('  console',m.text().slice(0,100))); await p.goto(BASE+'/');
const ok=await p.waitForFunction(()=>window.__odb,null,{timeout:40000}).then(()=>true,()=>false);
console.log(n>=2&&ok?'PASS arranque roto: recarga sola y el juego arranca (pedidos de daily.js: '+n+')':'FAIL '+n+' '+ok);
await b.close();
