import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
import {INIT as INIT_} from './lib.mjs'; const INIT=INIT_(7);
const b=await chromium.launch(); const errs=[]; const out=process.argv[2];
const KEY={L:'ArrowLeft',C:'ArrowDown',R:'ArrowRight'};
async function run(evI,lead,shot){
  const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],ok:true}}));
  await p.addInitScript(INIT); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
  await p.click('[data-act="events"]'); await p.click(`[data-act="sel"][data-i="${evI}"]`); await p.click('[data-act="go"]');
  let pressed=false, res=null, shotDone=false;
  for(let f=0;f<6000;f++){ const s=await p.evaluate(()=>{ const S=window.__odb.S; return S&&{ph:S.phase,cue:S.cue&&{...S.cue},x:S.x,v:S.v,dist:S.ev.dist,fin:S.finished,final:S.final,cued:S.dipCued,pops:S.pops.map(q=>q.text+(q.sub?' '+q.sub:''))}; });
    if(!s) break;
    if(s.ph==='ready'||s.ph==='wait'&&!s.cue) await p.keyboard.press('ArrowLeft');
    if(s.cue&&s.cue.type==='side'&&f%3===0) await p.keyboard.press(KEY[s.cue.side]);
    if(s.cue&&s.cue.type==='num') await p.keyboard.press(KEY[s.cue.side||'C']).catch(()=>{});
    if(s.cued&&!pressed&&!s.fin){ if(shot&&!shotDone&&(s.dist-s.x)/Math.max(s.v,.1)<=.55){ await p.screenshot({path:out+'/marca.png'}); shotDone=true; }
      if((s.dist-s.x)/Math.max(s.v,.1)<=lead){ await p.keyboard.down('ArrowLeft'); await p.keyboard.down('ArrowRight'); await p.keyboard.up('ArrowLeft'); await p.keyboard.up('ArrowRight'); pressed=true; } }
    if(s.fin&&s.final!=null&&!res){ res={final:s.final,pops:s.pops.filter(t=>/PERFECTO|BIEN|REGULAR|FLOJO|TEMPRANO|SIN/.test(t))}; }
    if(res&&f%20===0) break;
    await p.evaluate(()=>window.__step(1)); }
  await p.context().close(); return res; }
for(const lead of [.45,.25]){ const r=await run(0,lead,lead===.45); console.log('100 m, apretando',lead,'s antes de la meta →',JSON.stringify(r)); }
console.log(errs.length?errs:'sin errores'); await b.close();
