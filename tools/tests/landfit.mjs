import {BASE} from './lib.mjs';
// Every screen with the phone sideways (and a short one): the action buttons (Volver and the rest) are all on screen,
// not cut off by the card nor below the bottom. It walks the menus by itself: from each screen, every button that
// opens another one (not the ones that start a game or change things), up to three taps from the main menu.
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
const sql=async(q,params)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params})})).json();
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const reg=n=>post({action:'register',name:n,pin:'1234',color:'#2f6fd6'});
const A=await reg('Jero'), B=await reg('Faca'), C=await reg('Javo'), D=await reg('Muro');
const now=Date.now();
for(const [u,k] of [[A,0],[B,1],[C,2],[D,3]]) await post({action:'marks',token:u.token,list:[{ev:'100',mark:10.5+k*.2,date:now},{ev:'lj',mark:7-k*.1,date:now},{ev:'pv',mark:5-k*.1,date:now}]});
await post({action:'fadd',player:B.player.id,token:A.token}); await post({action:'faccept',player:A.player.id,token:B.token});
await post({action:'fadd',player:A.player.id,token:D.token});
await post({action:'create',token:A.token,name:'Torneo largo de prueba',events:['100','lj','pv','jav','110h'],days:1});
await sql('update users set admin=true where id=$1',[A.player.id]).catch(()=>{});
const SKIP=new Set(['go','play','demo','splay','dplay','oplay','sstart','sresume','snext','squit','nextround','quit','reload','sound','fadd','fdel','faccept','freject','oclose','ojoin','orepeatgo','ocreate',
  'scroll','sel','cat','bcat','pcat','ocat','odays','resume','evdone','afterres','nextevent','podium','standings','switch','newplayer','alocal','askip','anext','alogin','aregister','acolor','aname','oshare','oinvite','oinv','orefresh','auser','color']);
const b=await chromium.launch(); const errs=[];
async function open(w,h){
  const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(([a])=>{ localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
  return p; }
// the buttons a screen can be left by; each must be inside the window and inside every box that clips it
const check=p=>p.evaluate(()=>{ const ov=document.getElementById('ov'), bad=[];
  ov.querySelectorAll('.btns button, .btns a, .b-back, .m-back').forEach(e=>{ if(!e.offsetParent&&getComputedStyle(e).position!=='fixed') return; const r=e.getBoundingClientRect(); if(!r.width) return;
    let lim={t:0,b:innerHeight,l:0,r:innerWidth};
    for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){ const s=getComputedStyle(a); if(s.overflowY!=='visible'||s.overflowX!=='visible'){ const q=a.getBoundingClientRect(); lim={t:Math.max(lim.t,q.top),b:Math.min(lim.b,q.bottom),l:Math.max(lim.l,q.left),r:Math.min(lim.r,q.right)}; } }
    if(r.top<lim.t-1||r.bottom>lim.b+1||r.left<lim.l-1||r.right>lim.r+1) bad.push((e.textContent.trim()||e.getAttribute('aria-label')||'?').slice(0,24)+` (${Math.round(r.bottom)}>${Math.round(lim.b)})`); });
  const h=ov.querySelector('h2,.m-title,.logo'); return {bad,title:(h?h.textContent:'').trim().slice(0,40),acts:[...ov.querySelectorAll('[data-act]')].filter(e=>e.offsetParent).map(e=>{ const d={...e.dataset}; delete d.focus; return d; })}; });
const sel=d=>Object.entries(d).map(([k,v])=>`[data-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}="${v}"]`).join('');
for(const [w,h] of [[844,390],[667,375],[844,340]]){
  const p=await open(w,h), seen=new Set(), q=[[]]; let screens=0, badN=0;
  while(q.length){ const path=q.shift();
    await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.waitForTimeout(700);
    let okPath=true; for(const s of path){ const el=await p.$(sel(s)+':visible'); if(!el){ okPath=false; break; } await el.click().catch(()=>{ okPath=false; }); await p.waitForTimeout(450); }
    if(!okPath) continue;
    const r=await check(p), key=[...new Set(r.acts.map(a=>a.act))].sort().join(',');
    if(seen.has(key)) continue; seen.add(key); screens++;
    const name=path.map(s=>s.act+(s.id?'':s.group!==undefined?'-'+s.group:'')).join(' › ')||'menú';
    if(r.bad.length){ badN++; console.log(`  ${w}x${h} ${name} [${r.title}]: ${r.bad.join(', ')}`); await p.screenshot({path:`${out}/${w}x${h}-${badN}.png`}); }
    if(path.length<3) for(const a of r.acts) if(!SKIP.has(a.act)&&a.act!=='menu') q.push([...path,a]); }
  ok(!badN,`${w}x${h}: ${screens} pantallas, los botones se ven en todas${badN?` (fallan ${badN})`:''}`);
  await p.context().close(); }
ok(!errs.length,'sin errores'+(errs.length?': '+errs[0]:'')); await b.close();
