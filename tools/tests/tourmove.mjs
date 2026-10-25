import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
const sfx=Date.now()%10000, A=await post({action:'register',name:'Jero'+sfx%100,pin:'1234',color:'#1c2a55'});
const T=(await post({action:'create',token:A.token,name:'Nuevas',events:['cycle','tj','hj','ham','fly'],days:1})).code;
for(const n of ['Faca','Javo','Muro']){ const u=await post({action:'register',name:n+sfx%100,pin:'1234',color:'#e8262d'}); await post({action:'join',code:T,token:u.token}); }
const b=await chromium.launch(); let fails=0;
for(const [w,h,mob] of [[1000,462,true],[844,390,true],[390,844,true]]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:mob,hasTouch:true,serviceWorkers:'block'})).newPage();
  await p.addInitScript(([a])=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes',{state:'attached'}); await p.waitForTimeout(800);
  await p.evaluate(c=>import('/js/ui/online.js').then(m=>m.showTournament(c)),T); await p.waitForSelector('.o-tbl'); await p.waitForTimeout(800);
  const m=await p.evaluate(()=>{ const d=document.documentElement, o=document.querySelector('#ov'), card=o.querySelector('.card');
    const wide=[...o.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&!e.closest('.scroll,.o-evlist')).map(e=>e.className||e.tagName).slice(0,6);
    return {doc:[d.scrollWidth,d.clientWidth,d.scrollHeight,d.clientHeight],ov:[o.scrollWidth,o.clientWidth,o.scrollHeight,o.clientHeight],card:Math.round(card.getBoundingClientRect().width),wide}; });
  console.log(w+'x'+h,JSON.stringify(m));
  await p.screenshot({path:`${out}/move-${w}.png`}); }
await b.close();
