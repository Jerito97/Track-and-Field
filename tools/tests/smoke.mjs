import {BASE} from './lib.mjs';
// The whole app, screen by screen, against the local API (apitest/server.mjs on 8090): screenshots + any error
import {chromium} from './pw.mjs';
const out=process.argv[2]||'../smoke'; const b=await chromium.launch(); const errs=[]; let n=0, fails=0;
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const reg=await (await fetch(BASE+'/api/t',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'register',name:'Smoke'+Date.now()%100000,pin:'1234',color:'#e8262d'})})).json();
async function open(w,h){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block',hasTouch:false})).newPage();
  p.on('pageerror',e=>errs.push('pageerror '+String(e))); p.on('console',m=>{ if(m.type()==='error'&&!/favicon/.test(m.text())) errs.push('console '+m.text()); });
  await p.addInitScript(([id,name,token])=>{ if(!localStorage.getItem('odb-players')) localStorage.setItem('odb-players',JSON.stringify({list:[{id,name,color:'#e8262d',token,created:0,rec:{},best:{},history:[],tours:[]}],cur:id})); },[reg.player?.id||reg.id,reg.player?.name||'Smoke',reg.token]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes',{timeout:15000}); await p.waitForTimeout(500); return p; }
const shot=async(p,name)=>{ await p.waitForTimeout(350); await p.screenshot({path:`${out}/${String(++n).padStart(2,'0')}-${name}.png`}); };
const click=async(p,sel)=>{ await p.click(sel,{timeout:5000}); await p.waitForTimeout(250); };
for(const [w,h,tag] of [[844,390,'L'],[390,844,'P']]){
  const p=await open(w,h);
  await shot(p,tag+'-menu');
  await click(p,'[data-act="events"]'); await shot(p,tag+'-pruebas');
  for(const c of ['run','jump','throw']){ await click(p,`[data-act="cat"][data-c="${c}"]`); } await shot(p,tag+'-pestana-lanz');
  await click(p,'[data-act="cat"][data-c="all"]'); await click(p,'[data-act="sel"][data-i="0"]');
  await click(p,'[data-act="go"]'); await p.waitForTimeout(2500); await shot(p,tag+'-100m');
  for(let k=0;k<20;k++){ await p.keyboard.press(k%2?'ArrowRight':'ArrowLeft'); await p.waitForTimeout(60); }
  await shot(p,tag+'-100m-corriendo');
  await p.keyboard.press('Escape'); await shot(p,tag+'-pausa'); await click(p,'[data-act="resume"]');
  await p.keyboard.press('Escape'); await click(p,'[data-act="quit"]'); ok(await p.$('.m-modes')||await p.$('.m-evs'),tag+' salir de la prueba vuelve al menú');
  if(await p.$('[data-act="menu"]')) await click(p,'[data-act="menu"]');
  await click(p,'.m-recs'); await shot(p,tag+'-records'); await click(p,'.b-back');
  if(await p.$('[data-act="menu"]')) await click(p,'[data-act="menu"]');
  await click(p,'[data-act="surv"]'); await shot(p,tag+'-supervivencia');
  if(await p.$('[data-act="sstart"]')){ await click(p,'[data-act="sstart"]'); await shot(p,tag+'-surv-ronda'); if(await p.$('[data-act="splay"]')) await click(p,'[data-act="splay"]'); await p.waitForTimeout(1500); await shot(p,tag+'-surv-juego'); await p.keyboard.press('Escape'); await shot(p,tag+'-surv-pausa'); await click(p,'[data-act="quit"]'); await shot(p,tag+'-surv-guardada'); }
  if(await p.$('[data-act="menu"]')) await click(p,'[data-act="menu"]');
  await click(p,'[data-act="tours"]'); await p.waitForTimeout(800); await shot(p,tag+'-torneos');
  if(await p.$('[data-act="ocreate"]')){ await click(p,'[data-act="ocreate"]'); await shot(p,tag+'-torneo-crear'); }
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
  await click(p,'[data-act="profile"]'); await shot(p,tag+'-perfil'); await click(p,'[data-act="menu"]');
  await click(p,'.m-people'); await p.waitForTimeout(600); await shot(p,tag+'-amigos'); await click(p,'.btns [data-act="people"]'); await p.waitForTimeout(600); await shot(p,tag+'-jugadores');
  await p.context().close(); }
console.log(errs.filter(e=>!/api\/t\?players|404/.test(e)).join('\n')||'sin errores'); console.log(fails?fails+' FALLAS':'RECORRIDO OK'); await b.close();
