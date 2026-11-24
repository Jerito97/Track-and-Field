import {BASE} from './lib.mjs';
// The decathlon: third option in survival; the 16 events in a row, alone, each once: leaving one halfway (from the
// pause, or closing the game) is a foul and it goes on; stop between events and go on later; the total goes to the
// profile and to its world board
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>(await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})).json();
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const A=await post({action:'register',name:'Deca',pin:'1234',color:'#2f6fd6'});
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(([a])=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
await p.click('[data-act="surv"]'); await p.waitForSelector('[data-act="sdeca"]'); ok(await p.$$eval('.t-opt',l=>l.length)===3,'supervivencia: tres opciones, la tercera el decatlón');
await p.screenshot({path:out+'/modos.png'});
await p.click('[data-act="sdeca"]'); await p.click('[data-act="dstart"]'); await p.waitForSelector('[data-act="dplayev"]');
ok(/100 metros · 1\/16/.test(await p.textContent('.card h2')),'empieza por los 100 m (1/16)'); await p.screenshot({path:out+'/prueba1.png'});
await p.click('[data-act="dplayev"]'); await p.waitForTimeout(200);
const ath=await p.evaluate(async()=>(await import('/js/state.js')).ATH.length); ok(ath===1,'se juega solo, sin máquinas');
// leave it from the pause: a foul, and on to the next
await p.keyboard.press('Escape'); await p.waitForSelector('[data-act="quit"]'); await p.click('[data-act="quit"]'); await p.waitForSelector('[data-act="dnext"]');
ok(/Saliste: cuenta como nulo/.test(await p.textContent('#ov')),'salir en el medio: nulo');
await p.click('[data-act="dnext"]'); await p.waitForSelector('[data-act="dplayev"]'); ok(/Largo · 2\/16/.test(await p.textContent('.card h2')),'sigue con la 2: largo');
// start it and close the game halfway: on coming back it counts as a foul, the run goes on from the 3rd
await p.click('[data-act="dplayev"]'); await p.waitForTimeout(200); await p.reload(); await p.waitForSelector('.m-modes');
await p.click('[data-act="surv"]'); await p.click('[data-act="sdeca"]'); await p.waitForSelector('[data-act="dresume"]');
ok(/0 pts · 2\/16/.test(await p.textContent('.s-resume')),'cerrar el juego en el medio: esa también nulo, guardada en 2/16');
await p.click('[data-act="dresume"]'); await p.waitForSelector('[data-act="dplayev"]'); ok(/Bala · 3\/16/.test(await p.textContent('.card h2')),'sigue con la bala');
// the rest: a mark in each (as if played), and the end
await p.evaluate(async()=>{ const {G}=await import('/js/state.js'), {EVENTS}=await import('/js/config.js'), d=await import('/js/ui/decathlon.js');
  const mk={'100':10.2,lj:7.8,sp:13,hj:2.2,'110h':13.5,dis:60,pv:5.5,jav:80,crawl:19,tj:17,ham:70,breast:24,'4x100':31,fly:21,laser:42,cycle:37};
  while(G.deca&&G.deca.k<16){ const id=d.DECA_ORDER[G.deca.k]; G.evIdx=EVENTS.findIndex(e=>e.id===id); G.res={[id]:[mk[id]]}; d.decaAfterEvent(); } });
await p.waitForSelector('.s-final'); const fin=await p.textContent('.s-final'); console.log('   final:',fin.replace(/\s+/g,' '));
ok(/14\d\d\d puntos/.test(fin.replace(/\s+/g,' '))||/1[34]\d{3}/.test(fin),'termina con el total de las 16'); await p.screenshot({path:out+'/final.png'});
await p.waitForTimeout(1500);
const top=await (await fetch(API+'?top=deca')).json(); ok(top.top?.[0]?.player_id===A.player.id&&top.top[0].mark>13000,`récords: el decatlón en el mundial (${top.top?.[0]?.mark} pts)`);
await p.click('[data-act="board"]'); await p.waitForSelector('.b-list'); await p.waitForTimeout(400); ok(/DECATL/i.test(await p.textContent('#ov')),'su tabla de récords'); await p.screenshot({path:out+'/records.png'});
await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="profile"]'); await p.waitForTimeout(300);
ok(/mejor decatlón/.test(await p.textContent('.p-main')),'perfil: tu mejor decatlón'); await p.screenshot({path:out+'/perfil.png'});
ok(!errs.length,'sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
