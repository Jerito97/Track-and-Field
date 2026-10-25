import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
const sql=async(q,p)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params:p})})).json();
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sfx=Date.now()%10000, A=await post({action:'register',name:'Jero'+sfx,pin:'1234',color:'#e8262d'}), B=await post({action:'register',name:'Faca'+sfx,pin:'1234',color:'#2f6fd6'});
await sql("update users set admin=true where id=$1",[A.player.id]);
const day=k=>new Date(Date.now()-3*3600e3-k*864e5).toISOString().slice(0,10);
await sql("insert into daily(day,player_id,ev,mark) values($1,$3,'lj',7.5),($1,$4,'lj',7.1),($2,$3,'100',10.5)",[day(2),day(3),A.player.id,B.player.id]);
await post({action:'marks',token:A.token,list:[{ev:'ham',mark:70,date:Date.now()},{ev:'survm',mark:5400,rounds:3,date:Date.now()}]});
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(([a])=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[],survmBest:{pts:5400,rounds:3,date:Date.now()},survBest:{pts:3100,rounds:2,date:Date.now()}}],cur:a.player.id})); localStorage.setItem('odb-admin',JSON.stringify(a.player.id)); },[A]);
await p.goto(BASE+'/'); await p.waitForSelector('.m-recs'); await p.waitForTimeout(800);
await p.click('.m-recs'); await p.waitForSelector('.b-cats'); await p.waitForTimeout(600);
// categories
await p.click('.b-cats [data-c="throw"]'); await p.waitForTimeout(700);
const tabs=await p.$$eval('.b-tabs .b-tab',l=>l.map(e=>e.textContent)); console.log('  lanzamientos:',tabs.join(', '));
ok(tabs.join()==='JABALINA,MARTILLO,BALA,DISCO','filtro Lanzamientos: jabalina, martillo, bala y disco'); ok(await p.textContent('.b-tab.on')==='JABALINA','muestra la primera de esas');
await p.screenshot({path:out+'/cats.png'});
await p.click('.b-cats [data-c="all"]'); await p.waitForTimeout(600);
// picking an event far right: the tabs row stays where it was
await p.$eval('.b-tabs',e=>{ e.scrollLeft=e.scrollWidth; }); const before=await p.$eval('.b-tabs',e=>e.scrollLeft);
await p.click('.b-tabs .b-tab:last-child'); await p.waitForTimeout(1200);
const after=await p.$eval('.b-tabs',e=>e.scrollLeft), onVis=await p.$eval('.b-tabs',t=>{ const o=t.querySelector('.on'); return o.offsetLeft>=t.scrollLeft-1&&o.offsetLeft+o.offsetWidth<=t.scrollLeft+t.clientWidth+1; });
console.log('  desplazamiento antes',before,'después',after); ok(after>0&&Math.abs(after-before)<30&&onVis,'al elegir una prueba la fila no vuelve a la izquierda (y la elegida se ve)');
// own profile
await p.evaluate(async()=>(await import('/js/ui/screens.js')).showProfile()); await p.waitForTimeout(1200);
const st=await p.$$eval('.p-prof .p-stats:not(.p-recs) > div',l=>l.map(e=>e.textContent)); console.log('  perfil:',st.join(' | '));
ok(st.some(t=>t.startsWith('2desafíos'))&&st.some(t=>t.startsWith('5400mejor supervivencia moderna')),'perfil: desafíos ganados (2) y supervivencia moderna');
await p.screenshot({path:out+'/perfil.png'});
await p.evaluate(id=>import('/js/ui/people.js').then(m=>m.showPerson(id)),B.player.id); await p.waitForTimeout(1000);
ok((await p.textContent('.u-card')).includes('desafíos del día ganados'),'perfil de otro: sus desafíos ganados');
await p.evaluate(async()=>(await import('/js/ui/admin.js')).showAdmin()); await p.waitForSelector('#alist .u-item'); await p.waitForTimeout(400); await p.screenshot({path:out+'/admin.png'});
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
