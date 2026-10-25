import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
import {INIT as INIT_} from './lib.mjs'; const INIT=INIT_(7);
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],ok:true}}));
await p.addInitScript(INIT); await p.addInitScript(()=>{ try{ localStorage.setItem('odb-admin',JSON.stringify('t')); }catch(e){} });
await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="events"]');
const i=await p.evaluate(async()=>{ const c=await import('/js/config.js'); return c.EVENTS.length+c.BETA.findIndex(e=>e.id==='dis'); });
await p.click(`[data-act="sel"][data-i="${i}"]`); await p.click('[data-act="demo"]');
const caps=new Set(); let res=null, qs=null;
for(let k=0;k<3000;k++){ await p.evaluate(()=>window.__step(2)); const s=await p.evaluate(()=>{ const S=window.__odb.S; return S?{c:S.demoCaption,demo:S.demo,mark:S.mark,qs:S.act&&S.act.qs}:null; });
  if(!s||!s.demo) break; if(s.c) caps.add(s.c); if(s.qs) qs=s.qs; if(s.mark!==undefined){ res=s.mark; break; } }
console.log('textos:',[...caps].join(' | ')); console.log('swings',JSON.stringify(qs),'marca',res); console.log(errs.length?errs:'sin errores'); await b.close();
