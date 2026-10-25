import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
import {INIT as INIT_} from './lib.mjs'; const INIT=INIT_(7);
const b=await chromium.launch(); const errs=[]; let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const KEY={L:'ArrowLeft',R:'ArrowRight'};
async function race(label,tgt,gap){
  const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],ok:true}}));
  await p.addInitScript(INIT); await p.addInitScript(()=>{ try{ localStorage.setItem('odb-admin',JSON.stringify('t')); }catch(e){} });
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="events"]'); await p.click('[data-act="sel"][data-i="14"]'); await p.click('[data-act="go"]');
  let down=null, wait=0, n=0, over=0, last=null, fin=null;
  for(let f=0;f<12000;f++){ const s=await p.evaluate(()=>{ const S=window.__odb.S; return S&&{ph:S.phase,cue:S.cue&&{...S.cue},st:S.ped&&S.ped.st,side:S.ped&&S.ped.side,p:S.ped&&S.ped.p,x:S.x,v:S.v,fin:S.finished,final:S.final,riv:(S.rivals||[]).map(r=>r.final),pops:S.pops.map(q=>q.text)}; });
    if(!s) break; last=s; if(s.final!=null) fin=s.final;
    if(s.pops.includes('¡TE PASASTE!')&&!s.__c) over++;
    if(s.cue&&s.cue.type==='pedal'){
      if(s.st==='wait'&&!down){ if(wait>0) wait--; else { down=s.side; await p.keyboard.down(KEY[down]); } }
      else if(s.st==='hold'&&down&&s.p>=tgt){ await p.keyboard.up(KEY[down]); down=null; n++; wait=gap; } }
    if(s.cue&&s.cue.type==='both'&&500-s.x<=s.v*.22){ if(down){ await p.keyboard.up(KEY[down]); down=null; } await p.keyboard.press(' '); }
    if(s.fin&&s.riv.every(r=>r!=null)) break;
    await p.evaluate(()=>window.__step(1)); }
  console.log(label,'tiempo',fin,'pedaleadas',n,'máquinas',JSON.stringify(last.riv.slice().sort((a,b)=>a-b)));
  await p.context().close(); return {...last,final:fin}; }
const A=await race('perfecto',.955,4); const B=await race('bueno',.9,7); const H=await race('humano',1.0,12); const C=await race('flojo',.72,10); const D=await race('pasado',1.25,6);
ok(A.final<B.final&&B.final<C.final,'mejor soltar al completar');
ok(D.final>B.final,'pasarse es peor');
const riv=B.riv; ok(Math.min(...riv)>38&&Math.max(...riv)<45,'máquinas entre 38 y 45 s');
console.log(errs.join('|')||'sin errores'); console.log(fails?fails+' FALLAS':'CICLISMO OK'); await b.close();
