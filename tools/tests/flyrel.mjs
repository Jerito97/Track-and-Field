import {BASE} from './lib.mjs';
// Butterfly: letting go with the star right on the circle is perfect; a little past it, or a little before, isn't
import {chromium} from './pw.mjs';
import {INIT} from './lib.mjs';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],incoming:[],outgoing:[],ok:true}}));
await p.addInitScript(INIT(3)); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="events"]');
await p.locator('.m-ev',{has:p.locator('b',{hasText:/^MARIPOSA$/})}).click(); await p.click('[data-act="go"]'); await p.waitForTimeout(100);
// each stroke: hold when asked, let go as the star gets to `at` (where it's drawn when let go), read what it said
const res=await p.evaluate(async(ats)=>{ const O=window.__odb, out=[]; let i=0, held=false, f=0;
  for(;f<20000&&i<ats.length;f++){ const S=O.S; if(!S) break; const c=S.cue, m=S.meter;
    if(S.phase==='ready'&&f%10===0) O.onTap('L');
    if(c&&c.dive) O.onTap('B');
    if(c&&c.type==='hamhold'&&!held){ S.held2=true; S.held2At=performance.now(); held=true; }
    if(held&&m&&m.k==='fly'&&m.hit==null&&m.p+1/60/.42>=ats[i]){ window.__step(1); S.held2=false; S.held2At=performance.now(); held=false; window.__step(1);
      const pop=S.pops.find(q=>q.small); out.push({at:ats[i],hit:+S.meter.hit.toFixed(3),said:pop&&pop.text}); i++; continue; }
    window.__step(1); }
  return out; },[1.0,1.07,.9,1.0,1.02,.98]);
console.log('  ',JSON.stringify(res));
const said=at=>res.filter(r=>r.at===at).map(r=>r.said);
ok(said(1.0).length&&said(1.0).every(t=>t==='¡PERFECTO!'),'soltar con la estrella en el círculo: perfecto');
ok(said(1.02).every(t=>t==='¡PERFECTO!')&&said(.98).every(t=>t==='¡PERFECTO!'),'apenas antes o después del círculo: perfecto');
ok(said(1.07).every(t=>t!=='¡PERFECTO!')&&said(.9).every(t=>t!=='¡PERFECTO!'),'un poco pasado o un poco antes: no es perfecto');
ok(!errs.length,'sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
