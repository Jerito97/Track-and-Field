// Runs the game's tests: node tools/tests/run.mjs [names...]  (no names: all of them)
// Each test gets its own server with an empty database (server.mjs, on a free port); the browser ones get its address
// in BASE, the server-only ones run api/t.js in their own process. A test passes when it ends well and prints no FAIL
// line. Screenshots go to tools/tests/out/<test>/. At the end, a summary.
import {spawn} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
const DIR=path.dirname(new URL(import.meta.url).pathname);
// browser tests (need the server), and the ones that only use api/t.js
const UI=['smoke','checkall','daily','dlong','friendsui','notifs','fnotifs','invite','boxes','recui','top10','tourfit','tourmove','wipes','compat','guard','dispub','played','herofit','beta','boardui','music','relayriv','dip','discus','disdemo','cycrace','online'];
const API=['apiall','friendsapi','agree','dreset','dkeep'];
if(!fs.existsSync(path.join(DIR,'node_modules/@electric-sql/pglite'))){ console.log('Falta instalar: cd tools/tests && npm install'); process.exit(1); }
const want=process.argv.slice(2), list=[...API,...UI].filter(n=>!want.length||want.includes(n));
const freePort=()=>new Promise(r=>{ const s=net.createServer(); s.listen(0,()=>{ const p=s.address().port; s.close(()=>r(p)); }); });
const node=(args,env)=>spawn(process.execPath,['--import',path.join(DIR,'register.mjs'),...args],{cwd:DIR,env:{...process.env,...env}});
async function runOne(name){
  const out=path.join(DIR,'out',name); fs.mkdirSync(out,{recursive:true});
  let srv=null, env={};
  if(UI.includes(name)){ const port=await freePort(); env.BASE='http://localhost:'+port;
    srv=node([path.join(DIR,'server.mjs')],{PORT:String(port)});
    await new Promise((res,rej)=>{ const t=setTimeout(()=>rej(new Error('el servidor no arrancó')),20000); srv.stdout.on('data',d=>{ if(String(d).includes('listening')){ clearTimeout(t); res(); } }); }); }
  const t0=Date.now(), p=node([path.join(DIR,name+'.mjs'),out],env); let log='';
  p.stdout.on('data',d=>{ log+=d; }); p.stderr.on('data',d=>{ log+=d; });
  const code=await new Promise(r=>{ const k=setTimeout(()=>{ p.kill('SIGKILL'); log+='\n(se cortó: más de 15 minutos)'; },15*60e3); p.on('close',c=>{ clearTimeout(k); r(c); }); });
  if(srv) srv.kill();
  const fails=log.split('\n').filter(l=>/^FAIL\b|^FALLA\b|\b[1-9]\d* FALLAS\b/.test(l)), passes=log.split('\n').filter(l=>/^PASS\b/.test(l)).length;
  const ok=code===0&&!fails.length;
  fs.writeFileSync(path.join(out,'log.txt'),log);
  console.log(`${ok?'OK   ':'FALLA'} ${name.padEnd(11)} ${String(passes).padStart(3)} pasan${fails.length?`, ${fails.length} fallan`:''}  (${Math.round((Date.now()-t0)/1000)} s)`);
  if(!ok){ (fails.length?fails:log.trim().split('\n').slice(-8)).forEach(l=>console.log('        '+l)); }
  return ok;
}
let bad=0; for(const n of list) if(!await runOne(n)) bad++;
console.log(bad?`\n${bad} de ${list.length} pruebas con fallas (detalle en tools/tests/out/<prueba>/log.txt)`:(list.length===1?'\nLa prueba pasa':`\nLas ${list.length} pruebas pasan`));
process.exit(bad?1:0);
