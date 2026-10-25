import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
import {INIT as INIT_} from './lib.mjs'; const INIT=INIT_(7);
const out=process.argv[2], b=await chromium.launch(); const errs=[]; let fails=0;
for(const [w,h] of [[1000,462],[844,390],[740,360],[932,430],[390,844]]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],ok:true}}));
  await p.addInitScript(INIT); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.evaluate(()=>window.__step(60));
  await p.click('[data-act="events"]'); await p.waitForTimeout(400);
  const n=await p.$$eval('.m-ev',l=>l.length); const bad=[];
  for(let i=0;i<n;i++){ await p.evaluate(i=>document.querySelector(`[data-act="sel"][data-i="${i}"]`).click(),i); await p.waitForTimeout(80);
    const m=await p.evaluate(()=>{ const h=document.querySelector('.m-info h1'), hero=document.querySelector('.m-hero').getBoundingClientRect(), acts=[...document.querySelectorAll('.m-acts button')].map(b=>b.getBoundingClientRect());
      return {name:h.textContent,one:h.getBoundingClientRect().height<parseFloat(getComputedStyle(h).fontSize)*1.4,fit:h.scrollWidth<=h.clientWidth+1,inBox:acts.every(r=>r.bottom<=hero.bottom+1&&r.top>=hero.top-1),fs:getComputedStyle(h).fontSize}; });
    if(!(m.one&&m.fit&&m.inBox)) bad.push(JSON.stringify(m));
    if(m.name==='Lanzamiento de disco') await p.screenshot({path:`${out}/hero-${w}.png`}); }
  if(bad.length) fails++; console.log((bad.length?'FAIL ':'PASS ')+w+'x'+h+': '+n+' pruebas'+(bad.length?' '+bad.join(' '):'')); await p.context().close(); }
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
