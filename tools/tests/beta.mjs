import {BASE} from './lib.mjs';
import {chromium} from './pw.mjs';
const b=await chromium.launch(); let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
for(const admin of [false,true]){
  const p=await (await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2})).newPage(); p.on('pageerror',e=>console.log('ERR',String(e)));
  await p.addInitScript(a=>{ localStorage.setItem('odb-players',JSON.stringify({list:[{id:'a',name:'Jero',color:'#e8262d',token:'x',created:0,rec:{},best:{},history:[],tours:[]}],cur:'a'})); if(a) localStorage.setItem('odb-admin',JSON.stringify('a')); },admin);
  await p.goto(BASE+'/'); await p.waitForSelector('.m-modes');
  await p.evaluate(async()=>{ const c=await import('/js/config.js'); c.BETA.push({...c.EVENTS[0],id:'200b',name:'200 metros',tag:'200 M',dist:200,beta:true}); });
  await p.click('[data-act="events"]'); await p.waitForTimeout(300);
  const n=await p.$$eval('.m-ev',x=>x.length); ok(admin?n===17:n===16,`${admin?'admin':'otro'}: ${n} pruebas en el carrusel`);
  if(admin){ await p.click('[data-act="sel"][data-i="16"]'); await p.screenshot({path:''+process.argv[2]+'/beta.png'}); ok(!(await p.$('.m-rec[data-act="board"]')),'prueba en prueba: sin botón Récords');
    await p.click('[data-act="go"]'); await p.waitForTimeout(500); ok(await p.evaluate(()=>window.__odb.S.ev.id==='200b'&&window.__odb.S.ev.dist===200),'se juega la prueba en prueba');
    await p.evaluate(async()=>{ const sc=await import('/js/ui/screens.js'), st=await import('/js/state.js'); sc.endEvent(st.ATH.map((a,i)=>i?30+i:20.5)); }); await p.waitForTimeout(1500); await p.mouse.click(400,200); await p.waitForTimeout(300);
    const sent=await p.evaluate(()=>JSON.parse(localStorage.getItem('odb-players')).list[0].sent||{}); ok(!('200b' in sent),'su marca no se manda al Top 10'); }
  await p.context().close(); }
console.log(fails?fails+' FALLAS':'BETA OK'); await b.close();
