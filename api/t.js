// Players and online tournaments (Vercel function, Neon Postgres). One endpoint, /api/t:
//   GET  /api/t?code=K7Q4                                   -> {tournament, entries, results}
//   POST {action:'check', name}                             -> {exists}
//   POST {action:'register', name, pin, color}              -> {player:{id,name,color}, token}
//   POST {action:'login', name, pin}                        -> {player, token, marks:[{ev,mark,date}]}  (your best marks)
//   POST {action:'update', token, name?, color?}            -> {player}
//   POST {action:'create', token, name, events, days}       -> {code}   (days: 1, 3 or 7, how long it stays open)
//   POST {action:'repeat', token, code, events, days}       -> {code}   (a finished one again, with the same players in)
//   POST {action:'close', token, code}                      -> {ok}     (only who created it)
//   POST {action:'mytours', token}                          -> {tours:[{tournament, entries, results}]}
//   POST {action:'join', token, code}                       -> {ok}
//   POST {action:'result', token, code, ev, mark}           -> {ok}
//   GET  /api/t?top=100                                     -> {top:[{player_id,name,color,mark,date,rounds}, ...10]}  (top=surv: survival)
//   POST {action:'marks', token, list:[{ev,mark,date,rounds}]} -> {ok}  (your marks for the world top 10; ev 'surv' / 'survm': survival points, classic / modern)
//   GET  /api/t?top=100&friends=PLAYER                      -> {top:[...the best 10 of that player and their friends]}  (friends' board)
//   GET  /api/t?top=100&me=PLAYER                           -> also {me:{...their row, rank}} when they're not in the 10
//   GET  /api/t?top=100&span=year|month[&friends=PLAYER]    -> the same for this year / this month (Argentina's time)
//   POST {action:'friends', token}                          -> {friends:[{id,name,color}]}
//   POST {action:'fadd'|'fdel', token, player}              -> {ok}   (add a registered player to your friends / take them off)
//   POST {action:'admin', token, op, ...}                   -> admin tools (only the admin player, see below)
//   GET  /api/t?players=1                                   -> {players:[{id,name,color,created_at,marks}]}
//   GET  /api/t?player=ID                                   -> {player:{id,name,color,created_at}, marks:[{ev,mark,date,rank}]}
// Names are unique (ignoring case and accents); each player has a 4-6 digit code (stored as a salted scrypt hash).
// Login returns a token the game keeps; tournament actions need it, so nobody can play under someone else's name.
// Each login is a new session: every phone (or browser, or installed app) keeps its own token and stays logged in.
// World top 10 per event: each player's best mark (one row per player and event), with the day it was made.
// Groups: friends compare their records among themselves (the same boards, only the group's members).
// Everyone plays each tournament event once, whenever they want; standings are computed by the game.
// A tournament ends when everyone played every event, when its time is up, or when who created it closes it;
// then nobody can join or play any more (events not played count 0).
// The database URL comes from the Neon integration (DATABASE_URL); tables are created on first use.
import {Buffer} from 'node:buffer';
import {createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

const EVENTS=['100','lj','110h','pv','jav','tj','ham','hj','sp','crawl','breast','fly','4x100','laser','cycle'];
const SPRINT=['100','110h','crawl','breast','fly','4x100','laser','cycle'];  // lower is better (times)
// plausible marks per event (anything outside is rejected; null = foul / disqualified)
const RANGE={'100':[4,60],'110h':[5,90],lj:[0,25],pv:[0,15],jav:[0,250],tj:[0,45],ham:[0,250],hj:[0,5],sp:[0,60],crawl:[8,200],breast:[8,200],fly:[8,200],'4x100':[15,300],laser:[20,300],cycle:[20,200]};
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no 0/O, 1/I
const MAX_PLAYERS=30, MAX_FAILS=5, LOCK_MIN=10, MAX_FRIENDS=200;

let sql=null, ready=null;
function db(){
  if(!sql){ const url=process.env.DATABASE_URL||process.env.POSTGRES_URL; if(!url) throw new Error('no database configured'); sql=neon(url); }
  if(!ready) ready=(async()=>{
    await sql`create table if not exists users(id text primary key, name text not null, name_key text not null unique,
      color text not null, pin_salt text not null, pin_hash text not null, token_hash text not null,
      fails int not null default 0, locked_until timestamptz, created_at timestamptz not null default now())`;
    await sql`create table if not exists tournaments(code text primary key, name text not null, events text not null,
      host_id text not null, created_at timestamptz not null default now())`;
    await sql`alter table tournaments add column if not exists ends_at timestamptz`;
    await sql`alter table tournaments add column if not exists closed_at timestamptz`;
    await sql`alter table tournaments add column if not exists close_reason text`;
    await sql`create table if not exists entries(code text not null references tournaments(code) on delete cascade,
      player_id text not null, name text not null, color text not null, joined_at timestamptz not null default now(),
      primary key(code,player_id))`;
    // who put a player in (invited from the game; null: joined with the code, or the host)
    await sql`alter table entries add column if not exists invited_by text`;
    await sql`create table if not exists results(code text not null references tournaments(code) on delete cascade,
      player_id text not null, ev text not null, mark double precision, created_at timestamptz not null default now(),
      primary key(code,player_id,ev))`;
    await sql`create table if not exists sessions(token_hash text primary key, user_id text not null references users(id) on delete cascade,
      created_at timestamptz not null default now())`;
    await sql`create table if not exists marks(player_id text not null references users(id) on delete cascade, ev text not null,
      mark double precision not null, made_at timestamptz not null default now(), primary key(player_id,ev))`;
    await sql`alter table marks add column if not exists rounds int`;
    await sql`alter table users add column if not exists admin boolean not null default false`;
    await sql`create table if not exists groups(id text primary key, name text not null, owner_id text not null, created_at timestamptz not null default now())`;
    await sql`create table if not exists group_members(group_id text not null references groups(id) on delete cascade,
      player_id text not null references users(id) on delete cascade, added_at timestamptz not null default now(), primary key(group_id,player_id))`;
    // friends: each player's list (one way: adding someone doesn't need their yes); their boards are you and them
    await sql`create table if not exists friends(player_id text not null references users(id) on delete cascade,
      friend_id text not null references users(id) on delete cascade, added_at timestamptz not null default now(), primary key(player_id,friend_id))`;
    // each player's best of each year and of each month (period '2026', '2026-10'), for the boards of this year and month
    await sql`create table if not exists pmarks(player_id text not null references users(id) on delete cascade, ev text not null,
      period text not null, mark double precision not null, made_at timestamptz not null default now(), rounds int, primary key(player_id,ev,period))`;
    // one-time resets, each run once ever: the triple jump and the hammer (and later the high jump and the shot put) start from scratch once published (the marks
    // they had were tests made while they were being tried out)
    // the daily challenge: each player's one go at the day's event (mark null: fouled, or left / closed halfway)
    await sql`create table if not exists daily(day text not null, player_id text not null references users(id) on delete cascade,
      ev text not null, mark double precision, made_at timestamptz not null default now(), primary key(day,player_id))`;
    // each day's event, kept the first time it's asked for (a change in how it's drawn can't change a day under way)
    await sql`create table if not exists daily_ev(day text primary key, ev text not null)`;
    // records wiped out (one player's, or everyone's with player_id null): each phone clears what it kept of them
    // made before «at» (else it would keep the old one as its record and never send a new, worse one)
    await sql`create table if not exists wipes(id serial primary key, ev text not null, player_id text, at timestamptz not null default now())`;
    await sql`create table if not exists migrations(id text primary key, done_at timestamptz not null default now())`;
    if((await sql`insert into migrations(id) values('reset-tj-ham-1') on conflict do nothing returning id`).length)
      await sql`delete from marks where ev in ('tj','ham')`;
    // the same for the high jump and the shot put
    if((await sql`insert into migrations(id) values('reset-hj-sp-1') on conflict do nothing returning id`).length){
      await sql`delete from marks where ev in ('hj','sp')`; await sql`delete from pmarks where ev in ('hj','sp')`; }
    // and swimming
    if((await sql`insert into migrations(id) values('reset-swim-1') on conflict do nothing returning id`).length){
      await sql`delete from marks where ev in ('crawl','breast','fly')`; await sql`delete from pmarks where ev in ('crawl','breast','fly')`; }
    if((await sql`insert into migrations(id) values('reset-4x100-1') on conflict do nothing returning id`).length){
      await sql`delete from marks where ev='4x100'`; await sql`delete from pmarks where ev='4x100'`; }
    // again once the change gave the next runner half the speed plus a boost (the marks before were easier)
    if((await sql`insert into migrations(id) values('reset-4x100-2') on conflict do nothing returning id`).length){
      await sql`delete from marks where ev='4x100'`; await sql`delete from pmarks where ev='4x100'`; }
    // 21/10/2026's challenge started over: the versions put up that night each drew a different event for it
    if((await sql`insert into migrations(id) values('reset-daily-2026-10-21') on conflict do nothing returning id`).length)
      await sql`delete from daily where day='2026-10-21'`;
    // the groups gave way to friends: everyone in a group gets the others in it as friends
    if((await sql`insert into migrations(id) values('groups-to-friends-1') on conflict do nothing returning id`).length)
      await sql`insert into friends(player_id,friend_id) select a.player_id,b.player_id from group_members a join group_members b on a.group_id=b.group_id and a.player_id<>b.player_id on conflict do nothing`;
    // the boards agree once: each period's best has the all-time marks made in it, the all-time has every period's best
    if((await sql`insert into migrations(id) values('boards-agree-1') on conflict do nothing returning id`).length){
      for(const m of await sql`select player_id,ev,mark,made_at,rounds from marks`) for(const pk of periods(m.made_at)){
        if(SPRINT.includes(m.ev)) await sql`insert into pmarks(player_id,ev,period,mark,made_at,rounds) values(${m.player_id},${m.ev},${pk},${m.mark},${m.made_at},${m.rounds})
          on conflict(player_id,ev,period) do update set mark=excluded.mark, made_at=excluded.made_at where excluded.mark<pmarks.mark`;
        else await sql`insert into pmarks(player_id,ev,period,mark,made_at,rounds) values(${m.player_id},${m.ev},${pk},${m.mark},${m.made_at},${m.rounds})
          on conflict(player_id,ev,period) do update set mark=excluded.mark, made_at=excluded.made_at, rounds=excluded.rounds where excluded.mark>pmarks.mark`; }
      for(const m of await sql`select player_id,ev,mark,made_at,rounds from pmarks`){
        if(SPRINT.includes(m.ev)) await sql`insert into marks(player_id,ev,mark,made_at,rounds) values(${m.player_id},${m.ev},${m.mark},${m.made_at},${m.rounds})
          on conflict(player_id,ev) do update set mark=excluded.mark, made_at=excluded.made_at where excluded.mark<marks.mark`;
        else await sql`insert into marks(player_id,ev,mark,made_at,rounds) values(${m.player_id},${m.ev},${m.mark},${m.made_at},${m.rounds})
          on conflict(player_id,ev) do update set mark=excluded.mark, made_at=excluded.made_at, rounds=excluded.rounds where excluded.mark>marks.mark`; } }
    // pole vault started over (the records cleared before lived on in the phones and in this year's / month's boards)
    if((await sql`insert into migrations(id) values('reset-pv-2') on conflict do nothing returning id`).length) await wipe(sql,'pv',null);
  })().catch(e=>{ ready=null; throw e; });
  return ready.then(()=>sql);
}

// a new tournament (its host already in): valid events, 1, 3 or 7 days; returns its code
async function newTournament(sql,u,name,evs,d){
  const events=[...new Set((Array.isArray(evs)?evs:[]).filter(e=>EVENTS.includes(e)))];
  if(!events.length) throw new Bad(400,'Elegí al menos una prueba.');
  const days=[1,3,7].includes(Number(d))?Number(d):1, ends=new Date(Date.now()+days*86400000).toISOString();
  for(let i=0;i<8;i++){
    const code=newCode();
    const ins=await sql`insert into tournaments(code,name,events,host_id,ends_at) values(${code},${name},${events.join(',')},${u.id},${ends}) on conflict do nothing returning code`;
    if(ins.length){ await sql`insert into entries(code,player_id,name,color) values(${code},${u.id},${u.name},${u.color})`; return code; }
  }
  throw new Bad(500,'No se pudo generar un código.');
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
  const h=sha(String(token));
  // sessions; users.token_hash holds the session of players made before there were several
  const u=(await sql`select u.* from sessions s join users u on u.id=s.user_id where s.token_hash=${h}`)[0]
    ||(await sql`select * from users where token_hash=${h}`)[0];
  if(!u) throw new Bad(401,'Tu sesión venció: entrá de nuevo con tu código.');
  return u;
}
// tournaments made before there were deadlines stay open a week
const pubT=t=>({...t,events:t.events.split(','),ends_at:t.ends_at,
  finished:!!t.closed_at||new Date(t.ends_at)<=new Date(), reason:t.close_reason||(t.closed_at?'host':new Date(t.ends_at)<=new Date()?'time':null)});
async function getT(sql,code){
  const t=(await sql`select code,name,events,host_id,created_at,closed_at,close_reason,coalesce(ends_at,created_at+interval '7 days') as ends_at from tournaments where code=${code}`)[0];
  return t?pubT(t):null;
}
async function view(sql,code){
  const t=await getT(sql,code);
  if(!t) return null;
  // current name and colour of each player (they can change them in their profile)
  const entries=await sql`select e.player_id, coalesce(u.name,e.name) as name, coalesce(u.color,e.color) as color, e.joined_at
    from entries e left join users u on u.id=e.player_id where e.code=${code} order by e.joined_at`;
  const results=await sql`select player_id,ev,mark,created_at from results where code=${code}`;
  return {tournament:t,entries,results};
}
// every tournament a player is in (newest first), with its players and results
async function myTours(sql,u){
  const ts=await sql`select t.code,t.name,t.events,t.host_id,t.created_at,t.closed_at,t.close_reason,coalesce(t.ends_at,t.created_at+interval '7 days') as ends_at
    from tournaments t join entries me on me.code=t.code and me.player_id=${u.id} order by t.created_at desc limit 60`;
  if(!ts.length) return {tours:[]};
  const codes=ts.map(t=>t.code);
  const entries=await sql`select e.code,e.player_id, coalesce(u.name,e.name) as name, coalesce(u.color,e.color) as color, e.joined_at,
    (select name from users i where i.id=e.invited_by) as invited_by
    from entries e left join users u on u.id=e.player_id where e.code = any(${codes}) order by e.joined_at`;
  const results=await sql`select code,player_id,ev,mark,created_at from results where code = any(${codes})`;
  return {tours:ts.map(t=>({tournament:pubT(t),entries:entries.filter(e=>e.code===t.code),results:results.filter(r=>r.code===t.code)}))};
}

// survival ('surv' the classic one, 'survm' the modern one): the best run's points, with the rounds it got through
const SURVS=['surv','survm'];
const okMark=(ev,m)=>SURVS.includes(ev)?Number.isInteger(m)&&m>=0&&m<=10000000:EVENTS.includes(ev)&&Number.isFinite(m)&&m>=RANGE[ev][0]&&m<=RANGE[ev][1];
// Admin: one player, by id. The first time the player named ADMIN_NAME (Jero) asks, and there's no admin yet, that
// player becomes it for good: renaming later keeps it, and someone new taking the name doesn't get it.
const ADMIN_NAME='jero';
async function isAdmin(sql,u){
  if(u.admin) return true;
  if(u.name_key!==ADMIN_NAME) return false;
  if((await sql`select 1 from users where admin`).length) return false;
  await sql`update users set admin=true where id=${u.id}`; return true;
}
async function adminOp(sql,b){
  const u=await auth(sql,b.token), admin=await isAdmin(sql,u);
  // asking whether you are one is not an error either way (the game asks every player once)
  if(b.op==='check') return {ok:true,admin};
  if(!admin) throw new Bad(403,'No tenés permiso.');
  const pid=String(b.player||'').slice(0,64);
  const target=async()=>{ const t=(await sql`select id,name,admin from users where id=${pid}`)[0]; if(!t) throw new Bad(404,'No existe ese jugador.'); return t; };
  switch(b.op){
    case 'stats': {
      const [r]=await sql`select (select count(*)::int from users) as players, (select count(*)::int from marks where not (ev = any(${SURVS}))) as marks,
        (select count(*)::int from tournaments) as tournaments, (select count(*)::int from tournaments where closed_at is null and coalesce(ends_at,created_at+interval '7 days')>now()) as open_tournaments,
        (select count(*)::int from friends) as friends, (select count(*)::int from users where created_at>now()-interval '7 days') as new_week`;
      return {stats:r};
    }
    case 'users': {
      const users=await sql`select u.id,u.name,u.color,u.created_at,u.admin,u.locked_until>now() as locked,u.fails,
        (select count(*)::int from sessions s where s.user_id=u.id) as sessions,
        coalesce((select json_agg(json_build_object('ev',m.ev,'mark',m.mark)) from marks m where m.player_id=u.id),'[]') as marks
        from users u order by lower(u.name)`;
      return {users};
    }
    // forgot the code: a new one (4-6 digits); also unlocks
    case 'setpin': { const t=await target(); if(!okPin(b.pin)) throw new Bad(400,'El código tiene que ser de 4 a 6 números.');
      const salt=randomBytes(16).toString('hex');
      await sql`update users set pin_salt=${salt}, pin_hash=${pinHash(b.pin,salt)}, fails=0, locked_until=null where id=${t.id}`; return {ok:true}; }
    case 'unlock': { const t=await target(); await sql`update users set fails=0, locked_until=null where id=${t.id}`; return {ok:true}; }
    // closes every session of the player (each phone has to enter with the code again)
    case 'logout': { const t=await target(); await sql`delete from sessions where user_id=${t.id}`; await sql`update users set token_hash=${'x'+randomUUID()} where id=${t.id}`; return {ok:true}; }
    case 'rename': { const t=await target(), name=cleanName(b.name); checkName(name);
      const up=await sql`update users set name=${name}, name_key=${nameKey(name)} where id=${t.id}
        and not exists(select 1 from users where name_key=${nameKey(name)} and id<>${t.id}) returning id`;
      if(!up.length) throw new Bad(409,'Ese nombre ya está usado.'); return {ok:true}; }
    case 'delmark': { const t=await target(), ev=String(b.ev||''); await wipe(sql,ev,t.id); return {ok:true}; }
    // every record of an event, everyone's
    case 'wipeev': { const ev=String(b.ev||''); if(!EVENTS.includes(ev)&&!SURVS.includes(ev)) throw new Bad(400,'Prueba desconocida.'); await wipe(sql,ev,null); return {ok:true}; }
    case 'deluser': { const t=await target(); if(t.admin) throw new Bad(400,'No podés borrar al administrador.');
      await sql`delete from users where id=${t.id}`;
      // their groups (from before friends): to the next member, and groups left empty go
      await sql`update groups g set owner_id=(select player_id from group_members m where m.group_id=g.id order by added_at limit 1) where owner_id=${t.id}`;
      await sql`delete from groups g where not exists(select 1 from group_members m where m.group_id=g.id)`;
      return {ok:true}; }
  }
  throw new Bad(400,'Acción desconocida.');
}

// world top 10, or (group) every member of a group with a mark
// the year and the month a moment belongs to, in Argentina's time (UTC-3): ['2026', '2026-10']
const periods=t=>{ const d=new Date(new Date(t).getTime()-3*3600000), y=String(d.getUTCFullYear()); return [y,y+'-'+String(d.getUTCMonth()+1).padStart(2,'0')]; };
async function top(sql,ev,fof,span,me){
  // the top 10: the world's, or a player's friends board (fof: the player: them and their friends); me: a player
  // whose own row comes too, with their place, when it's not among the 10
  const ids=fof?[fof,...(await sql`select friend_id from friends where player_id=${fof}`).map(r=>r.friend_id)]:null, n=10;
  // every board checks the others: a mark in the all-time one made this year (or month) is in this year's (month's)
  // too, and the all-time one has the best of a player even if it only reached a period's board
  const all=await sql`select m.player_id,u.name,u.color,m.mark,m.made_at as date,m.rounds from marks m join users u on u.id=m.player_id where m.ev=${ev}`;
  const per=await sql`select m.player_id,u.name,u.color,m.mark,m.made_at as date,m.rounds,m.period from pmarks m join users u on u.id=m.player_id where m.ev=${ev}`;
  // (a period's board: every mark made in it, wherever it was kept)
  const k=span==='year'?0:span==='month'?1:-1, now=k<0?null:periods(Date.now())[k];
  const rows=all.concat(per).filter(r=>k<0||periods(r.date)[k]===now);
  const sp=SPRINT.includes(ev), better=(a,b)=>(sp?a.mark-b.mark:b.mark-a.mark)||new Date(a.date)-new Date(b.date), best=new Map();
  rows.forEach(r=>{ if(ids&&!ids.includes(r.player_id)) return; const o=best.get(r.player_id); if(!o||better(r,o)<0) best.set(r.player_id,r); });
  const all2=[...best.values()].sort(better), clean=({period,...r})=>r, i=me?all2.findIndex(r=>r.player_id===me):-1;
  // (their place: one more than how many have a better mark; a tie shares it)
  const mine=i>=n?{...clean(all2[i]),rank:1+all2.filter(r=>sp?r.mark<all2[i].mark:r.mark>all2[i].mark).length}:null;
  return {top:all2.slice(0,n).map(clean),me:mine};
}
// wipe an event's records: one player's, or everyone's (player null); the world, this year's and this month's boards,
// and a note so each phone clears its own
async function wipe(sql,ev,pid){
  if(pid){ await sql`delete from marks where player_id=${pid} and ev=${ev}`; await sql`delete from pmarks where player_id=${pid} and ev=${ev}`; }
  else { await sql`delete from marks where ev=${ev}`; await sql`delete from pmarks where ev=${ev}`; }
  await sql`insert into wipes(ev,player_id) values(${ev},${pid})`;
}
// the world record holder of each event (and survival): who and the mark (on a tie, whoever made it first)
async function leaders(sql){
  const t=await sql`select distinct on (m.ev) m.ev,m.player_id,u.name,m.mark from marks m join users u on u.id=m.player_id
    where m.ev = any(${SPRINT}) order by m.ev, m.mark asc, m.made_at asc`;
  const f=await sql`select distinct on (m.ev) m.ev,m.player_id,u.name,m.mark from marks m join users u on u.id=m.player_id
    where not (m.ev = any(${SPRINT})) order by m.ev, m.mark desc, m.made_at asc`;
  return {leaders:[...t,...f]};
}
// The daily challenge: one event a day, the same for everyone, one go each. Days run in Argentina's time (UTC-3: a new
// one at midnight there). Each day's event is drawn at random (from the date, so it's the same for everyone) among
// the ones that weren't in the last FRESH days
const dayOf=(t=Date.now())=>new Date(t-3*3600e3).toISOString().slice(0,10);
const DAY0=Math.round(Date.parse('2026-10-01T00:00:00Z')/864e5), FRESH=5;
// a number in [0,1) from a day's number (the same every time)
function dayRnd(n,k=0){ let a=(n*374761393+k*668265263)|0; a=Math.imul(a^(a>>>13),1274126177); a^=a>>>16; return (a>>>0)/4294967296; }
function dailyEv(day){
  const n=Math.round(Date.parse(day+'T00:00:00Z')/864e5);
  // day by day from DAY0: each one drawn among the events not in the last FRESH days
  const last=[]; let ev=EVENTS[0];
  for(let d=Math.min(DAY0,n);d<=n;d++){ const ok=EVENTS.filter(e=>!last.includes(e)); ev=ok[Math.floor(dayRnd(d)*ok.length)]; last.push(ev); if(last.length>FRESH) last.shift(); }
  return ev;
}
// the day's event as kept. The first time it's drawn and kept: among the events that weren't in the FRESH days before
// (those as kept, or as they'd be drawn if nobody asked for them), so adding an event changes only the days to come
async function dayEv(sql,day){
  const kept=(await sql`select ev from daily_ev where day=${day}`)[0]; if(kept) return kept.ev;
  const n=Math.round(Date.parse(day+'T00:00:00Z')/864e5), prev=[];
  for(let k=1;k<=FRESH;k++) prev.push(new Date((n-k)*864e5).toISOString().slice(0,10));
  const had=new Map((await sql`select day,ev from daily_ev where day = any(${prev})`).map(r=>[r.day,r.ev]));
  const last=prev.map(d=>had.get(d)||dailyEv(d)), ok=EVENTS.filter(e=>!last.includes(e));
  await sql`insert into daily_ev(day,ev) values(${day},${ok[Math.floor(dayRnd(n)*ok.length)]}) on conflict do nothing`;
  return (await sql`select ev from daily_ev where day=${day}`)[0].ev;
}
// a day's board: everyone who played it, best first (fouls last), each one's place
async function dailyBoard(sql,day,ev){
  const rows=await sql`select d.player_id,u.name,u.color,d.mark,d.made_at from daily d join users u on u.id=d.player_id where d.day=${day}`;
  const sp=SPRINT.includes(ev);
  rows.sort((a,b)=>a.mark==null?(b.mark==null?0:1):b.mark==null?-1:(sp?a.mark-b.mark:b.mark-a.mark)||new Date(a.made_at)-new Date(b.made_at));
  return rows;
}
// today's challenge (and how yesterday's went); with a player: their go, place and streak (days in a row played)
async function daily(sql,pid){
  const day=dayOf(), yday=dayOf(Date.now()-864e5), yev=await dayEv(sql,yday), ev=await dayEv(sql,day);
  const ends=new Date(Date.parse(day+'T00:00:00Z')+(24+3)*3600e3).toISOString();
  const top=await dailyBoard(sql,day,ev), yb=await dailyBoard(sql,yday,yev);
  const out={day,ev,ends_at:ends,count:top.length,top:top.slice(0,50),yday:{day:yday,ev:yev,count:yb.length,winner:yb[0]&&yb[0].mark!=null?yb[0]:null}};
  if(pid){ const i=top.findIndex(r=>r.player_id===pid), yi=yb.findIndex(r=>r.player_id===pid);
    const days=(await sql`select day from daily where player_id=${pid} order by day desc limit 400`).map(r=>r.day);
    let streak=0, d=days[0]===day?day:yday; for(const x of days){ if(x!==d) break; streak++; d=dayOf(Date.parse(d+'T12:00:00Z')+3*3600e3-864e5); }
    out.me={played:i>=0,mark:i>=0?top[i].mark:null,place:i>=0&&top[i].mark!=null?i+1:null,streak};
    out.yday.me=yi>=0?{mark:yb[yi].mark,place:yb[yi].mark!=null?yi+1:null}:null; }
  return out;
}
// your friends (name and colour), in the order you added them
async function myFriends(sql,u){
  return {friends:await sql`select u.id,u.name,u.color from friends f join users u on u.id=f.friend_id where f.player_id=${u.id} order by f.added_at`};
}

// everyone registered (newest first), and one player's public profile: best mark per event and its place in the world
async function people(sql){
  const players=await sql`select u.id,u.name,u.color,u.created_at,(select count(*)::int from marks m where m.player_id=u.id and not (m.ev = any(${SURVS}))) as marks
    from users u order by u.created_at desc limit 500`;
  return {players};
}
// (its place in the world: as the world top 10 has it, a tie going to whoever made it first)
async function profile(sql,id){
  const u=(await sql`select id,name,color,created_at from users where id=${id}`)[0];
  if(!u) throw new Bad(404,'No existe ese jugador.');
  const marks=await sql`select m.ev,m.mark,m.made_at as date,m.rounds,
    1+(select count(*)::int from marks o where o.ev=m.ev and ((case when m.ev = any(${SPRINT}) then o.mark<m.mark else o.mark>m.mark end)
      or o.mark=m.mark and o.made_at<m.made_at)) as rank
    from marks m where m.player_id=${id}`;
  // daily challenges won: days already over that they played where nobody beat their mark (a tie: who made it first)
  const days=await sql`select day,ev,player_id,mark,made_at from daily where mark is not null and day<${dayOf()}
    and day in (select day from daily where player_id=${id} and mark is not null)`, win=new Map();
  days.forEach(r=>{ const o=win.get(r.day), sp=SPRINT.includes(r.ev); if(!o||(sp?r.mark<o.mark:r.mark>o.mark)||r.mark===o.mark&&new Date(r.made_at)<new Date(o.made_at)) win.set(r.day,r); });
  return {player:u,marks,daily_wins:[...win.values()].filter(r=>r.player_id===id).length};
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
      await sql`insert into sessions(token_hash,user_id) values(${sha(token)},${id})`;
      return {player:pub(ins[0]),token};
    }
    case 'login': {
      const u=(await sql`select * from users where name_key=${nameKey(b.name)}`)[0];
      if(!u) throw new Bad(404,'No existe ese jugador.');
      // the attempt is counted first, in one step in the database, so many requests at once can't get around the lock
      const att=(await sql`update users set fails=case when locked_until is not null and locked_until<=now() then 1 else fails+1 end, locked_until=null
        where id=${u.id} and (locked_until is null or locked_until<=now()) returning fails`)[0];
      const locked=`Demasiados intentos. Probá de nuevo en ${LOCK_MIN} minutos.`;
      if(!att) throw new Bad(429,locked);
      const lockNow=()=>sql`update users set fails=0, locked_until=${new Date(Date.now()+LOCK_MIN*60000).toISOString()} where id=${u.id}`;
      if(att.fails>MAX_FAILS){ await lockNow(); throw new Bad(429,locked); }
      const got=Buffer.from(pinHash(String(b.pin||''),u.pin_salt),'hex'), want=Buffer.from(u.pin_hash,'hex');
      if(!okPin(b.pin)||!timingSafeEqual(got,want)){
        const left=MAX_FAILS-att.fails;
        if(left<=0){ await lockNow(); throw new Bad(403,`Código incorrecto. Probá de nuevo en ${LOCK_MIN} minutos.`); }
        throw new Bad(403,`Código incorrecto (te ${left===1?'queda 1 intento':`quedan ${left} intentos`}).`);
      }
      // a new session per login; the other phones keep theirs
      const token=randomBytes(24).toString('base64url');
      await sql`update users set fails=0, locked_until=null where id=${u.id}`;
      await sql`insert into sessions(token_hash,user_id) values(${sha(token)},${u.id})`;
      const marks=await sql`select ev,mark,made_at as date,rounds from marks where player_id=${u.id}`;
      return {player:pub(u),token,marks};
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
      return {code:await newTournament(sql,u,String(b.name||'').trim().slice(0,30)||`Torneo de ${u.name}`,b.events,b.days)};
    }
    // play a finished tournament again: same name, the events and length chosen now, and everyone who was in it
    // already in (no code to pass around)
    case 'repeat': {
      const u=await auth(sql,b.token), old=cleanCode(b.code);
      const t=(await sql`select name from tournaments where code=${old}`)[0]; if(!t) throw new Bad(404,'No existe ese torneo.');
      if(!(await sql`select 1 from entries where code=${old} and player_id=${u.id}`).length) throw new Bad(403,'No estabas en ese torneo.');
      const code=await newTournament(sql,u,t.name,b.events,b.days);
      const others=await sql`select u.id,u.name,u.color from entries e join users u on u.id=e.player_id where e.code=${old} and e.player_id<>${u.id} limit ${MAX_PLAYERS-1}`;
      for(const p of others) await sql`insert into entries(code,player_id,name,color) values(${code},${p.id},${p.name},${p.color}) on conflict do nothing`;
      return {code};
    }
    case 'marks': {
      // only a better mark replaces the one kept; the date is the day it was made (sent by the game, never in the future)
      const u=await auth(sql,b.token), list=(Array.isArray(b.list)?b.list:[]).slice(0,40);
      for(const it of list){
        const ev=String(it?.ev||''), mark=Number(it?.mark); if(!okMark(ev,mark)) continue;
        const d=new Date(Number(it.date)||Date.now()), when=(d>new Date()||d<new Date('2025-01-01')?new Date():d).toISOString();
        const rounds=SURVS.includes(ev)?Math.max(0,Math.min(10000,Math.floor(Number(it.rounds)||0))):null;
        if(SPRINT.includes(ev)) await sql`insert into marks(player_id,ev,mark,made_at) values(${u.id},${ev},${mark},${when})
          on conflict(player_id,ev) do update set mark=excluded.mark, made_at=excluded.made_at where excluded.mark<marks.mark`;
        else await sql`insert into marks(player_id,ev,mark,made_at,rounds) values(${u.id},${ev},${mark},${when},${rounds})
          on conflict(player_id,ev) do update set mark=excluded.mark, made_at=excluded.made_at, rounds=excluded.rounds where excluded.mark>marks.mark`;
        // and the best of that year and that month (a mark can be one without being an all-time record)
        for(const per of periods(when)){
          if(SPRINT.includes(ev)) await sql`insert into pmarks(player_id,ev,period,mark,made_at) values(${u.id},${ev},${per},${mark},${when})
            on conflict(player_id,ev,period) do update set mark=excluded.mark, made_at=excluded.made_at where excluded.mark<pmarks.mark`;
          else await sql`insert into pmarks(player_id,ev,period,mark,made_at,rounds) values(${u.id},${ev},${per},${mark},${when},${rounds})
            on conflict(player_id,ev,period) do update set mark=excluded.mark, made_at=excluded.made_at, rounds=excluded.rounds where excluded.mark>pmarks.mark`;
        }
      }
      return {ok:true};
    }
    case 'mytours': return myTours(sql,await auth(sql,b.token));
    case 'friends': return myFriends(sql,await auth(sql,b.token));
    case 'admin': return adminOp(sql,b);
    // add someone to your friends, or take them off
    case 'fadd': case 'fdel': {
      const u=await auth(sql,b.token), pid=String(b.player||'').slice(0,64);
      if(b.action==='fdel'){ await sql`delete from friends where player_id=${u.id} and friend_id=${pid}`; return {ok:true}; }
      if(pid===u.id) throw new Bad(400,'No te podés agregar a vos.');
      if(!(await sql`select 1 from users where id=${pid}`).length) throw new Bad(404,'No existe ese jugador.');
      const ins=await sql`insert into friends(player_id,friend_id) select ${u.id},${pid}
        where (select count(*) from friends where player_id=${u.id})<${MAX_FRIENDS} on conflict do nothing returning friend_id`;
      if(!ins.length&&!(await sql`select 1 from friends where player_id=${u.id} and friend_id=${pid}`).length) throw new Bad(409,`Podés tener hasta ${MAX_FRIENDS} amigos.`);
      return {ok:true};
    }
    // put a registered player in a tournament (anyone in it, while it's on and there's room): it shows in their notices
    case 'invite': {
      const u=await auth(sql,b.token), code=cleanCode(b.code), t=await getT(sql,code); if(!t) throw new Bad(404,'No existe ese torneo.');
      if(t.finished) throw new Bad(409,'Este torneo ya terminó.');
      if(!(await sql`select 1 from entries where code=${code} and player_id=${u.id}`).length) throw new Bad(403,'No estás en este torneo.');
      const p=(await sql`select id,name,color from users where id=${String(b.player||'').slice(0,64)}`)[0]; if(!p) throw new Bad(404,'No existe ese jugador.');
      const ins=await sql`insert into entries(code,player_id,name,color,invited_by) select ${code},${p.id},${p.name},${p.color},${u.id}
        where (select count(*) from entries where code=${code})<${MAX_PLAYERS} on conflict do nothing returning player_id`;
      if(!ins.length&&!(await sql`select 1 from entries where code=${code} and player_id=${p.id}`).length) throw new Bad(409,'El torneo está lleno.');
      return {ok:true};
    }
    // the daily challenge: start (the one go is used: leaving halfway is a foul), then the mark (once, for that day)
    case 'daily': {
      const u=await auth(sql,b.token), day=dayOf(), ev=await dayEv(sql,day);
      if(b.step==='start'){ if(String(b.ev)!==ev) throw new Bad(409,'El desafío de hoy es otra prueba.');
        const ins=await sql`insert into daily(day,player_id,ev) values(${day},${u.id},${ev}) on conflict do nothing returning day`;
        if(!ins.length) throw new Bad(409,'Ya jugaste el desafío de hoy.');
        return {ok:true,day}; }
      // the mark: for the day it was started (it may have ended meanwhile), only while it's still empty
      const d=String(b.day||''), mark=b.mark==null?null:Number(b.mark);
      const row=(await sql`select ev,mark from daily where day=${d} and player_id=${u.id}`)[0]; if(!row) throw new Bad(404,'No empezaste ese desafío.');
      if(mark!=null&&!(Number.isFinite(mark)&&mark>=RANGE[row.ev][0]&&mark<=RANGE[row.ev][1])) throw new Bad(400,'Marca imposible.');
      await sql`update daily set mark=${mark}, made_at=now() where day=${d} and player_id=${u.id} and mark is null`;
      return {ok:true};
    }
    case 'close': {
      const u=await auth(sql,b.token), t=await getT(sql,cleanCode(b.code)); if(!t) throw new Bad(404,'No existe ese torneo.');
      if(t.host_id!==u.id) throw new Bad(403,'Solo quien creó el torneo lo puede terminar.');
      if(!t.finished) await sql`update tournaments set closed_at=now(), close_reason='host' where code=${t.code}`;
      return {ok:true};
    }
    case 'join': case 'result': {
      const u=await auth(sql,b.token), code=cleanCode(b.code); if(!code) throw new Bad(400,'Falta el código.');
      const t=await getT(sql,code); if(!t) throw new Bad(404,'No existe ese torneo.');
      const inT=(await sql`select 1 from entries where code=${code} and player_id=${u.id}`).length>0;
      if(b.action==='join'){
        if(!inT&&t.finished) throw new Bad(409,'Este torneo ya terminó.');
        // only while there's room (checked in the same step, so two joining at once can't go over)
        if(!inT){ const ins=await sql`insert into entries(code,player_id,name,color) select ${code},${u.id},${u.name},${u.color}
            where (select count(*) from entries where code=${code})<${MAX_PLAYERS} on conflict do nothing returning player_id`;
          if(!ins.length) throw new Bad(409,'El torneo está lleno.'); }
        return {ok:true};
      }
      const ev=String(b.ev||''); if(!t.events.includes(ev)) throw new Bad(400,'Esa prueba no está en el torneo.');
      const mark=b.mark==null?null:Number(b.mark), r=RANGE[ev];
      if(mark!=null&&!(Number.isFinite(mark)&&mark>=r[0]&&mark<=r[1])) throw new Bad(400,'Marca imposible.');
      if(!inT) throw new Bad(403,'No estás en este torneo.');
      if(t.finished) throw new Bad(409,'El torneo ya terminó.');
      // one go per event: the first result stays
      const ins=await sql`insert into results(code,player_id,ev,mark) values(${code},${u.id},${ev},${mark}) on conflict do nothing returning ev`;
      if(!ins.length) throw new Bad(409,'Ya jugaste esta prueba.');
      // it doesn't close when everyone in it has played: someone may still join; it ends at its time, or when its host ends it
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
      if(req.query.players!=null) return res.status(200).json(await people(sql));
      if(req.query.leaders!=null) return res.status(200).json(await leaders(sql));
      if(req.query.wipes!=null) return res.status(200).json({wipes:await sql`select id,ev,player_id,at from wipes where id>${Math.max(0,Math.floor(Number(req.query.after)||0))} order by id limit 200`});
      if(req.query.daily!=null) return res.status(200).json(await daily(sql,req.query.player?String(req.query.player).slice(0,64):null));
      if(req.query.player!=null) return res.status(200).json(await profile(sql,String(req.query.player).slice(0,64)));
      if(req.query.top!=null){ const ev=String(req.query.top); if(!EVENTS.includes(ev)&&!SURVS.includes(ev)) throw new Bad(400,'Prueba desconocida.'); return res.status(200).json(await top(sql,ev,req.query.friends?String(req.query.friends).slice(0,64):null,String(req.query.span||''),req.query.me?String(req.query.me).slice(0,64):null)); }
      const code=cleanCode(req.query.code); if(!code) throw new Bad(400,'Falta el código.');
      const v=await view(sql,code); if(!v) throw new Bad(404,'No existe ese torneo.');
      return res.status(200).json(v);
    }
    if(req.method!=='POST') throw new Bad(405,'Método no permitido.');
    const b=(typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body)||{};
    return res.status(200).json(await act(sql,b));
  }catch(e){
    if(e instanceof Bad) return res.status(e.status).json({error:e.message});
    // two requests at once taking the same name: the database refuses the second one
    if(e?.code==='23505') return res.status(409).json({error:'Ese nombre ya está usado.'});
    console.error(e);
    return res.status(500).json({error:e.message==='no database configured'?'Falta conectar la base de datos.':'Error del servidor.'});
  }
}
