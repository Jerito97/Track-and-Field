import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t';
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const A=await post({action:'register',name:'Disco'+Date.now()%10000,pin:'1234',color:'#e8262d'});
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
// a phone that played the discus while it was being tried out (no 'dis-1' reset yet)
await p.addInitScript(([a])=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{dis:71.2,'100':11},best:{dis:[{v:71.2,date:Date.now()-864e5}]},history:[],tours:[],resets:['tj-ham-1','hj-sp-1','swim-1','4x100-1','4x100-2','laser-cycle-1']}],cur:a.player.id})); },[A]);
await p.goto(BASE+'/'); await p.waitForSelector('.m-modes',{state:'attached'}); await p.waitForTimeout(1200);
const loc=await p.evaluate(()=>JSON.parse(localStorage.getItem('odb-players')).list[0]); ok(loc.rec.dis==null&&loc.rec['100']===11,'el celular borró el disco de la prueba (100 m queda)');
// now a real throw: recorded and sent
await p.evaluate(async()=>{ const st=await import('/js/storage.js'), cf=await import('/js/config.js'), bd=await import('/js/ui/board.js'); const ev=cf.EVENTS.find(e=>e.id==='dis'); st.recordEvent(ev,55.4,1,8,'single'); await bd.syncMarks(); });
await p.waitForTimeout(500); const top=(await (await fetch(API+'?top=dis')).json()).top; console.log('  récords de disco:',JSON.stringify(top.map(r=>[r.name,r.mark])));
ok(top.length===1&&top[0].mark===55.4,'el servidor guarda la marca de disco y arma su tabla');
ok(await p.evaluate(async()=>{ const cf=await import('/js/config.js'); return !!cf.EVENTS.find(e=>e.id==='dis')&&!cf.BETA.length; }),'disco publicado (ya no está en prueba)');
await p.evaluate(async()=>(await import('/js/ui/board.js')).showBoard((await import('/js/config.js')).EVENTS.findIndex(e=>e.id==='dis'))); await p.waitForTimeout(1200);
ok((await p.textContent('.b-card')).includes('Disco'),'tiene su pestaña en Récords');
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
