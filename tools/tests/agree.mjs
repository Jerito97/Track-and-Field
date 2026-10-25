const ROOT=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
process.env.DATABASE_URL='x';
const mk=async q=>{ const {default:h}=await import(ROOT+'/api/t.js'+q); return (body,query)=>new Promise(res=>{ const out={c:200,status(c){this.c=c;return this;},setHeader(){},json(o){res({status:this.c,...o});}}; h({method:query?'GET':'POST',query:query||{},body},out); }); };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const call=await mk(''); const reg=n=>call({action:'register',name:n,pin:'1234',color:'#e8262d'});
const [A,B,C]=[await reg('Ana'),await reg('Beto'),await reg('Caro')];
const q=(s,p)=>globalThis.__pg.query(s,p);
const now=new Date(), y=String(new Date(now-3*3600e3).getUTCFullYear()), m=y+'-'+String(new Date(now-3*3600e3).getUTCMonth()+1).padStart(2,'0');
// out of step, like from before the period boards: Ana's all-time 100 m from this month isn't in the period boards;
// Beto's best only reached this year's board; Caro's is from 2025
await q("insert into marks(player_id,ev,mark,made_at) values($1,'100',10.1,now()),($2,'100',11,now()),($3,'100',10.0,'2025-03-01')",[A.player.id,B.player.id,C.player.id]);
await q("insert into pmarks(player_id,ev,period,mark,made_at) values($1,'100',$2,10.4,now())",[B.player.id,y]);
const t=async sp=>(await call(null,{top:'100',...(sp?{span:sp}:{})})).top.map(r=>r.name+' '+r.mark).join(', ');
const H=await t(''), Y=await t('year'), M=await t('month'); console.log('  histórico:',H,'| año:',Y,'| mes:',M);
ok(H==='Caro 10, Ana 10.1, Beto 10.4'&&Y==='Ana 10.1, Beto 10.4'&&M==='Ana 10.1, Beto 10.4','las tres tablas coinciden (año y mes con lo de este año del histórico; histórico con lo mejor del año)');
// the one-time repair writes it down too
await q("delete from migrations where id='boards-agree-1'"); const call2=await mk('?again'); await call2(null,{top:'100'});
const pm=(await q("select count(*)::int n from pmarks where player_id=$1 and ev='100'",[A.player.id])).rows[0].n, bm=(await q("select mark from marks where player_id=$1 and ev='100'",[B.player.id])).rows[0].mark;
ok(pm===2&&bm===10.4,'la reparación de una vez guarda lo que faltaba (Ana en año y mes, Beto 10.4 en el histórico)');
// daily challenges won: two past days won by Ana, one by Beto, today's doesn't count yet
const day=k=>new Date(Date.now()-3*3600e3-k*864e5).toISOString().slice(0,10);
await q("insert into daily(day,player_id,ev,mark) values($1,$3,'lj',7.5),($1,$4,'lj',7.1),($2,$3,'100',11.2),($2,$4,'100',10.9),($5,$3,'pv',5.5),($6,$3,'hj',2.0),($6,$4,'hj',2.0)",[day(2),day(3),A.player.id,B.player.id,day(0),day(4)]);
await q("update daily set made_at=now()-interval '1 hour' where day=$1 and player_id=$2",[day(4),A.player.id]);
const pa=(await call2(null,{player:A.player.id})).daily_wins, pb=(await call2(null,{player:B.player.id})).daily_wins, pc=(await call2(null,{player:C.player.id})).daily_wins;
console.log('  desafíos ganados: Ana',pa,'Beto',pb,'Caro',pc);
ok(pa===2&&pb===1&&pc===0,'desafíos ganados (empate: el que lo hizo primero; el de hoy no cuenta todavía)');
console.log(fails?fails+' FALLAS':'OK');
process.exit(0);
