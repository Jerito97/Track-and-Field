import {BASE} from './lib.mjs';
// The weekly challenge: the same five events for everyone all week, none of last week's; anyone joins (no limit),
// one go per event; it can't be repeated nor anyone invited. In the menu, half of the challenges' bar; its screen.
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const call=async(b,q='')=>{ const r=await fetch(API+q,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{}); const j=await r.json(); return {status:r.status,...j}; };
const sql=async(q,params)=>(await fetch(BASE+'/__sql',{method:'POST',body:JSON.stringify({sql:q,params})})).json();
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const ALL=['100','lj','110h','pv','jav','tj','ham','hj','sp','crawl','breast','fly','4x100','laser','cycle','dis'];
const reg=n=>call({action:'register',name:n,pin:'1234',color:'#2f6fd6'});
const A=await reg('Jero'), B=await reg('Faca');
let w=await call(null,'?week=1'); const w2=await call(null,'?week=1');
const evs=w.tournament.events; console.log('   semana',w.code,evs.join(','),'termina',w.tournament.ends_at);
ok(/^S\d{6}$/.test(w.code)&&w2.code===w.code&&w2.tournament.events.join()===evs.join(),'la misma para todos (código '+w.code+')');
ok(evs.length===5&&new Set(evs).size===5&&evs.every(e=>ALL.includes(e)),'5 pruebas distintas');
const end=new Date(w.tournament.ends_at); ok(end.getUTCDay()===1&&end.getUTCHours()===3&&end-Date.now()<=7*864e5,'termina el lunes a las 00:00 (Argentina)');
// last week's five don't come back: last week made with five events, this week's drawn again (several times)
const mon=new Date(Date.UTC(2000+ +w.code.slice(1,3),+w.code.slice(3,5)-1,+w.code.slice(5,7))), prev='S'+new Date(+mon-7*864e5).toISOString().slice(2,10).replace(/-/g,'');
let clash=0;
for(let k=0;k<12;k++){ const old=ALL.slice((k*5)%11,(k*5)%11+5);
  await sql('delete from tournaments where code=$1 or code=$2',[w.code,prev]);
  await sql(`insert into tournaments(code,name,events,host_id,ends_at) values($1,'Desafío semanal',$2,'',now())`,[prev,old.join(',')]);
  const n=await call(null,'?week=1'); if(n.tournament.events.some(e=>old.includes(e))) clash++; }
ok(!clash,'nunca vuelven las 5 de la semana anterior (12 sorteos)');
w=await call(null,'?week=1');
// no limit of players: 35 already in, one more gets in
for(let i=0;i<35;i++) await sql(`insert into entries(code,player_id,name,color) values($1,$2,$3,'#123456')`,[w.code,'x'+i,'X'+i]);
const j=await call({action:'join',code:w.code,token:A.token}); ok(j.status===200,'con 35 adentro, entra uno más');
const e0=w.tournament.events[0];
ok((await call({action:'result',code:w.code,ev:e0,mark:null,token:A.token})).status===200,'juega una prueba');
ok((await call({action:'result',code:w.code,ev:e0,mark:null,token:A.token})).status===409,'una sola vez cada prueba');
ok((await call({action:'repeat',code:w.code,events:['100'],days:1,token:A.token})).status===400,'no se repite');
ok((await call({action:'invite',code:w.code,player:B.player.id,token:A.token})).status===400,'no se invita (ya pueden todos)');
await sql('delete from entries where code=$1 and player_id like $2',[w.code,'x%']);
// weekly challenges won, in the profile: one already over where Jero made more points than Faca (a week in the past)
await sql(`insert into tournaments(code,name,events,host_id,ends_at) values('S200106','Desafío semanal','100,lj,pv,jav,hj','',now()-interval '1 day')`);
for(const [u,m] of [[A,10.5],[B,11.2]]){ await sql(`insert into entries(code,player_id,name,color) values('S200106',$1,'x','#123456')`,[u.player.id]); await sql(`insert into results(code,player_id,ev,mark) values('S200106',$1,'100',$2)`,[u.player.id,m]); }
const pa=await call(null,'?player='+A.player.id), pb=await call(null,'?player='+B.player.id);
ok(pa.week_wins===1&&pb.week_wins===0,`perfil: semanales ganados (Jero ${pa.week_wins}, Faca ${pb.week_wins})`);
// the menu and its screen
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(([a])=>{ localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.waitForSelector('.m-week:not([hidden])',{timeout:8000}).catch(()=>{});
const bar=await p.$eval('.m-week',e=>e.hidden?'':e.textContent).catch(()=>''); console.log('   barra:',bar);
ok(/1\/5/.test(bar),'menú: la mitad del semanal, con 1/5 jugadas');
const halves=await p.$$eval('.m-chal>.m-daily:not([hidden])',l=>l.map(e=>Math.round(e.getBoundingClientRect().width)));
ok(halves.length===2&&Math.abs(halves[0]-halves[1])<3,'menú: mitad desafío del día, mitad semanal ('+halves.join(' / ')+' px)');
await p.screenshot({path:out+'/menu.png'});
await p.click('.m-week'); await p.waitForSelector('.o-table'); await p.waitForTimeout(300);
const txt=await p.textContent('#ov'); ok(/SEMANAL/.test(txt)&&/Para todos/.test(txt)&&!/Invitar jugadores/.test(txt),'su pantalla: sin código ni invitar');
const jug=await p.$$eval('[data-act="oplay"]',l=>l.length); ok(jug===4,'4 pruebas por jugar');
await p.screenshot({path:out+'/semanal.png'});
const pp=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await pp.addInitScript(([a])=>{ localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{},best:{},history:[],tours:[]}],cur:a.player.id})); },[A]);
await pp.goto(BASE+'/'); await pp.waitForSelector('.m-modes'); await pp.waitForSelector('.m-week:not([hidden])',{timeout:8000}).catch(()=>{}); await pp.waitForTimeout(300);
const over=await pp.$$eval('.m-chal>.m-daily:not([hidden])',l=>l.some(e=>e.scrollWidth>e.clientWidth+2)); ok(!over,'parado: las dos mitades entran'); await pp.screenshot({path:out+'/menu-vertical.png'});
await pp.click('[data-act="profile"]'); await pp.waitForSelector('#pweek'); await pp.waitForFunction(()=>document.getElementById('pweek').textContent!=='…');
ok((await pp.textContent('#pweek'))==='1','tu perfil: 1 desafío semanal ganado'); await pp.screenshot({path:out+'/perfil-vertical.png'});
await p.click('[data-act="menu"]').catch(()=>{}); await p.goto(BASE+'/'); await p.waitForSelector('.m-modes'); await p.click('[data-act="profile"]'); await p.waitForFunction(()=>document.getElementById('pweek')?.textContent==='1');
const g=await p.$$eval('.p-main>div',l=>l.map(e=>Math.round(e.getBoundingClientRect().width)));
ok(g.length===5&&Math.abs(g[0]-g[2])<2&&Math.abs(g[3]-g[4])<2&&g[3]>g[0]*1.3,'tu perfil: 3 arriba, las 2 supervivencias abajo más anchas ('+g.join(',')+')');
await p.evaluate(()=>document.querySelector('.p-recs').scrollIntoView()); const last=await p.$$eval('.p-recs>div',l=>{ const r=l[l.length-1].getBoundingClientRect(), box=l[0].parentElement.getBoundingClientRect(); return Math.abs((r.left+r.right)/2-(box.left+box.right)/2); });
ok(last<3,'tus récords: el último, solo en su fila, centrado'); await p.screenshot({path:out+'/perfil.png'});
ok(!errs.length,'sin errores'+(errs[0]?': '+errs[0]:'')); await b.close();
