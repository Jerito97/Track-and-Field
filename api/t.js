// Players and online tournaments (Vercel function, Neon Postgres). One endpoint, /api/t:
//   GET  /api/t?code=K7Q4                                   -> {tournament, entries, results}
//   POST {action:'check', name}                             -> {exists}
//   POST {action:'register', name, pin, color}              -> {player:{id,name,color}, token}
//   POST {action:'login', name, pin}                        -> {player, token}
//   POST {action:'update', token, name?, color?}            -> {player}
//   POST {action:'create', token, name, events}             -> {code}
//   POST {action:'join', token, code}                       -> {ok}
//   POST {action:'result', token, code, ev, mark}           -> {ok}
//   GET  /api/t?top=100                                     -> {top:[{player_id,name,color,mark,date}, ...10]}
//   POST {action:'marks', token, list:[{ev,mark,date}]}     -> {ok}   (your marks, for the world top 10)
// Names are unique (ignoring case and accents); each player has a 4-6 digit code (stored as a salted scrypt hash).
// Login returns a token the game keeps; tournament actions need it, so nobody can play under someone else's name.
// World top 10 per event: each player's best mark (one row per player and event), with the day it was made.
// Everyone plays each tournament event once, whenever they want; standings are computed by the game.
// The database URL comes from the Neon integration (DATABASE_URL); tables are created on first use.
import {Buffer} from 'node:buffer';
import {createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

const EVENTS=['100','lj','110h','pv','jav'];
const SPRINT=['100','110h'];  // lower is better
// plausible marks per event (anything outside is rejected; null = foul / disqualified)
const RANGE={'100':[4,60],'110h':[5,90],lj:[0,25],pv:[0,15],jav:[0,250]};
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no 0/O, 1/I
const MAX_PLAYERS=30, MAX_FAILS=5, LOCK_MIN=10;

let sql=null, ready=null;
function db(){
  if(!sql){ const url=process.env.DATABASE_URL||process.env.POSTGRES_URL; if(!url) throw new Error('no database configured'); sql=neon(url); }
  if(!ready) ready=(async()=>{
    await sql`create table if not exists users(id text primary key, name text not null, name_key text not null unique,
      color text not null, pin_salt text not null, pin_hash text not null, token_hash text not null,
      fails int not null default 0, locked_until timestamptz, created_at timestamptz not null default now())`;
    await sql`create table if not exists tournaments(code text primary key, name text not null, events text not null,
      host_id text not null, created_at timestamptz not null default now())`;
    await sql`create table if not exists entries(code text not null references tournaments(code) on delete cascade,
      player_id text not null, name text not null, color text not null, joined_at timestamptz not null default now(),
      primary key(code,player_id))`;
    await sql`create table if not exists results(code text not null references tournaments(code) on delete cascade,
      player_id text not null, ev text not null, mark double precision, created_at timestamptz not null default now(),
      primary key(code,player_id,ev))`;
    await sql`create table if not exists marks(player_id text not null references users(id) on delete cascade, ev text not null,
      mark double precision not null, made_at timestamptz not null default now(), primary key(player_id,ev))`;
  })().catch(e=>{ ready=null; throw e; });
  return ready.then(()=>sql);
}

class Bad extends Error{ constructor(status,msg){ super(msg); this.status=status; } }
const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
const cleanName=n=>String(n||'').replace(/\s+/g,' ').trim().slice(0,14);
// "Jero", "jero" and "JÉRO" are the same name
const nameKey=n=>cleanName(n).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const okColor=c=>/^#[0-9a-fA-F]{6}$/.test(String(c||''));
const okPin=p=>/^\d{4,6}$/.test(String(p||''));
const sha=s=>createHash('sha256').update(s).digest('hex');
const pinHash=(pin,salt)=>scryptSync(String(pin),salt,32).toString('hex');
const newCode=()=>Array.from({length:5},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join('');
const pub=u=>({id:u.id,name:u.name,color:u.color});
function checkName(name){ if(name.length<2) throw new Bad(400,'El nombre tiene que tener al menos 2 letras.'); if(!/[\p{L}\p{N}]/u.test(name)) throw new Bad(400,'Nombre inválido.'); }

async function auth(sql,token){
  if(!token) throw new Bad(401,'Tenés que entrar con tu jugador.');
  const u=(await sql`select * from users where token_hash=${sha(String(token))}`)[0];
  if(!u) throw new Bad(401,'Tu sesión venció: entrá de nuevo con tu código.');
  return u;
}
async function view(sql,code){
  const t=(await sql`select code,name,events,host_id,created_at from tournaments where code=${code}`)[0];
  if(!t) return null;
  // current name and colour of each player (they can change them in their profile)
  const entries=await sql`select e.player_id, coalesce(u.name,e.name) as name, coalesce(u.color,e.color) as color, e.joined_at
    from entries e left join users u on u.id=e.player_id where e.code=${code} order by e.joined_at`;
  const results=await sql`select player_id,ev,mark,created_at from results where code=${code}`;
  return {tournament:{...t,events:t.events.split(',')},entries,results};
}

const okMark=(ev,m)=>EVENTS.includes(ev)&&Number.isFinite(m)&&m>=RANGE[ev][0]&&m<=RANGE[ev][1];
async function top(sql,ev){
  const rows=SPRINT.includes(ev)
    ?await sql`select m.player_id,u.name,u.color,m.mark,m.made_at as date from marks m join users u on u.id=m.player_id where m.ev=${ev} order by m.mark asc, m.made_at asc limit 10`
    :await sql`select m.player_id,u.name,u.color,m.mark,m.made_at as date from marks m join users u on u.id=m.player_id where m.ev=${ev} order by m.mark desc, m.made_at asc limit 10`;
  return {top:rows};
}

async function act(sql,b){
  switch(b.action){
    case 'check': { const k=nameKey(b.name); if(!k) throw new Bad(400,'Escribí un nombre.');
      return {exists:(await sql`select 1 from users where name_key=${k}`).length>0}; }
    case 'register': {
      const name=cleanName(b.name); checkName(name);
      if(!okPin(b.pin)) throw new Bad(400,'El código tiene que ser de 4 a 6 números.');
      if(!okColor(b.color)) throw new Bad(400,'Color inválido.');
      const id=randomUUID(), salt=randomBytes(16).toString('hex'), token=randomBytes(24).toString('base64url');
      const ins=await sql`insert into users(id,name,name_key,color,pin_salt,pin_hash,token_hash)
        values(${id},${name},${nameKey(name)},${b.color},${salt},${pinHash(b.pin,salt)},${sha(token)}) on conflict(name_key) do nothing returning *`;
      if(!ins.length) throw new Bad(409,'Ese nombre ya está usado.');
      return {player:pub(ins[0]),token};
    }
    case 'login': {
      const u=(await sql`select * from users where name_key=${nameKey(b.name)}`)[0];
      if(!u) throw new Bad(404,'No existe ese jugador.');
      if(u.locked_until&&new Date(u.locked_until)>new Date()) throw new Bad(429,`Demasiados intentos. Probá de nuevo en ${LOCK_MIN} minutos.`);
      const got=Buffer.from(pinHash(String(b.pin||''),u.pin_salt),'hex'), want=Buffer.from(u.pin_hash,'hex');
      if(!okPin(b.pin)||!timingSafeEqual(got,want)){
        const fails=u.fails+1, lock=fails>=MAX_FAILS;
        await sql`update users set fails=${lock?0:fails}, locked_until=${lock?new Date(Date.now()+LOCK_MIN*60000).toISOString():null} where id=${u.id}`;
        throw new Bad(403,lock?`Código incorrecto. Probá de nuevo en ${LOCK_MIN} minutos.`:`Código incorrecto (te ${MAX_FAILS-fails===1?'queda 1 intento':`quedan ${MAX_FAILS-fails} intentos`}).`);
      }
      // a fresh token per login; earlier devices keep theirs until the next login
      const token=randomBytes(24).toString('base64url');
      await sql`update users set fails=0, locked_until=null, token_hash=${sha(token)} where id=${u.id}`;
      return {player:pub(u),token};
    }
    case 'update': {
      const u=await auth(sql,b.token); let name=u.name, color=u.color;
      if(b.name!=null){ name=cleanName(b.name); checkName(name); }
      if(b.color!=null){ if(!okColor(b.color)) throw new Bad(400,'Color inválido.'); color=b.color; }
      const up=await sql`update users set name=${name}, name_key=${nameKey(name)}, color=${color} where id=${u.id}
        and not exists(select 1 from users where name_key=${nameKey(name)} and id<>${u.id}) returning *`;
      if(!up.length) throw new Bad(409,'Ese nombre ya está usado.');
      return {player:pub(up[0])};
    }
    case 'create': {
      const u=await auth(sql,b.token);
      const events=[...new Set((Array.isArray(b.events)?b.events:[]).filter(e=>EVENTS.includes(e)))];
      if(!events.length) throw new Bad(400,'Elegí al menos una prueba.');
      const name=String(b.name||'').trim().slice(0,30)||`Torneo de ${u.name}`;
      for(let i=0;i<8;i++){
        const code=newCode();
        const ins=await sql`insert into tournaments(code,name,events,host_id) values(${code},${name},${events.join(',')},${u.id}) on conflict do nothing returning code`;
        if(ins.length){ await sql`insert into entries(code,player_id,name,color) values(${code},${u.id},${u.name},${u.color})`; return {code}; }
      }
      throw new Bad(500,'No se pudo generar un código.');
    }
    case 'marks': {
      // only a better mark replaces the one kept; the date is the day it was made (sent by the game, never in the future)
      const u=await auth(sql,b.token), list=(Array.isArray(b.list)?b.list:[]).slice(0,20);
      for(const it of list){
        const ev=String(it?.ev||''), mark=Number(it?.mark); if(!okMark(ev,mark)) continue;
        const d=new Date(Number(it.date)||Date.now()), when=(d>new Date()||d<new Date('2025-01-01')?new Date():d).toISOString();
        if(SPRINT.includes(ev)) await sql`insert into marks(player_id,ev,mark,made_at) values(${u.id},${ev},${mark},${when})
          on conflict(player_id,ev) do update set mark=excluded.mark, made_at=excluded.made_at where excluded.mark<marks.mark`;
        else await sql`insert into marks(player_id,ev,mark,made_at) values(${u.id},${ev},${mark},${when})
          on conflict(player_id,ev) do update set mark=excluded.mark, made_at=excluded.made_at where excluded.mark>marks.mark`;
      }
      return {ok:true};
    }
    case 'join': case 'result': {
      const u=await auth(sql,b.token), code=cleanCode(b.code); if(!code) throw new Bad(400,'Falta el código.');
      const t=(await sql`select events from tournaments where code=${code}`)[0]; if(!t) throw new Bad(404,'No existe ese torneo.');
      const inT=(await sql`select 1 from entries where code=${code} and player_id=${u.id}`).length>0;
      if(b.action==='join'){
        if(!inT){ const n=(await sql`select count(*)::int as n from entries where code=${code}`)[0].n; if(n>=MAX_PLAYERS) throw new Bad(409,'El torneo está lleno.');
          await sql`insert into entries(code,player_id,name,color) values(${code},${u.id},${u.name},${u.color}) on conflict do nothing`; }
        return {ok:true};
      }
      const ev=String(b.ev||''); if(!t.events.split(',').includes(ev)) throw new Bad(400,'Esa prueba no está en el torneo.');
      const mark=b.mark==null?null:Number(b.mark), r=RANGE[ev];
      if(mark!=null&&!(Number.isFinite(mark)&&mark>=r[0]&&mark<=r[1])) throw new Bad(400,'Marca imposible.');
      if(!inT) throw new Bad(403,'No estás en este torneo.');
      // one go per event: the first result stays
      const ins=await sql`insert into results(code,player_id,ev,mark) values(${code},${u.id},${ev},${mark}) on conflict do nothing returning ev`;
      if(!ins.length) throw new Bad(409,'Ya jugaste esta prueba.');
      return {ok:true};
    }
  }
  throw new Bad(400,'Acción desconocida.');
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const sql=await db();
    if(req.method==='GET'){
      if(req.query.top!=null){ const ev=String(req.query.top); if(!EVENTS.includes(ev)) throw new Bad(400,'Prueba desconocida.'); return res.status(200).json(await top(sql,ev)); }
      const code=cleanCode(req.query.code); if(!code) throw new Bad(400,'Falta el código.');
      const v=await view(sql,code); if(!v) throw new Bad(404,'No existe ese torneo.');
      return res.status(200).json(v);
    }
    if(req.method!=='POST') throw new Bad(405,'Método no permitido.');
    const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    return res.status(200).json(await act(sql,b));
  }catch(e){
    if(e instanceof Bad) return res.status(e.status).json({error:e.message});
    console.error(e);
    return res.status(500).json({error:e.message==='no database configured'?'Falta conectar la base de datos.':'Error del servidor.'});
  }
}
