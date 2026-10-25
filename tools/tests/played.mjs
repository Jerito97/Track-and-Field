import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:844,height:390},serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
// a player whose history is full (200), like Jero's
await p.addInitScript(()=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.clear();
  const h=Array.from({length:200},(_,i)=>({ev:'100',mark:11,place:1,of:8,mode:'single',date:Date.now()-i*6e4}));
  localStorage.setItem('odb-players',JSON.stringify({list:[{id:'x1',name:'Jero',color:'#e8262d',created:0,rec:{},best:{},history:h,tours:[],resets:['tj-ham-1','hj-sp-1','swim-1','4x100-1','4x100-2','laser-cycle-1']}],cur:'x1'})); });
await p.goto(BASE+'/'); await p.waitForTimeout(1500);
const n=await p.evaluate(async()=>{ const st=await import('/js/storage.js'), cf=await import('/js/config.js'); const ev=cf.EVENTS[0];
  const r=[st.playedCount(st.player())]; for(let i=0;i<3;i++) st.recordEvent(ev,11.5,2,8,'single'); r.push(st.playedCount(st.player()), st.player().history.length); return r; });
console.log('antes',n[0],'después de 3 pruebas',n[1],'historial',n[2]);
await p.evaluate(async()=>(await import('/js/ui/screens.js')).showProfile()); await p.waitForTimeout(400);
const shown=await p.$eval('.p-stats b',e=>e.textContent); console.log('perfil:',shown);
await p.reload(); await p.waitForTimeout(1200); const again=await p.evaluate(async()=>(await import('/js/storage.js')).playedCount((await import('/js/storage.js')).player()));
console.log(n[0]===200&&n[1]===203&&n[2]===200&&shown==='203'&&again===203?'PASS el contador sigue: 200 → 203 (y queda al recargar)':'FAIL', errs.length?errs:'sin errores');
await b.close();
