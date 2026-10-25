import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
import {INIT as INIT_} from './lib.mjs'; const INIT=INIT_(7);
const b=await chromium.launch(); const errs=[]; const out=process.argv[2];
const KEY={L:'ArrowLeft',R:'ArrowRight'};
async function play(label,ringP,pace,ang,shots){
  const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/api/t**',r=>r.fulfill({json:{top:[],players:[],friends:[],ok:true}}));
  await p.addInitScript(INIT); await p.addInitScript(()=>{ try{ localStorage.setItem('odb-admin',JSON.stringify('t')); }catch(e){} });
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
  await p.click('[data-act="events"]'); const i=await p.evaluate(async()=>{ const c=await import('/js/config.js'); return c.EVENTS.length+c.BETA.findIndex(e=>e.id==='dis'); });
  await p.click(`[data-act="sel"][data-i="${i}"]`); await p.click('[data-act="go"]');
  let down=false, n=0, mark, qs=null, shot={};
  for(let f=0;f<3000;f++){ const s=await p.evaluate(()=>{ const S=window.__odb.S; return S&&{ph:S.phase,cue:S.cue&&{...S.cue},m:S.meter&&{...S.meter},st:S.act&&S.act.stage,qs:S.act&&S.act.qs,v:S.v,mark:S.mark}; });
    if(!s) break;
    if(s.ph==='ready'){ await p.keyboard.press('ArrowLeft'); }
    if(s.st==='swing'&&s.m&&s.m.k==='disring'&&!down&&s.m.p>=ringP[n%3]){ await p.keyboard.down(' '); down=true; n++; }
    else if(down&&s.st==='swing'&&(!s.m||s.m.p<.5)){ await p.keyboard.up(' '); down=false; }
    if(s.st==='spin'&&down){ await p.keyboard.up(' '); down=false; }
    if(s.st==='spin'&&s.cue&&s.cue.type==='side'&&f%pace===0) await p.keyboard.press(KEY[s.cue.side]);
    if(s.st==='swing'&&shots&&!shot.ring&&s.m&&s.m.p>.6){ await p.screenshot({path:out+'/ring.png'}); shot.ring=1; }
    if(s.st==='spin'&&shots&&!shot.spin&&f%40===0){ await p.screenshot({path:out+'/spin.png'}); shot.spin=1; }
    if(s.st==='angle'&&s.m&&s.m.p>=ang&&!down){ if(shots) await p.screenshot({path:out+'/angle.png'}); await p.keyboard.down(' '); down=true; }
    if(s.st==='fly'&&down){ await p.keyboard.up(' '); down=false; qs=s.qs; }
    if(s.st==='fly'&&shots&&!shot.fly&&f%10===0&&s.v){ }
    if(s.mark!==undefined){ mark=s.mark; if(shots) await p.screenshot({path:out+'/land.png'}); break; }
    await p.evaluate(()=>window.__step(1)); }
  console.log(label.padEnd(36),'marca',mark,'swings',JSON.stringify((qs||[]).map(q=>+q.toFixed(2))));
  await p.context().close(); return mark; }
const P=await play('perfecto (justo, 12 toques/s, 40°)',[1,1,1],5,40,false);
await play('muy bueno (casi, 10/s, 41°)',[.97,1.04,.96],6,41);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const g=await play('bueno (6/s, 42°)',[.93,1.08,.92],10,42);
const c=await play('casual (swings flojos, 5/s, 45°)',[.8,1.2,.85],12,45);
const n=await play('sin swings (todos tarde, 6/s, 40°)',[2,2,2],10,40);
ok(P>g&&g>c,'mejor juego, más lejos (perfecto > bueno > casual)'); ok(P>65&&P<80,'un tiro perfecto cerca del récord mundial ('+P+' m)'); ok(g>n,'pegarle a los balanceos suma');
ok(!errs.length,'sin errores en la página'); await b.close();
