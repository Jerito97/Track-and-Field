import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
import fs from 'node:fs';
const out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
const API=BASE+'/api/t';
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(JSON.stringify(j)); return j; };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sfx=Date.now()%100000;
const A=await post({action:'register',name:'Ana'+sfx,pin:'1234',color:'#e8262d'}), B=await post({action:'register',name:'Beto'+sfx,pin:'1234',color:'#2f6fd6'}), C=await post({action:'register',name:'Caro'+sfx,pin:'1234',color:'#1f9e54'});
const T=(await post({action:'create',token:A.token,name:'Copa invitada',events:['100','lj','pv'],days:3})).code;
const b=await chromium.launch(); const errs=[];
const as=async(P,w=844,h=390,notifs)=>{ const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a,n])=>{ if(sessionStorage.getItem('init')) return; sessionStorage.setItem('init','1'); localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); if(n) localStorage.setItem('odb-notifs-'+a.player.id,JSON.stringify({list:[],wr:[],ended:[],at:0})); },[P,notifs]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); return p; };
// Ana: the tournament, Invitar jugadores, search Beto, invite
const pa=await as(A); await pa.evaluate(c=>import('/js/ui/online.js').then(m=>m.showTournament(c)),T); await pa.waitForSelector('[data-act="oinvite"]'); await pa.screenshot({path:out+'/1torneo.png'});
await pa.click('[data-act="oinvite"]'); await pa.waitForSelector('#oisearch'); await pa.waitForTimeout(300); await pa.screenshot({path:out+'/2lista.png'});
const names=await pa.$$eval('.o-invp b',l=>l.map(e=>e.textContent)); ok(names.includes('Beto'+sfx)&&names.includes('Caro'+sfx)&&!names.includes('Ana'+sfx),'la lista tiene a los demás jugadores, no a uno mismo');
await pa.fill('#oisearch','beto'+sfx); await pa.waitForTimeout(150); ok((await pa.$$eval('.o-invp b',l=>l.map(e=>e.textContent))).join()==='Beto'+sfx,'el buscador filtra');
await pa.click('[data-act="oinv"]'); await pa.waitForTimeout(600); await pa.screenshot({path:out+'/3invitado.png'});
ok(await pa.$eval('.o-invp',e=>e.textContent.includes('Invitado')),'queda marcado como invitado');
const v=await (await fetch(API+'?code='+T)).json(); ok(v.entries.some(e=>e.player_id===B.player.id),'Beto quedó anotado en el torneo');
// inviting again: no error
let again=true; try{ await post({action:'invite',code:T,player:B.player.id,token:A.token}); }catch(e){ again=false; } ok(again,'invitar dos veces no da error');
let outsider=false; try{ await post({action:'invite',code:T,player:C.player.id,token:C.token}); }catch(e){ outsider=true; } ok(outsider,'alguien que no está en el torneo no puede invitar');
// Beto: the bell shows it, with who invited him; tapping opens the tournament
const pb=await as(B,390,844,true); await pb.waitForTimeout(1500);
ok(await pb.evaluate(()=>{ const e=document.querySelector('.m-badge'); return e&&!e.hidden?e.textContent:'0'; })==='1','a Beto le llega 1 aviso');
await pb.click('.m-bell'); await pb.waitForSelector('.n-item'); const txt=await pb.$eval('.n-item',e=>e.textContent); console.log('  ',txt);
ok(/Ana\d* te invitó a Copa invitada/.test(txt),'el aviso dice quién lo invitó'); await pb.screenshot({path:out+'/4aviso.png'});
await pb.click('.n-item'); await pb.waitForSelector('[data-act="oplay"]'); ok(true,'el aviso abre el torneo para jugar'); await pb.screenshot({path:out+'/5torneo.png'});
console.log(errs.join(' | ')||'sin errores'); console.log(fails?fails+' FALLAS':'INVITAR OK'); await b.close();
