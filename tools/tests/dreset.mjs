const ROOT=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
process.env.DATABASE_URL='x';
const mk=async q=>{ const {default:h}=await import(ROOT+'/api/t.js'+q); return (body,query)=>new Promise(res=>{ const out={c:200,status(c){this.c=c;return this;},setHeader(){},json(o){res({status:this.c,...o});}}; h({method:query?'GET':'POST',query:query||{},body},out); }); };
const call=await mk('');
const A=await call({action:'register',name:'Ana',pin:'1234',color:'#e8262d'}), B=await call({action:'register',name:'Beto',pin:'1234',color:'#2f6fd6'});
const q=(s,p)=>globalThis.__pg.query(s,p);
// as it was: Ana played today another event, Beto played yesterday
await q("delete from migrations where id='reset-daily-2026-10-21'");
await q("insert into daily(day,player_id,ev,mark) values('2026-10-21',$1,'lj',7.1),('2026-10-20',$2,'pv',5)",[A.player.id,B.player.id]);
const call2=await mk('?again');
const d=await call2(null,{daily:'1',player:A.player.id});
const left=(await q("select day,player_id from daily")).rows;
console.log('hoy',d.day,d.ev,'jugó hoy:',d.me.played,'filas',JSON.stringify(left.map(r=>r.day)));
const ok1=!d.me.played&&left.length===1&&left[0].day==='2026-10-20';
// the kept event wins over the drawing
await q("update daily_ev set ev='pv' where day=$1",[d.day]);
const d2=await call2(null,{daily:'1',player:A.player.id}), st=await call2({action:'daily',step:'start',ev:'pv',token:A.token}), st2=await call2({action:'daily',step:'start',ev:'pv',token:A.token});
console.log('guardada',d2.ev,'start',st.status,st2.status);
const ok2=d2.ev==='pv'&&st.status===200&&st2.status===409;
console.log((ok1?'PASS':'FAIL')+' el desafío de hoy reiniciado (solo las jugadas de ese día)'); console.log((ok2?'PASS':'FAIL')+' la prueba del día guardada manda sobre el sorteo');
process.exit(0);
