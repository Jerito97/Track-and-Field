const ROOT=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
process.env.DATABASE_URL='x';
import fs from 'node:fs';
const src=fs.readFileSync(ROOT+'/api/t.js','utf8');
// the old drawing, alone, to compare
const a=src.indexOf('const EVENTS='), ev=src.slice(a,src.indexOf('\n',a)), st=src.indexOf('const dayOf'), en=src.indexOf('// the day\'s event as kept');
const old=new Function(ev+'\n'+src.slice(st,en)+'\nreturn dailyEv;')();
const {default:h}=await import(ROOT+'/api/t.js');
const call=q=>new Promise(res=>{ const out={c:200,status(c){this.c=c;return this;},setHeader(){},json(o){res(o);}}; h({method:'GET',query:q,body:{}},out); });
const real=Date.now, T0=Date.parse('2026-10-21T15:00:00Z'); let same=0, rep=0; const seq=[];
for(let k=0;k<60;k++){ Date.now=()=>T0+k*864e5; const d=await call({daily:'1'}); seq.push(d.ev); if(d.ev===old(d.day)) same++; if(seq.slice(-6,-1).includes(d.ev)) rep++; }
Date.now=real;
console.log('igual al sorteo de antes:',same+'/60','repetidas en 5 días:',rep,'hoy:',seq[0]);
// a new event added: the days kept stay as they were
const kept=(await globalThis.__pg.query('select day,ev from daily_ev order by day')).rows;
const src2=src.replace("'laser','cycle'];","'laser','cycle','nueva'];").replace(/const DAY0/,'const XX=1;const DAY0');
fs.writeFileSync(ROOT+'/api/t2.mjs',src2);
const {default:h2}=await import(ROOT+'/api/t2.mjs'); fs.unlinkSync(ROOT+'/api/t2.mjs');
const call2=q=>new Promise(res=>{ const out={c:200,status(c){this.c=c;return this;},setHeader(){},json(o){res(o);}}; h2({method:'GET',query:q,body:{}},out); });
let moved=0; for(let k=0;k<60;k++){ Date.now=()=>T0+k*864e5; const d=await call2({daily:'1'}); if(d.ev!==seq[k]) moved++; } Date.now=real;
const after=(await globalThis.__pg.query('select day,ev from daily_ev order by day')).rows;
console.log('con una prueba nueva, días guardados que cambiaron:',moved,'filas',kept.length,'->',after.length);
console.log((same===60&&rep===0&&moved===0?'PASS':'FAIL')+' el sorteo guardado: igual al de antes, sin repetir en 5 días, y una prueba nueva no cambia los días guardados');
process.exit(0);
