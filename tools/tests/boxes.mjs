import {BASE} from './lib.mjs';
// every screen with a list or a table, with lots in it: the screen itself must not scroll, the box inside must
import {chromium} from './pw.mjs';
import fs from 'node:fs';
const API=BASE+'/api/t', out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(JSON.stringify(b).slice(0,80)+' '+j.error); return j; };
const MAXT=29;
const sfx=Date.now()%10000, now=Date.now();
const A=await post({action:'register',name:'Jero'+sfx,pin:'1234',color:'#e8262d'});
const T=(await post({action:'create',token:A.token,name:'Copa grande',events:['100','lj','pv','jav','110h'],days:3})).code;
const gid='amigos';
const us=[];
for(let k=0;k<40;k++){ const u=await post({action:'register',name:'Atleta'+k+'x'+sfx,pin:'1234',color:['#2f6fd6','#1f9e54','#f0a020'][k%3]}); us.push(u);
  await post({action:'marks',token:u.token,list:[{ev:'100',mark:10+k*.05,date:now}]});
  if(k<MAXT){ await post({action:'join',code:T,token:u.token}); await post({action:'result',code:T,ev:'100',mark:10.5+k*.03,token:u.token}); }
  if(k<20){ await post({action:'fadd',token:A.token,player:u.player.id}); await post({action:'faccept',token:u.token,player:A.player.id}); } }
await post({action:'marks',token:A.token,list:[{ev:'100',mark:11.5,date:now}]});
console.log('torneo',T,'grupo',gid);
const b=await chromium.launch(); const errs=[];
const screens=[['jugadores',"(await import('/js/ui/people.js')).showPeople()",'.u-list'],
  ['perfil',`(await import('/js/ui/people.js')).showPerson('${A.player.id}')`,'.u-recs'],
  ['records',"(await import('/js/ui/board.js')).showBoard(0)",'.b-list'],
  ['torneo',`(await import('/js/ui/online.js')).showTournament('${T}')`,'.o-tbl'],
  ['invitar',`(await import('/js/ui/online.js')).showInvite('${T}')`,'#oilist .u-item'],
  ['amigos',"(await import('/js/ui/friends.js')).showFriends()",'#flist .u-item'],
  ['avisos',"(await import('/js/ui/notifs.js')).showNotifs()",'.card']];
let fails=0;
for(const [w,h,n] of [[844,390,'acostado'],[390,844,'parado'],[740,360,'chico']]){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a])=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.waitForTimeout(800);
  for(const [name,code,sel] of screens){
    await p.evaluate(`(async()=>{ ${code}; })()`); await p.waitForSelector(sel); await p.waitForTimeout(900);
    const m=await p.evaluate(()=>{ const o=document.querySelector('#ov'), l=[...o.querySelectorAll('.scroll')].map(e=>[e.scrollHeight,e.clientHeight]); return {ov:[o.scrollHeight,o.clientHeight],l}; });
    const okv=m.ov[0]<=m.ov[1]+1; if(!okv) fails++;
    console.log((okv?'PASS ':'FAIL ')+n.padEnd(9)+name.padEnd(10)+'pantalla '+m.ov.join('/')+'  recuadros '+JSON.stringify(m.l));
    await p.screenshot({path:`${out}/${n}-${name}.png`}); } }
console.log(errs.length?errs:'sin errores', fails?fails+' FALLAS':'');
await b.close();
