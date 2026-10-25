import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const out=process.argv[2]; const b=await chromium.launch(); const errs=[];
const top=[['t','Jero','#14284f',10.06],['b','Muro','#e8262d',10.09],['c','Faca','#e8262d',10.44],['d','Javo','#ffd23a',10.57],['e','Lucho','#1f9e54',11.2]].map(([id,name,color,mark])=>({player_id:id,name,color,mark,date:'2026-10-19'}));
for(const [w,h,tag] of [[844,390,'land'],[390,844,'port'],[667,375,'small']]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage();
  p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/api/t**',r=>{ const u=r.request().url(); r.fulfill({json:u.includes('top=')?{top:u.includes('span')?[]:top}:{players:[],friends:[{id:'b',name:'Muro',color:'#e8262d'}],ok:true}}); });
  await p.addInitScript(()=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:'t',name:'Jero',color:'#14284f',token:'test',created:0,rec:{},best:{},history:[],tours:[]}],cur:'t'})); });
  await p.goto(BASE+'/'); await p.waitForTimeout(700);
  await p.click('.m-recs'); await p.waitForTimeout(800); await p.screenshot({path:`${out}/${tag}.png`});
  await p.click('[data-act="board"][data-span="month"]'); await p.waitForTimeout(500); await p.screenshot({path:`${out}/${tag}-empty.png`});
  await p.click('[data-act="board"][data-i="1"]'); await p.waitForTimeout(400);
  await p.click('.b-back'); await p.waitForTimeout(300); console.log(tag,'volver ->',await p.evaluate(()=>!!document.querySelector('.m-evs')||!!document.querySelector('.m-modes')));
  await p.context().close(); }
console.log(errs.join('|')||'sin errores'); console.log((errs.length?'FAIL':'PASS')+' récords en tres tamaños sin errores en la página'); await b.close();
