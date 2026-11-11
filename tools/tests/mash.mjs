import {BASE} from './lib.mjs';
// The throws' turns (hammer, shot, discus): tapping well beats hitting both buttons at random, however fast; a
// mistake fixed right away (the next tap counts at once) costs only a little
import {chromium} from './pw.mjs';
import {INIT} from './lib.mjs';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const b=await chromium.launch(); const errs=[];
async function run(tag,strat,every,seed){
  const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],incoming:[],outgoing:[],ok:true}}));
  await p.addInitScript(INIT(seed)); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="events"]');
  await p.locator('.m-ev',{has:p.locator('b',{hasText:new RegExp('^'+tag+'$')})}).click(); await p.click('[data-act="go"]'); await p.waitForTimeout(100);
  const v=await p.evaluate(([strat,every])=>{ const O=window.__odb; let side='L', n=0;
    for(let f=0;f<4000;f++){ const S=O.S; if(!S) return null; const c=S.cue;
      if(S.phase==='ready'&&f%10===0) O.onTap('L');
      if(c&&c.type==='side'&&f%every===0){ if(strat==='bien') O.onTap(c.side); else if(strat==='errores'){ n++; if(n%6===0){ O.onTap(c.side==='L'?'R':'L'); O.onTap(c.side); } else O.onTap(c.side); } else if(strat==='pares'){ O.onTap('L'); if(O.S.cue&&O.S.cue.type==='side') O.onTap('R'); } else { O.onTap(side); side=side==='L'?'R':'L'; } }
      // the speed the turns built, as the next part starts
      if(S.act&&['rush','gap','aim','angle'].includes(S.act.stage)) return S.act.v??S.v;
      window.__step(1); }
    return null; },[strat,every]);
  await p.context().close(); return v; }
for(const tag of ['MARTILLO','BALA','DISCO']){
  const good=await run(tag,'bien',8,3), slips=await run(tag,'errores',8,3), bad=[];
  for(const [s,e] of [['pares',3],['pares',2],['a lo loco',2]]) for(const seed of [3,5]) bad.push(await run(tag,s,e,seed));
  console.log(`   ${tag}: bien 7,5 toques/s ${good.toFixed(2)}, con un error cada 6 (corregido al toque) ${slips.toFixed(2)}, a lo loco hasta 30/s ${bad.map(v=>v.toFixed(1)).join(' ')}`);
  ok(Math.max(...bad)<good*.85,`${tag}: tocar bien rinde más que apretar a lo loco`);
  ok(slips>bad.reduce((a,v)=>a+v,0)/bad.length,`${tag}: equivocarse seguido (uno de cada 6) y corregir enseguida rinde más que a lo loco, en promedio`); }
ok(!errs.length,'sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
