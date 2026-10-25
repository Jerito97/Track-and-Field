import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>(await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})).json();
const sql=async(q,p)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params:p})})).json();
const sfx=Date.now()%100000, A=await post({action:'register',name:'Jero'+sfx,pin:'1234',color:'#e8262d'});
const d0=await (await fetch(API+'?daily=1&player='+A.player.id)).json();
for(let k=0;k<30;k++){ const u=await post({action:'register',name:'Jugador'+k+'_'+sfx,pin:'1234',color:'#2f6fd6'});
  await sql('insert into daily(day,player_id,ev,mark) values($1,$2,$3,$4)',[d0.day,u.player.id,d0.ev,14+k*.07]); }
await sql('insert into daily(day,player_id,ev,mark) values($1,$2,$3,$4)',[d0.day,A.player.id,d0.ev,15.02]);
const b=await chromium.launch();
for(const [w,h,n] of [[844,390,'land'],[390,844,'port']]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage();
  await p.addInitScript(([a])=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-daily:not([hidden])'); await p.click('.m-daily'); await p.waitForSelector('.d-list'); await p.waitForTimeout(500);
  const m=await p.evaluate(()=>{ const o=document.querySelector('#ov'), l=document.querySelector('.d-list'); return {ov:[o.scrollHeight,o.clientHeight],list:[l.scrollHeight,l.clientHeight],rows:l.querySelectorAll('tr').length}; });
  console.log(n,JSON.stringify(m)); await p.screenshot({path:`${out}/long-${n}.png`}); }
await b.close();
