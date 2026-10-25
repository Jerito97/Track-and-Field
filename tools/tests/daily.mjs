import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
const out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
const API=BASE+'/api/t';
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok){ const e=new Error(j.error); e.status=r.status; throw e; } return j; };
const sql=async(q,params)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params})})).json();
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sfx=Date.now()%100000;
const A=await post({action:'register',name:'Ana'+sfx,pin:'1234',color:'#e8262d'}), B=await post({action:'register',name:'Beto'+sfx,pin:'1234',color:'#2f6fd6'});
const d0=await (await fetch(API+'?daily=1&player='+A.player.id)).json(); console.log('  hoy:',d0.day,d0.ev,'termina',d0.ends_at);
// Ana played the last 3 days (a streak), Beto won yesterday's
const dayOf=t=>new Date(t-3*3600e3).toISOString().slice(0,10);
for(const k of [1,2,3]) await sql('insert into daily(day,player_id,ev,mark) values($1,$2,$3,$4)',[dayOf(Date.now()-k*864e5),A.player.id,d0.yday.ev,k===1?5.0:6]);
await sql('insert into daily(day,player_id,ev,mark) values($1,$2,$3,$4)',[d0.yday.day,B.player.id,d0.yday.ev,9.9]);
const b=await chromium.launch(); const errs=[];
const as=async(P,w=844,h=390)=>{ const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a])=>{ if(sessionStorage.getItem('init')) return; sessionStorage.setItem('init','1'); localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[P]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.waitForTimeout(1200); return p; };
const pa=await as(A);
const bar=await pa.$eval('.m-daily',e=>({hidden:e.hidden,text:e.textContent})); console.log('  franja:',bar.text);
ok(!bar.hidden&&bar.text.includes('Jugar'),'la franja del desafío aparece en el menú');
const sc=await pa.evaluate(()=>{ const o=document.querySelector('#ov'); return [o.scrollHeight,o.clientHeight]; }); ok(sc[0]<=sc[1],'el menú acostado no se desliza ('+sc.join(' / ')+')');
await pa.screenshot({path:out+'/menu.png'});
await pa.click('.m-daily'); await pa.waitForSelector('[data-act="dplay"]'); await pa.screenshot({path:out+'/desafio.png'});
ok((await pa.textContent('.d-card')).includes('racha de 4')||(await pa.textContent('.d-card')).includes('racha de 3'),'racha de días seguidos');
ok(!(await pa.textContent('.d-card')).includes('Ayer'),'ya no muestra lo del día anterior');
await pa.click('[data-act="dplay"]'); await pa.waitForTimeout(400);
ok(await pa.evaluate(async()=>{ const st=await import('/js/state.js'); return st.G.mode==='daily'&&st.ATH.length===1; }),'se juega solo, en modo desafío');
const ev=d0.ev, sprint=await pa.evaluate(async id=>{ const cf=await import('/js/config.js'); return cf.EVENTS.find(e=>e.id===id).type==='sprint'; },ev);
const mark=sprint?40.12:7.11;
await pa.evaluate(async m=>{ const sc=await import('/js/ui/screens.js'); sc.endEvent([m]); },mark);
for(let i=0;i<80;i++){ if(await pa.$('[data-act="afterres"]')){ await pa.click('[data-act="afterres"]'); break; } await pa.mouse.click(400,200); await pa.waitForTimeout(250); }
await pa.waitForSelector('.d-card .d-me'); await pa.waitForTimeout(300); await pa.screenshot({path:out+'/hecho.png'});
ok(/\dº de \d/.test(await pa.textContent('.d-card .d-me')),'después de jugar: tu resultado y puesto');
let again=null; try{ await post({action:'daily',step:'start',ev,token:A.token}); }catch(e){ again=e.message; } ok(again==='Ya jugaste el desafío de hoy.','un solo intento por día');
// Beto starts and leaves halfway: a foul, and he can't play again
const pb=await as(B,390,844); await pb.click('.m-daily'); await pb.waitForSelector('[data-act="dplay"]'); await pb.click('[data-act="dplay"]'); await pb.waitForTimeout(400);
await pb.keyboard.press('Escape'); await pb.waitForSelector('[data-act="quit"]'); ok((await pb.textContent('#ov')).includes('cuenta como nulo'),'la pausa avisa que salir es nulo');
await pb.click('[data-act="quit"]'); await pb.waitForSelector('.d-card'); await pb.waitForTimeout(500);
const dd=await (await fetch(API+'?daily=1&player='+B.player.id)).json(); ok(dd.me.played&&dd.me.mark==null,'Beto salió a la mitad: nulo');
await pb.screenshot({path:out+'/beto.png'});
// Ana's bell: yesterday's challenge (Beto won)
await pa.evaluate(id=>{ const k='odb-notifs-'+id, d=JSON.parse(localStorage.getItem(k)||'{}'); d.at=0; localStorage.setItem(k,JSON.stringify(d)); },A.player.id);
await pa.click('[data-act="menu"]'); await pa.waitForTimeout(1500);
const bar2=await pa.$eval('.m-daily',e=>e.textContent); console.log('  franja después:',bar2); ok(!bar2.includes('Jugar'),'la franja muestra tu resultado');
await pa.click('.m-bell'); await pa.waitForSelector('.n-item'); const nt=await pa.$$eval('.n-item',l=>l.map(e=>e.textContent)); console.log('  aviso:',nt.join(' | '));
ok(nt.some(t=>/Desafío de ayer .*quedaste \d+º de \d+ · ganó|¡Ganaste el desafío de ayer/.test(t)),'aviso de cómo te fue ayer');
console.log(errs.join(' | ')||'sin errores'); console.log(fails?fails+' FALLAS':'DESAFIO OK'); await b.close();
