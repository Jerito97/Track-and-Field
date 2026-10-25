import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const API=BASE+'/api/t', out=process.argv[2];
const post=async b=>{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json(); if(!r.ok) throw new Error(j.error); return j; };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sfx=Date.now()%10000, reg=n=>post({action:'register',name:n+sfx,pin:'1234',color:['#e8262d','#2f6fd6','#1f9e54','#ffd23a'][n.length%4]});
const A=await reg('Jero'), B=await reg('Faca'), C=await reg('Javo'), D=await reg('Muro');
const now=Date.now(); for(const [u,m] of [[A,11],[B,10.5],[C,10.2],[D,12]]) await post({action:'marks',token:u.token,list:[{ev:'100',mark:m,date:now}]});
await post({action:'fadd',player:B.player.id,token:A.token}); await post({action:'faccept',player:A.player.id,token:B.token});
await post({action:'fadd',player:A.player.id,token:D.token});  // Muro asks Jero
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,serviceWorkers:'block'})).newPage(); p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(([a])=>{ if(sessionStorage.getItem('i')) return; sessionStorage.setItem('i','1'); localStorage.clear(); localStorage.setItem('odb-players',JSON.stringify({list:[{id:a.player.id,name:a.player.name,color:a.player.color,token:a.token,created:0,rec:{'100':11},best:{},sent:{'100':11},history:[],tours:[]}],cur:a.player.id})); },[A]);
await p.goto(BASE+'/'); await p.waitForSelector('.m-people'); await p.waitForTimeout(1500);
const strip=await p.textContent('.m-people'); console.log('  menú:',strip); ok(/Amigos/.test(strip)&&/1 amigo/.test(strip),'menú: «Amigos» con tus amigos');
await p.screenshot({path:out+'/menu.png'});
await p.click('.m-people'); await p.waitForSelector('#flist .u-item'); await p.waitForTimeout(400);
const fl=await p.textContent('#flist'); ok(fl.includes('Faca')&&/Solicitudes \(1\)/.test(fl)&&fl.includes('Muro'),'amigos: Faca, y la solicitud de Muro arriba'); await p.screenshot({path:out+'/amigos.png'});
await p.click('#flist .f-req [data-act="freject"]'); await p.waitForTimeout(500); ok(!(await p.textContent('#flist')).includes('Muro'),'rechazar la solicitud de Muro');
await p.fill('#fsearch','javo'); await p.waitForTimeout(900);
await p.click('#flist [data-act="fadd"]'); await p.waitForSelector('#flist .f-pend'); await p.screenshot({path:out+'/buscar.png'}); ok(true,'buscar a Javo y mandarle solicitud: queda «Pendiente»');
await post({action:'faccept',player:A.player.id,token:C.token});  // Javo accepts
await p.evaluate(()=>import('/js/ui/friends.js').then(m=>m.showFriends())); await p.waitForTimeout(800);
await p.fill('#fsearch',''); await p.dispatchEvent('#fsearch','input'); await p.waitForTimeout(300);
const names=await p.$$eval('#flist button.u-item b',l=>l.map(e=>e.textContent)); console.log('  amigos:',names.join(', ')); ok(names.length===2,'Javo aceptó: ahora tiene 2 amigos');
// the friends board
await p.click('[data-act="board"][data-group="friends"]'); await p.waitForSelector('.b-list tbody tr'); await p.waitForTimeout(800);
const rows=await p.$$eval('.b-list tbody td.nm',l=>l.map(e=>e.textContent)); console.log('  récords de amigos:',rows.join(', '));
ok(rows.length===3&&!rows.some(r=>r.startsWith('MURO')&&false)&&!rows.join().includes('Muro'),'récords › Amigos: vos, Faca y Javo (sin Muro)'); await p.screenshot({path:out+'/records.png'});
await p.click('.b-scope[data-group=""]'); await p.waitForTimeout(900); const w=await p.$$eval('.b-list tbody td.nm',l=>l.length); ok(w===4,'récords › Mundial: todos ('+w+')');
// a profile: take a friend off (from both lists), ask again, take the request back
await p.evaluate(id=>import('/js/ui/people.js').then(m=>m.showPerson(id,'friends')),C.player.id); await p.waitForSelector('.u-fr'); await p.screenshot({path:out+'/perfil.png'});
await p.click('[data-act="fdel"]'); await p.click('[data-act="fdel"]'); await p.waitForSelector('.u-fr [data-act="fadd"]'); ok(true,'perfil: quitar de amigos');
await p.click('.u-fr [data-act="fadd"]'); await p.waitForSelector('.u-fr .f-pend'); ok((await p.textContent('.u-fr')).includes('Solicitud enviada'),'perfil: mandar solicitud');
await p.click('.u-fr [data-act="fdel"]'); await p.click('.u-fr [data-act="fdel"]'); await p.waitForSelector('.u-fr [data-act="fadd"]'); ok(true,'perfil: cancelar la solicitud');
await p.click('.btns [data-act="friends"]'); await p.waitForSelector('#flist'); ok(true,'«Volver» del perfil vuelve a amigos');
console.log(errs.length?errs:'sin errores',fails?fails+' FALLAS':''); await b.close();
