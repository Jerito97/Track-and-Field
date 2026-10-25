import {chromium} from './pw.mjs';
const OUT=process.argv[2], BASE=(process.env.BASE||'http://localhost:8090')+'/';
const CLOCK=`(()=>{ let T=1000, cbs=[], tos=[]; performance.now=()=>T; window.requestAnimationFrame=cb=>{cbs.push(cb);return cbs.length;}; const st=window.setTimeout; window.setTimeout=(f,ms)=>{ if(ms>=0&&ms<5000){ tos.push({at:T+(ms||0),f}); return 1; } return st(f,ms); };
 window.__step=n=>{ for(let i=0;i<n;i++){ T+=1000/60; const q=cbs; cbs=[]; q.forEach(c=>c(T)); const d=tos.filter(o=>o.at<=T); tos=tos.filter(o=>o.at>T); d.forEach(o=>o.f()); } }; })();`;
const b=await chromium.launch();
const KEY={L:'ArrowLeft',R:'ArrowRight'};
async function newPlayer(url,name,color){ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2}); const p=await ctx.newPage();
  p.on('pageerror',e=>console.log(name,'ERR',String(e))); await p.addInitScript(CLOCK); await p.goto(url);
  await p.waitForSelector('#aname'); await p.fill('#aname',name); await p.click('[data-act="anext"]'); await p.waitForSelector('#apin2'); await p.click(`.p-sw[data-c="${color}"]`); await p.fill('#apin','1234'); await p.fill('#apin2','1234'); await p.click('[data-act="aregister"]'); return p; }
async function play100(p,taps=6){ // plays the 100 m until the results table, then OK
  for(let f=0;f<4000;f++){ const s=await p.evaluate(()=>{ const S=window.__odb.S; const ov=document.getElementById('ov'); return {ov:!ov.hidden,acts:[...ov.querySelectorAll('[data-act]')].map(b=>b.dataset.act),ph:S&&S.phase,cue:S&&S.cue&&{...S.cue}}; });
    if(s.ov&&s.acts.includes('afterres')){ await p.click('[data-act="afterres"]'); return; }
    if(s.ph==='ready') await p.keyboard.press(' ');
    if(s.ph==='lap'&&f%20===0) await p.keyboard.press('ArrowLeft');  // a world record: the lap of honour, a tap goes on
    if(s.cue&&s.cue.type==='side'&&f%taps===0) await p.keyboard.press(KEY[s.cue.side]);
    if(s.cue&&s.cue.type==='both') await p.keyboard.press(' ');
    await p.evaluate(()=>window.__step(1)); } }
// A: create
const A=await newPlayer(BASE,'Jero'+Date.now()%1000,'#2bc4e0'); await A.waitForSelector('.mm');
await A.screenshot({path:`${OUT}/1-menu.png`});
await A.click('[data-act="tours"]'); await A.waitForSelector('.o-card'); await A.screenshot({path:`${OUT}/2-hub.png`});
for(const ev of ['pv','jav','110h']) await A.uncheck(`input[name="oev"][value="${ev}"]`);
await A.fill('#oname','Copa del barrio'); await A.click('[data-act="ocreate"]'); await A.waitForSelector('.o-code'); await A.waitForTimeout(200);
const code=await A.evaluate(()=>document.querySelector('.o-code b').textContent); console.log('code',code);
await A.screenshot({path:`${OUT}/3-board-new.png`});
await A.click('[data-act="oplay"][data-ev="100"]'); await play100(A,6); await A.waitForSelector('.o-code'); await A.waitForTimeout(300); await A.screenshot({path:`${OUT}/4-board-A.png`});
console.log('A play button for 100 still?', await A.$('[data-act="oplay"][data-ev="100"]')!==null);
// B: invite link, new player
const B=await newPlayer(BASE+'?t='+code,'Amigo'+Date.now()%1000,'#ff7a1a'); await B.waitForSelector('.o-code'); await B.waitForTimeout(300);
console.log('B url after join', B.url());
await B.click('[data-act="oplay"][data-ev="100"]'); await play100(B,9); await B.waitForSelector('.o-code'); await B.waitForTimeout(300); await B.screenshot({path:`${OUT}/5-board-B.png`});
// B leaves the long jump halfway -> foul
await B.click('[data-act="oplay"][data-ev="lj"]'); await B.waitForTimeout(100);
for(let f=0;f<200;f++){ const s=await B.evaluate(()=>window.__odb.S&&window.__odb.S.phase); if(s==='ready') await B.keyboard.press('ArrowLeft'); if(s==='run'&&f>60) break; await B.evaluate(()=>window.__step(1)); }
await B.evaluate(()=>{ const cv=document.getElementById('game'); const r=cv.getBoundingClientRect(); window.__odb.S.cue=null; });
await B.keyboard.press('Escape'); await B.waitForSelector('[data-act="quit"]'); await B.click('[data-act="quit"]'); await B.waitForSelector('.o-code'); await B.waitForTimeout(400); await B.screenshot({path:`${OUT}/6-board-B-left.png`});
// A refreshes
await A.click('[data-act="orefresh"]'); await A.waitForSelector('.o-code'); await A.waitForTimeout(400); await A.screenshot({path:`${OUT}/7-board-A-refresh.png`});
const rows=await A.evaluate(()=>[...document.querySelectorAll('.o-table tbody tr')].map(t=>t.innerText.replace(/\s+/g,' '))); console.log('  '+rows.join(' | '));
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
ok(/^[0-9A-Z]{5}$/.test(code),'A crea el torneo y tiene su código');
ok(rows.length===2,'B entra con el link: la tabla tiene a los dos');
ok(rows.some(r=>/AMIGO/i.test(r)&&/NULO/.test(r)),'B salió a la mitad del largo: nulo');
ok(rows.every(r=>/\d+\.\d\d s/.test(r)),'los dos jugaron los 100 m');
await b.close();
