import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t';
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
const get=async q=>(await fetch(API+q)).json();
const sql=async(q,p)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params:p})})).json();
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sfx=Date.now()%10000, A=await post({action:'register',name:'Ana'+sfx,pin:'1234',color:'#e8262d'}), B=await post({action:'register',name:'Beto'+sfx,pin:'1234',color:'#2f6fd6'});
const old=Date.now()-3*864e5;
await post({action:'marks',token:A.token,list:[{ev:'pv',mark:6.5,date:old},{ev:'100',mark:11,date:old}]});
await post({action:'marks',token:B.token,list:[{ev:'pv',mark:6.1,date:old}]});
// the reset of pole vault (as the migration does it: with the server running, through the admin op)
await sql("update users set admin=true where id=$1",[A.player.id]);
await post({action:'admin',op:'wipeev',ev:'pv',token:A.token});
const t1=(await get('?top=pv')).top, y1=(await get('?top=pv&span=year')).top, c1=(await get('?top=100')).top;
ok(!t1.length&&!y1.length&&c1.length===1,'servidor: garrocha vacía (mundial y del año), 100 m intacto');
// Ana's phone still has her old record (sent) and a pole vault from a minute ago is... none: only the old one
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(([a,old])=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.clear();
  localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,
    rec:{pv:6.5,'100':11},best:{pv:[{v:6.5,date:old}],'100':[{v:11,date:old}]},sent:{pv:6.5,'100':11},pb:{pv:{y:{k:'y'+new Date().getFullYear(),v:6.5,date:old}}},history:[],tours:[],resets:['tj-ham-1','hj-sp-1','swim-1','4x100-1','4x100-2','laser-cycle-1']}],cur:a.player.id})); },[A,old]);
await p.goto(BASE+'/'); await p.waitForSelector('.m-modes',{state:'attached'}); await p.waitForTimeout(2000);
const loc=await p.evaluate(()=>JSON.parse(localStorage.getItem('odb-players')).list[0]);
ok(loc.rec.pv==null&&!loc.best.pv&&loc.rec['100']===11,'celular: se borró su garrocha vieja (100 m queda)');
// she plays pole vault again: 5.20, worse than the old 6.50
await p.evaluate(async()=>{ const st=await import('/js/storage.js'), cf=await import('/js/config.js'), bd=await import('/js/ui/board.js');
  st.recordEvent(cf.EVENTS.find(e=>e.id==='pv'),5.2,1,1,'single'); await bd.syncMarks(); });
await p.waitForTimeout(500);
const t2=(await get('?top=pv')).top, y2=(await get('?top=pv&span=year')).top;
console.log('  mundial:',JSON.stringify(t2.map(r=>[r.name,r.mark])),'del año:',JSON.stringify(y2.map(r=>[r.name,r.mark])));
ok(t2.length===1&&t2[0].mark===5.2&&y2.length===1&&y2[0].mark===5.2,'la marca nueva (peor que la vieja) sube al mundial y al del año');
// the wipe isn't applied twice: a new mark stays after reloading
await p.reload(); await p.waitForTimeout(2000);
ok((await p.evaluate(()=>JSON.parse(localStorage.getItem('odb-players')).list[0].rec.pv))===5.2,'al recargar, la marca nueva queda');
// one player's record (the admin's button on a player): only Beto's
await post({action:'marks',token:B.token,list:[{ev:'pv',mark:5.9,date:Date.now()}]});
await post({action:'admin',op:'delmark',player:B.player.id,ev:'pv',token:A.token});
const t3=(await get('?top=pv')).top; ok(t3.length===1&&t3[0].name.startsWith('Ana'),'borrar el récord de un jugador: solo el suyo');
// the admin screen's button
await p.evaluate(async()=>(await import('/js/ui/admin.js')).showAdmin()); await p.waitForSelector('#awipe');
await p.selectOption('#awipe','100'); await p.click('[data-act="awipe"]'); await p.click('[data-act="awipe"]'); await p.waitForSelector('.o-ok');
console.log('  ',await p.textContent('.o-ok'));
ok(!(await get('?top=100')).top.length,'botón del administrador: reinicia 100 m');
await p.screenshot({path:process.argv[2]+'/admin.png'});
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
