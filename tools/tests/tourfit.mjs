import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
const sfx=Date.now()%10000, A=await post({action:'register',name:'Muro'+sfx,pin:'1234',color:'#e8262d'});
const T5=(await post({action:'create',token:A.token,name:'1er torneo',events:['100','110h','lj','pv','jav'],days:7})).code;
const T12=(await post({action:'create',token:A.token,name:'Torneo largo',events:['100','110h','lj','pv','jav','tj','ham','hj','sp','crawl','breast','fly'],days:7})).code;
await post({action:'result',code:T5,ev:'100',mark:12.08,token:A.token}); await post({action:'result',code:T5,ev:'110h',mark:12.37,token:A.token});
for(let k=0;k<10;k++){ const u=await post({action:'register',name:'Javo'+k+'x'+sfx,pin:'1234',color:'#f0c020'}); for(const T of [T5,T12]){ await post({action:'join',code:T,token:u.token}); await post({action:'result',code:T,ev:'100',mark:11+k*.1,token:u.token}); } }
const b=await chromium.launch(); const errs=[]; let fails=0;
for(const [w,h,n] of [[844,390,'844x390'],[932,430,'932x430'],[740,360,'740x360'],[390,844,'390x844']]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a])=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes',{state:'attached'}); await p.waitForTimeout(800);
  for(const [T,k] of [[T5,'5'],[T12,'12']]){
    await p.evaluate(c=>import('/js/ui/online.js').then(m=>m.showTournament(c)),T); await p.waitForSelector('.o-tbl'); await p.waitForTimeout(600);
    const m=await p.evaluate(()=>{ const o=document.querySelector('#ov'), t=document.querySelector('.o-tbl'), r=t.querySelector('tbody tr'); return {ov:[o.scrollHeight,o.clientHeight],tbl:t.clientHeight,rows:+(t.clientHeight/(r?.getBoundingClientRect().height||1)).toFixed(1)}; });
    const okv=m.ov[0]<=m.ov[1]+1&&m.tbl>=100; if(!okv) fails++;
    console.log((okv?'PASS ':'FAIL ')+n+' '+k+' pruebas: pantalla '+m.ov.join('/')+' tabla '+m.tbl+'px (~'+m.rows+' filas)');
    await p.screenshot({path:`${out}/t${k}-${n}.png`}); } }
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
