import {BASE} from './lib.mjs';
// Phone upright: the game at the top taking most of the screen, the big buttons below it answer (each half a side;
// the hurdles, a third each), no buttons drawn inside the game
import {chromium} from './pw.mjs';
import {INIT} from './lib.mjs';
const b=await chromium.launch(); const errs=[], out=process.argv[2];
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],incoming:[],outgoing:[],ok:true}}));
await p.addInitScript(INIT(3)); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
const lay=await p.evaluate(async()=>{ const c=await import('/js/canvas.js'); return {LW:c.LW,SC:c.SC,OY:c.OY,PORTRAIT:c.PORTRAIT,pad:c.padArea()}; });
console.log('  ',JSON.stringify(lay));
ok(lay.PORTRAIT&&lay.OY<20&&lay.LH!==0&&320*lay.SC>844*.5,'el juego arriba, más de la mitad del alto');
ok(lay.pad.bot-lay.pad.top>220,'abajo, lugar para los botones grandes');
const step=n=>p.evaluate(n=>window.__step(n),n);
const st=()=>p.evaluate(()=>{ const S=window.__odb.S; return S&&{ph:S.phase,cue:S.cue&&{type:S.cue.type,side:S.cue.side,order:S.cue.order,next:S.cue.next},x:S.x,hk:S.hk,ev:S.ev.id}; });
const tap=async(x,y)=>{ await p.evaluate(([x,y])=>{ const cv=document.getElementById('game'); cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,clientX:x,clientY:y,bubbles:true})); window.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,clientX:x,clientY:y,bubbles:true})); },[x,y]); };
const padY=(lay.pad.top+lay.pad.bot)/2, X={L:390*.25,C:390*.5,R:390*.75}, X3={L:390/6,C:390/2,R:390*5/6};
async function run(i,frames,three){
  await p.click('[data-act="events"]'); await p.click(`[data-act="sel"][data-i="${i}"]`); await p.click('[data-act="go"]'); await p.waitForTimeout(100);
  let s, hk=0, x=0; for(let f=0;f<frames;f++){ s=await st(); if(!s) break; if(s.hk>hk) hk=s.hk; if(s.x>x) x=s.x;
    if(s.ph==='ready') await tap(X.L,padY);
    if(s.cue&&s.cue.type==='side'&&f%5===0) await tap(X[s.cue.side],padY);
    if(three&&s.cue&&s.cue.type==='num') await tap(X3[s.cue.order[s.cue.next]],padY);
    await step(1); }
  return {...s,hk,x}; }
let s=await run(0,700); ok(s.x>25,`100 m con los botones de abajo: ${s.x.toFixed(1)} m en 11 s`);
await p.screenshot({path:out+'/100m.png'});
await p.keyboard.press('Escape'); await p.click('[data-act="quit"]'); if(await p.$('[data-act="menu"]:visible')) await p.click('[data-act="menu"]');
s=await run(2,1500,true); ok(s.hk>=2,`vallas con los tres botones de abajo: ${s.hk} vallas pasadas`); await p.screenshot({path:out+'/vallas.png'});
ok(!errs.length,'sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
