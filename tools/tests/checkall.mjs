import {BASE} from './lib.mjs';
// End-to-end rule checks for every event (fake clock, seeded random). Prints PASS/FAIL lines.
import {chromium} from './pw.mjs';
import {INIT} from './lib.mjs';
const b=await chromium.launch();
const errs=[]; let fails=0;
const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const KEY={L:'ArrowLeft',C:'ArrowDown',R:'ArrowRight'};
async function open(seed=3){
  const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('response',r=>{ if(r.status()>=400) errs.push(r.status()+' '+r.url()); });
  // the test player has a made-up session: the server's answers are stood in for (empty boards, no friends)
  await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],incoming:[],outgoing:[],leaders:[],tours:[],ok:true}}));
  await p.addInitScript(INIT(seed)); await p.goto(BASE+'/'); await p.waitForFunction(()=>document.querySelector('.mm')); await p.waitForTimeout(300);
  return p;
}
const st=p=>p.evaluate(()=>{ const S=window.__odb.S; if(!S) return null; return {ph:S.phase,cue:S.cue&&{...S.cue},m:S.meter&&{...S.meter},x:S.x,v:S.v,t:S.t,line:S.ev.line,mark:S.mark,round:S.round,final:S.final,fin:S.finished,act:S.act&&{k:S.act.k,t:S.act.t,T:S.act.T,stage:S.act.stage,over:S.act.over},print:S.print,replay:!!S.replay,pops:S.pops.map(q=>q.text+'|'+q.sub),rivals:(S.rivals||[]).map(r=>r.final),marks:S.marks,zone:S.zone,prep:S.prep}; });
const step=(p,n=1)=>p.evaluate(n=>window.__step(n),n);
const ptr=(p,type,id,x)=>p.evaluate(([type,id,x])=>{ const cv=document.getElementById('game'); (type==='pointerdown'?cv:window).dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:250,bubbles:true,cancelable:true})); },[type,id,x]);
async function start(p,i){ if(await p.$('[data-act="events"]')) await p.click('[data-act="events"]'); await p.click(`[data-act="sel"][data-i="${i}"]`); await p.click('[data-act="go"]'); await p.waitForTimeout(100); }
async function nextRound(p){ // skip replay and table -> next round
  for(let k=0;k<400;k++){ const s=await st(p); if(s&&s.replay){ await p.keyboard.press('ArrowLeft'); }
    const acts=await p.evaluate(()=>{ const ov=document.getElementById('ov'); return ov.hidden?[]:[...ov.querySelectorAll('[data-act]')].map(b=>b.dataset.act); });
    if(acts.includes('nextround')){ await p.click('[data-act="nextround"]'); return true; }
    if(acts.includes('evdone')) return false;
    await step(p,2); }
  return false; }

// ---------- 100 m ----------
{ const p=await open(5); await start(p,0);
  let vAt30=null, vAt40=null, wrongDrop=null, tapping=true, dipped=false;
  for(let f=0;f<6000;f++){ const s=await st(p); if(!s) break;
    if(s.ph==='ready') await p.keyboard.press(' ');
    if(s.cue&&s.cue.type==='side'&&tapping&&f%6===0){
      if(s.x>50&&wrongDrop==null){ const v0=s.v; await p.keyboard.press(KEY[s.cue.side==='L'?'R':'L']); const v1=(await st(p)).v; wrongDrop=v1/v0; }
      else await p.keyboard.press(KEY[s.cue.side]); }
    if(s.cue&&s.cue.type==='side'&&f%6===3&&s.x>20&&s.x<22){ const v0=s.v; await p.keyboard.press(' '); const v1=(await st(p)).v; ok(Math.abs(v1-v0)<1e-6,'100 m: Espacio con botones verdes no hace nada'); }
    if(s.x>=30&&vAt30==null){ vAt30=s.v; tapping=false; }
    if(vAt30!=null&&!tapping&&s.x>=55&&vAt40==null){ vAt40=s.v; tapping=true; }
    if(s.cue&&s.cue.type==='both'&&!dipped){ await p.keyboard.press(' '); dipped=true; }
    if(s.fin&&s.final&&s.rivals.every(r=>r!=null)){ ok(true,`100 m: terminó en ${s.final.toFixed(2)} s`); const rv=s.rivals.filter(r=>r!=null); ok(Math.min(...rv)>=11.0&&Math.max(...rv)<=14.5,`100 m: rivales entre ${Math.min(...rv).toFixed(2)} y ${Math.max(...rv).toFixed(2)} s`); ok(s.final<Math.min(...rv),'100 m: jugando bien le ganás a las máquinas'); break; }
    await step(p,1); }
  ok(vAt40<vAt30*.95,`100 m: sin tocar frena de a poco (${vAt30?.toFixed(2)} -> ${vAt40?.toFixed(2)} m/s)`);
  ok(wrongDrop!=null&&wrongDrop<.95,`100 m: errarle al lado frena (x${wrongDrop?.toFixed(2)})`);
  ok(dipped,'100 m: aparecen los botones para tirarse en la meta');
  await p.context().close(); }

// ---------- 110 m vallas ----------
{ const p=await open(7); await start(p,2);
  const H=await p.evaluate(async()=>(await import('/js/config.js')).HURDLES);
  ok(H.length===9&&Math.abs(H[1]-H[0]-11.3)<1e-6&&H[8]<=103,`vallas: 9 vallas cada ${(H[1]-H[0]).toFixed(2)} m, última en ${H[8].toFixed(1)} m`);
  let combos=0, wrongTested=false;
  for(let f=0;f<5000;f++){ const s=await st(p); if(!s) break;
    if(s.ph==='ready') await p.keyboard.press(' ');
    if(s.cue&&f%5===0){ if(s.cue.type==='side') await p.keyboard.press(KEY[s.cue.side]);
      else if(s.cue.type==='num'){ const want=s.cue.order[s.cue.next];
        if(!wrongTested&&combos===3&&s.cue.next===0){ const other=['L','C','R'].find(k=>k!==want); const v0=s.v; await p.keyboard.press(KEY[other]); ok((await st(p)).v<v0,'vallas: errarle al número frena'); wrongTested=true; }
        else { await p.keyboard.press(KEY[want]); if(s.cue.next===2) combos++; } }
      else if(s.cue.type==='both') await p.keyboard.press(' '); }
    if(s.fin&&s.final&&(s.rivals.every(r=>r!=null)||s.ph!=='run')){ const rv=s.rivals.filter(r=>r!=null); ok(true,`vallas: terminó en ${s.final.toFixed(2)} s con ${combos} combos`); ok(Math.min(...rv)>=14.5&&Math.max(...rv)<=19,`vallas: rivales entre ${Math.min(...rv).toFixed(2)} y ${Math.max(...rv).toFixed(2)} s`); break; }
    await step(p,1); }
  await p.context().close(); }

// ---------- salto en largo ----------
{ const p=await open(3); await start(p,1);
  // round 1: good jump; round 2: worse jump (no air push) -> no NEW RECORD; round 3: step over the board
  const plan=[{d:1.0,push:true},{d:2.5,push:false},{d:-0.8,push:false}];
  let r=0, sawGreenAfterBand=false, redOnlyInRed=true, printAt=null;
  for(let f=0;f<6000&&r<3;f++){ const s=await st(p); if(!s) break; const pl=plan[r];
    if(s.ph==='ready'){ if(r>0) ok(s.print==null,`largo ronda ${r+1}: no queda la huella del salto anterior`); await p.keyboard.press(' '); }
    if(s.prep&&s.cue&&s.cue.type==='side') sawGreenAfterBand=true;
    if(s.cue&&s.cue.type==='both'&&!s.act&&s.line-s.x>4.05) redOnlyInRed=false;
    if(s.cue&&s.cue.type==='side'&&f%6===0) await p.keyboard.press(KEY[s.cue.side]);
    if(s.cue&&s.cue.type==='both'&&!s.act&&s.line-s.x<=pl.d+.35) await p.keyboard.press(' ');
    if(pl.push&&s.act&&s.act.k==='lj'&&s.act.T&&s.act.t/s.act.T>=.49&&s.cue&&s.cue.type==='both') await p.keyboard.press(' ');
    if(s.act&&s.act.k==='lj'&&printAt==null){ printAt=s.print; ok(s.print!=null&&s.print<=s.line+1e-6,`largo: queda la huella del pique a ${(s.line-s.print).toFixed(2)} m de la tabla`); }
    if(s.ph==='post'&&s.mark!==undefined){
      const pop=s.pops.find(q=>/ m\||NULO/.test(q))||'';
      if(r===0) ok(s.mark>0&&/RÉCORD PERSONAL/.test(pop),`largo ronda 1: ${s.mark} m y dice récord personal`);
      if(r===1) ok(s.mark>0&&s.mark<s.marks[0][0]&&!/RÉCORD PERSONAL/.test(pop),`largo ronda 2: ${s.mark} m (peor) y NO dice nuevo récord`);
      if(r===2){ ok(s.mark==null,'largo ronda 3: pasar la tabla con el pie es nulo'); ok(s.x<s.line+.5,`largo: con el nulo se frena en la tabla (cadera a ${(s.x-s.line).toFixed(2)} m), no llega a la arena`); ok(s.pops.some(q=>/PISASTE LA TABLA/.test(q)),'largo: aparece ¡PISASTE LA TABLA!'); }
      r++; printAt=null; if(r<3&&!(await nextRound(p))) break; }
    await step(p,1); }
  ok(!sawGreenAfterBand,'largo: desde el verde no hay botones verdes');
  ok(redOnlyInRed,'largo: los botones rojos aparecen recién en el rojo');
  await p.context().close(); }

// ---------- garrocha ----------
{ const p=await open(3); await start(p,3);
  // round 1: one finger only (no plant -> foul); round 2: two fingers at the tip; round 3: Space at the tip
  let r=0, autoLower=false, oneFingerDown=false, held=false;
  for(let f=0;f<6000&&r<3;f++){ const s=await st(p); if(!s) break;
    if(s.ph==='ready') await p.keyboard.press('ArrowLeft');
    if(s.cue&&s.cue.type==='side'&&f%6===0) await p.keyboard.press(KEY[s.cue.side]);
    if(s.m&&s.m.k==='pole'&&s.m.on&&s.m.p>.3) autoLower=true;
    if(r===0&&s.m&&s.m.k==='pole'&&s.m.on&&s.m.p>=.95&&!oneFingerDown){ await ptr(p,'pointerdown',1,200); oneFingerDown=true; }
    if(r===1&&s.m&&s.m.k==='pole'&&s.m.on&&s.m.p>=.97&&!held){ await ptr(p,'pointerdown',1,200); await ptr(p,'pointerdown',2,700); held=true; }
    if(r===1&&held&&s.m&&s.m.k==='rise'&&s.m.p>=.97){ await ptr(p,'pointerup',2,700); await ptr(p,'pointerup',1,200); held=false; }
    if(r===2&&s.m&&s.m.k==='pole'&&s.m.on&&s.m.p>=.97&&!held){ await p.keyboard.down(' '); held=true; }
    if(r===2&&held&&s.m&&s.m.k==='rise'&&s.m.p>=.97){ await p.keyboard.up(' '); held=false; }
    if(s.ph==='post'&&s.mark!==undefined){
      if(r===0){ ok(s.mark==null,'garrocha: con un solo dedo no se clava (llegar al cajón = nulo)'); await ptr(p,'pointerup',1,200); }
      if(r===1) ok(s.mark>3,`garrocha: con dos dedos en la punta: ${s.mark} m`);
      if(r===2) ok(s.mark>3,`garrocha: con Espacio en la punta: ${s.mark} m`);
      r++; if(r<3&&!(await nextRound(p))) break; }
    await step(p,1); }
  ok(autoLower,'garrocha: la garrocha baja sola sin tocar nada');
  // timing of release: star reaches the end ~0.7 s after the rise starts
  await p.context().close(); }
{ const p=await open(4); await start(p,3); let held=false, riseT0=null, endT=null, tipCheck=null;
  for(let f=0;f<3000;f++){ const s=await st(p); if(!s) break;
    if(s.ph==='ready') await p.keyboard.press('ArrowLeft');
    if(s.cue&&s.cue.type==='side'&&f%6===0) await p.keyboard.press(KEY[s.cue.side]);
    if(s.m&&s.m.k==='pole'&&s.m.on&&s.m.p>=.97&&!held){ await p.keyboard.down(' '); held=true; }
    if(s.m&&s.m.k==='rise'&&riseT0==null) riseT0=f;
    if(s.m&&s.m.k==='rise'&&s.m.p>=1&&endT==null){ endT=f; await p.keyboard.up(' '); }
    if(s.ph==='post') break;
    await step(p,1); }
  ok(endT&&riseT0&&(endT-riseT0)/60<.95,`garrocha: la estrellita llega a la otra punta en ${((endT-riseT0)/60).toFixed(2)} s`);
  await p.context().close(); }

// ---------- jabalina ----------
{ const p=await open(3); await start(p,4);
  // round 1: one finger only (no meter) then two fingers early; round 2: release too late (cross after release) -> foul; round 3: Space
  let r=0, phase=0;
  for(let f=0;f<8000&&r<3;f++){ const s=await st(p); if(!s) break;
    if(s.ph==='ready'){ await p.keyboard.press('ArrowLeft'); phase=0; }
    if(s.cue&&s.cue.type==='side'&&f%6===0) await p.keyboard.press(KEY[s.cue.side]);
    const d=s.line-s.x;
    if(r===0){
      if(phase===0&&s.cue&&s.cue.type==='hold'&&d<17){ await ptr(p,'pointerdown',1,200); await step(p,10); ok(!(await st(p)).m,'jabalina: con un dedo no arranca'); await ptr(p,'pointerdown',2,700); await step(p,2); ok((await st(p)).m?.k==='jav','jabalina: con los dos dedos arranca'); phase=1; }
      if(phase===1&&s.m&&s.m.k==='jav'&&s.m.p>=.95){ await ptr(p,'pointerup',2,700); await step(p,1); ok((await st(p)).ph==='act','jabalina: levantar un dedo lanza'); await ptr(p,'pointerup',1,200); phase=2; } }
    if(r===1){ if(phase===0&&s.cue&&s.cue.type==='hold'&&d<1.6+.7*s.v){ await p.keyboard.down(' '); phase=1; }
      if(phase===1&&s.m&&s.m.p>=.95){ await p.keyboard.up(' '); phase=2; ok(s.line-s.x<3.2&&s.line-s.x>0,`jabalina: suelta a ${(s.line-s.x).toFixed(1)} m de la línea`); } }
    if(r===2){ if(phase===0&&s.cue&&s.cue.type==='hold'&&d<14){ await p.keyboard.down(' '); phase=1; }
      if(phase===1&&s.m&&s.m.p>=.95){ await p.keyboard.up(' '); phase=2; } }
    if(s.ph==='post'&&s.mark!==undefined){
      if(r===0) ok(s.mark>40,`jabalina ronda 1: ${s.mark} m`);
      if(r===1) ok(s.mark==null,'jabalina: soltar tarde y pasarse de la línea después es nulo');
      if(r===2) ok(s.mark>40,`jabalina ronda 3 (Espacio): ${s.mark} m`);
      r++; if(r<3&&!(await nextRound(p))) break; }
    await step(p,1); }
  const res=await p.evaluate(()=>{ const ov=document.getElementById('ov'); return [...ov.querySelectorAll('tr')].map(t=>t.innerText.replace(/\s+/g,' ')).join(' | '); });
  console.log('     tabla jabalina:',res);
  await p.context().close(); }

// ---------- back button ----------
{ const p=await open(3); await start(p,0);
  for(let f=0;f<300;f++){ const s=await st(p); if(s.ph==='ready') await p.keyboard.press(' '); if(s.cue&&s.cue.type==='side') break; await step(p,1); }
  const pt=await p.evaluate(async()=>{ const c=await import('/js/canvas.js'); return {x:c.OX+18*c.SC,y:c.OY+304*c.SC}; });
  const t0=(await st(p)).t; await p.mouse.click(pt.x,pt.y); await step(p,30); const t1=(await st(p)).t;
  ok(await p.evaluate(()=>!!document.querySelector('#ov.pause [data-act="resume"]'))&&t1===t0,'pausa: abre el menú y frena la carrera');
  await p.click('[data-act="resume"]'); await step(p,30); ok((await st(p)).t>t1&&await p.evaluate(()=>document.getElementById('ov').hidden),'pausa: Reanudar sigue la carrera');
  await p.mouse.click(pt.x,pt.y); await step(p,1); await p.click('[data-act="quit"]'); await p.waitForTimeout(100); ok(await p.evaluate(()=>!!document.querySelector('.mm')),'pausa: Volver al menú');
  await p.context().close(); }

console.log('ERRORES DE PÁGINA:',errs.length?errs.join('\n'):'ninguno');
console.log(fails?`${fails} FALLAS`:'TODO OK');
await b.close();
