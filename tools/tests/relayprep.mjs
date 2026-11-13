import {BASE} from './lib.mjs';
// Relay: before each change, a moment with no buttons (taps there do nothing), then the two red ones
import {chromium} from './pw.mjs';
import {INIT} from './lib.mjs';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],incoming:[],outgoing:[],ok:true}}));
await p.addInitScript(INIT(3)); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="events"]');
await p.locator('.m-ev',{has:p.locator('b',{hasText:/^POSTA$/})}).click(); await p.click('[data-act="go"]'); await p.waitForTimeout(100);
const r=await p.evaluate(()=>{ const O=window.__odb; let prep=null, cue=null, leg0=null, f=0, mashed=0;
  for(;f<6000;f++){ const S=O.S; if(!S) break; const c=S.cue;
    if(S.phase==='ready'&&f%10===0) O.onTap('L');
    if(c&&c.type==='side'&&f%5===0) O.onTap(c.side);
    if(S.chPrep&&!S.chCued){ if(prep==null){ prep=S.clock; leg0=S.leg; }
      // both buttons, as the last taps of the run-up: nothing must happen
      if(f%3===0){ O.onTap('L'); O.onTap('R'); O.onTap('B'); mashed++; } }
    if(S.chCued&&cue==null){ cue=S.clock; return {gap:cue-prep,leg0,legNow:S.leg,cueType:S.cue&&S.cue.type,mashed}; }
    window.__step(1); }
  return {prep,cue,f}; });
console.log('  ',JSON.stringify(r));
ok(r.gap>.25&&r.gap<.4,`antes de los rojos, ${r.gap?.toFixed(2)} s sin botones`);
ok(r.legNow===r.leg0&&r.mashed>2,'tocar en ese momento no pasa el testimonio');
ok(r.cueType==='both','después aparecen los dos rojos');
ok(!errs.length,'sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
