import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>(await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})).json();
const sql=async(q,p)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params:p})})).json();
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const A=await post({action:'register',name:'Comp'+Date.now()%10000,pin:'1234',color:'#e8262d'});
const b=await chromium.launch(); const errs=[];
const page=async()=>{ const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a])=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id}));
    // a survival run saved the old way: events by their place in the list (100 m, garrocha, largo, vallas, jabalina)
    localStorage.setItem('odb-surv-'+a.player.id,JSON.stringify({mode:'classic',round:2,order:[0,3,1,2,4],k:1,pts:1500,won:1,log:[]})); },[A]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); return p; };
const p=await page();
// the safety reload doesn't fire when the game started
let navs=0; p.on('framenavigated',()=>navs++); await p.waitForTimeout(7000); ok(navs===0,'la recarga de seguridad no salta si el juego arrancó');
await p.evaluate(async()=>(await import('/js/ui/survival.js')).showSurvival('classic')); await p.waitForSelector('.s-resume');
const t=await p.textContent('.s-resume'); console.log('  guardada:',t.trim()); ok(t.includes('Garrocha'),'partida vieja de supervivencia: sigue en la prueba que tocaba (garrocha)');
await p.click('[data-act="sresume"]'); await p.waitForTimeout(400); const h=await p.textContent('#ov h2'); console.log('  ',h); ok(/Garrocha · 2\/5/.test(h),'al seguir, va a garrocha 2/5');
// a challenge with an event this copy doesn't know
const day=new Date(Date.now()-3*3600e3).toISOString().slice(0,10);
await sql("insert into daily_ev(day,ev) values($1,'nueva') on conflict(day) do update set ev='nueva'",[day]);
await p.evaluate(async()=>(await import('/js/ui/daily.js')).showDaily()); await p.waitForTimeout(800);
const dt=await p.textContent('#ov'); ok(dt.includes('prueba nueva')&&dt.includes('Actualizar el juego'),'desafío con prueba desconocida: pide actualizar');
await p.screenshot({path:out+'/nueva.png'});
await sql("delete from daily_ev where day=$1",[day]);
console.log(errs.length?errs:'sin errores', fails?fails+' FALLAS':'');
await b.close();
