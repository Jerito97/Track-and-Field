import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sfx=Date.now()%10000, now=Date.now();
const A=await post({action:'register',name:'Jero'+sfx,pin:'1234',color:'#e8262d'});
for(let k=0;k<14;k++){ const u=await post({action:'register',name:'Atleta'+k+'x'+sfx,pin:'1234',color:'#2f6fd6'}); await post({action:'marks',token:u.token,list:[{ev:'110h',mark:13+k*.1,date:now}]}); if(k<12) await post({action:'fadd',player:u.player.id,token:A.token}); }
await post({action:'marks',token:A.token,list:[{ev:'110h',mark:14.25,date:now}]});
const r=await (await fetch(API+'?top=110h&me='+A.player.id)).json(); console.log('  servidor: top',r.top.length,'vos',JSON.stringify(r.me&&{rank:r.me.rank,mark:r.me.mark}));
ok(r.top.length===10&&r.me&&r.me.rank>10&&r.me.rank===1+r.top.length+(r.me.rank-11),'el servidor manda el top 10 y tu puesto (14º en el mundo)');
const b=await chromium.launch(); const errs=[];
for(const [w,h,n] of [[844,390,'844x390'],[740,360,'740x360'],[932,430,'932x430'],[390,844,'390x844'],[375,667,'375x667']]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a])=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{'110h':14.25},best:{},sent:{'110h':14.25},history:[],tours:[]}],cur:a.player.id})); },[A]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-recs'); await p.waitForTimeout(600);
  for(const sc of ['','friends']){
    await p.evaluate(async([g])=>{ const cf=await import('/js/config.js'); (await import('/js/ui/board.js')).showBoard(cf.EVENTS.findIndex(e=>e.id==='110h'),undefined,g); },[sc]); await p.waitForTimeout(1500);
    const m=await p.evaluate(()=>{ const o=document.querySelector('#ov'), l=document.querySelector('.b-list'), rows=l.querySelectorAll('tbody tr:not(.b-gap)').length, mine=l.querySelector('.b-mine'); const lr=l.getBoundingClientRect(), mr=mine?.getBoundingClientRect();
      return {ov:[o.scrollHeight,o.clientHeight],list:[l.scrollHeight,l.clientHeight],rows,mine:mine?.textContent,mineIn:mine?mr.bottom<=lr.bottom+1:null}; });
    const fit=m.ov[0]<=m.ov[1]+1&&m.list[0]<=m.list[1]+1&&m.rows===11&&m.mineIn;
    if(!fit) fails++; console.log((fit?'PASS ':'FAIL ')+n+' '+(sc||'mundial')+': '+JSON.stringify(m));
    await p.screenshot({path:`${out}/${n}-${sc||'mundial'}.png`}); } }
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
