// Online tournaments (Vercel function, Neon Postgres). One endpoint, /api/t:
//   GET  /api/t?code=K7Q4                       -> {tournament, entries, results}
//   POST /api/t {action:'create', name, events, player}        -> {code}
//   POST /api/t {action:'join', code, player}                  -> {ok}
//   POST /api/t {action:'result', code, player, ev, mark}      -> {ok}
// player = {id, name, color}. Everyone plays each event once, whenever they want; standings are computed by the game.
// The database URL comes from the Neon integration (DATABASE_URL); tables are created on first use.
import {neon} from '@neondatabase/serverless';

const EVENTS=['100','lj','110h','pv','jav'];
// plausible marks per event (anything outside is rejected; null = foul / disqualified)
const RANGE={'100':[4,60],'110h':[5,90],lj:[0,25],pv:[0,15],jav:[0,250]};
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no 0/O, 1/I
const MAX_PLAYERS=30;

let sql=null, ready=null;
function db(){
  if(!sql){ const url=process.env.DATABASE_URL||process.env.POSTGRES_URL; if(!url) throw new Error('no database configured'); sql=neon(url); }
  if(!ready) ready=(async()=>{
    await sql`create table if not exists tournaments(code text primary key, name text not null, events text not null,
      host_id text not null, created_at timestamptz not null default now())`;
    await sql`create table if not exists entries(code text not null references tournaments(code) on delete cascade,
      player_id text not null, name text not null, color text not null, joined_at timestamptz not null default now(),
      primary key(code,player_id))`;
    await sql`create table if not exists results(code text not null references tournaments(code) on delete cascade,
      player_id text not null, ev text not null, mark double precision, created_at timestamptz not null default now(),
      primary key(code,player_id,ev))`;
  })().catch(e=>{ ready=null; throw e; });
  return ready.then(()=>sql);
}

const bad=(res,status,error)=>res.status(status).json({error});
const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
function cleanPlayer(p){
  if(!p||typeof p!=='object') return null;
  const id=String(p.id||'').slice(0,64), name=String(p.name||'').trim().slice(0,14), color=String(p.color||'');
  if(!id||!name||!/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  return {id,name,color};
}
const newCode=()=>Array.from({length:5},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join('');

async function view(sql,code){
  const t=(await sql`select code,name,events,host_id,created_at from tournaments where code=${code}`)[0];
  if(!t) return null;
  const entries=await sql`select player_id,name,color,joined_at from entries where code=${code} order by joined_at`;
  const results=await sql`select player_id,ev,mark,created_at from results where code=${code}`;
  return {tournament:{...t,events:t.events.split(',')},entries,results};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const sql=await db();
    if(req.method==='GET'){
      const code=cleanCode(req.query.code); if(!code) return bad(res,400,'falta el código');
      const v=await view(sql,code); return v?res.status(200).json(v):bad(res,404,'no existe ese torneo');
    }
    if(req.method!=='POST') return bad(res,405,'método no permitido');
    const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const player=cleanPlayer(b.player); if(!player) return bad(res,400,'jugador inválido');
    if(b.action==='create'){
      const events=(Array.isArray(b.events)?b.events:[]).filter(e=>EVENTS.includes(e));
      if(!events.length) return bad(res,400,'elegí al menos una prueba');
      const name=String(b.name||'').trim().slice(0,30)||`Torneo de ${player.name}`;
      for(let i=0;i<8;i++){
        const code=newCode();
        const ins=await sql`insert into tournaments(code,name,events,host_id) values(${code},${name},${[...new Set(events)].join(',')},${player.id}) on conflict do nothing returning code`;
        if(ins.length){ await sql`insert into entries(code,player_id,name,color) values(${code},${player.id},${player.name},${player.color})`; return res.status(200).json({code}); }
      }
      return bad(res,500,'no se pudo generar un código');
    }
    const code=cleanCode(b.code); if(!code) return bad(res,400,'falta el código');
    const t=(await sql`select events from tournaments where code=${code}`)[0]; if(!t) return bad(res,404,'no existe ese torneo');
    if(b.action==='join'){
      const n=(await sql`select count(*)::int as n from entries where code=${code}`)[0].n;
      const there=(await sql`select 1 from entries where code=${code} and player_id=${player.id}`).length>0;
      if(!there&&n>=MAX_PLAYERS) return bad(res,409,'el torneo está lleno');
      // joining again updates your name and colour
      await sql`insert into entries(code,player_id,name,color) values(${code},${player.id},${player.name},${player.color})
        on conflict(code,player_id) do update set name=excluded.name, color=excluded.color`;
      return res.status(200).json({ok:true});
    }
    if(b.action==='result'){
      const ev=String(b.ev||''); if(!t.events.split(',').includes(ev)) return bad(res,400,'esa prueba no está en el torneo');
      const mark=b.mark==null?null:Number(b.mark), r=RANGE[ev];
      if(mark!=null&&!(Number.isFinite(mark)&&mark>=r[0]&&mark<=r[1])) return bad(res,400,'marca imposible');
      const inT=(await sql`select 1 from entries where code=${code} and player_id=${player.id}`).length>0;
      if(!inT) return bad(res,403,'no estás en este torneo');
      // one go per event: the first result stays
      const ins=await sql`insert into results(code,player_id,ev,mark) values(${code},${player.id},${ev},${mark}) on conflict do nothing returning ev`;
      return ins.length?res.status(200).json({ok:true}):bad(res,409,'ya jugaste esta prueba');
    }
    return bad(res,400,'acción desconocida');
  }catch(e){
    console.error(e);
    return bad(res,500,e.message==='no database configured'?'falta conectar la base de datos':'error del servidor');
  }
}
