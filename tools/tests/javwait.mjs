import {BASE} from './lib.mjs';
// Javelin: right after the run-up's taps, a moment with no buttons; fingers still down from the taps don't start
// drawing the javelin back, a fresh press once the two buttons show does.
import {chromium} from './pw.mjs';
import {INIT} from './lib.mjs';
const b=await chromium.launch(); const errs=[];
const ok=c=>(m)=>console.log((c?'PASS ':'FAIL ')+m);
const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],incoming:[],outgoing:[],ok:true}}));
await p.addInitScript(INIT(3)); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
await p.click('[data-act="events"]'); await p.click('[data-act="sel"][data-i="4"]'); await p.click('[data-act="go"]'); await p.waitForTimeout(100);
const st=()=>p.evaluate(()=>{ const S=window.__odb.S; return S&&{ph:S.phase,zone:S.zone,cue:S.cue&&S.cue.type,m:S.meter&&S.meter.k,clock:S.clock}; });
const step=n=>p.evaluate(n=>window.__step(n),n);
const ptr=(type,id,x)=>p.evaluate(([type,id,x])=>{ const cv=document.getElementById('game'); (type==='pointerdown'?cv:window).dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:250,bubbles:true,cancelable:true})); },[type,id,x]);
let s, f=0;
for(;f<4000;f++){ s=await st(); if(s&&s.ph==='ready') await p.keyboard.press('ArrowLeft');
  if(s&&s.zone) break;
  const c=await p.evaluate(()=>window.__odb.S?.cue); if(c&&c.type==='side'&&f%6===0) await p.keyboard.press(c.side==='L'?'ArrowLeft':'ArrowRight');
  await step(1); }
// the zone just started: both fingers down at once (as if the last taps landed together)
const t0=s.clock; ok(s.zone&&!s.cue)('al entrar a la zona no hay botones'); await ptr('pointerdown',1,200); await ptr('pointerdown',2,700);
let shown=null; for(let k=0;k<60;k++){ await step(1); s=await st(); if(s.cue==='hold'&&shown==null) shown=s.clock-t0; if(shown!=null) break; }
ok(shown>.12&&shown<.3)(`los dos botones aparecen ${shown?.toFixed(2)} s después`);
await step(10); ok(!(await st()).m)('con los dedos que ya estaban apretados no arranca');
await ptr('pointerup',1,200); await ptr('pointerup',2,700); await step(2); await ptr('pointerdown',1,200); await ptr('pointerdown',2,700); await step(2);
ok((await st()).m==='jav')('soltar y apretar de nuevo arranca');
ok(!errs.length)('sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
