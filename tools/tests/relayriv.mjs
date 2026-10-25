import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
import {INIT as INIT_} from './lib.mjs'; const INIT=INIT_(7);
const b=await chromium.launch(); const errs=[]; const out=process.argv[2]; let fails=0;
const KEY={L:'ArrowLeft',C:'ArrowDown',R:'ArrowRight'};
const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],ok:true}}));
await p.addInitScript(INIT); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
await p.click('[data-act="events"]'); const i=await p.evaluate(async()=>(await import('/js/config.js')).EVENTS.findIndex(e=>e.id==='4x100'));
await p.click(`[data-act="sel"][data-i="${i}"]`); await p.click('[data-act="go"]');
let shot=0, legs=null;
for(let f=0;f<9000;f++){ const s=await p.evaluate(()=>{ const S=window.__odb.S; return S&&{ph:S.phase,cue:S.cue&&{...S.cue},x:S.x,fin:S.finished,riv:(S.rivals||[]).map(r=>({T:r.T,final:r.final,leg:r.leg,x:r.x,prev:!!r.prev&&r.prev.t<1}))}; });
  if(!s){ console.log("sin S en",f); break; } if(f%1500===0) console.log(f,JSON.stringify({ph:s.ph,cue:s.cue,x:s.x,riv:s.riv.map(r=>[r.x|0,r.leg,r.final])}));
  if(s.ph==='ready'||s.ph==='wait'&&!s.cue) await p.keyboard.press('ArrowLeft');
  if(s.cue&&s.cue.type==='side'&&f%16===0) await p.keyboard.press(KEY[s.cue.side]);
  if(s.cue&&s.cue.type==='both') { await p.keyboard.down('ArrowLeft'); await p.keyboard.down('ArrowRight'); await p.keyboard.up('ArrowLeft'); await p.keyboard.up('ArrowRight'); }
  if(!shot&&s.riv.some(r=>r.prev)&&Math.abs(s.riv.find(r=>r.prev).x-s.x)<10){ await p.screenshot({path:out+'/pase.png'}); shot=1; }
  if(s.riv.length&&s.riv.every(r=>r.final!=null)){ legs=s.riv; break; }
  await p.evaluate(()=>window.__step(1)); }
legs.forEach(r=>console.log('  máquina: tenía que hacer',r.T.toFixed(2),'hizo',r.final,'pases',r.leg));
const ok=legs.every(r=>r.leg===3&&Math.abs(r.final-r.T)<.25); console.log(ok?'PASS las máquinas hacen los 3 pases y llegan en su tiempo':'FAIL'); if(!ok) fails++;
console.log(errs.length?errs:'sin errores', 'captura del pase:',!!shot); await b.close();
