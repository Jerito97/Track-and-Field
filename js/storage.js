// localStorage wrapper, players (profiles) and records
export const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
// art style: the game uses stickmen drawn in code. The drawn characters (image pieces and animation strips under
// assets/characters/) are kept but switched off: set stick to false to bring them back (their images then load too).
export const STYLE={stick:true};

// ---- players ----
// Players on this device. A player registered on the server (unique name + 4-6 digit code) has the server's id and a
// session token; one made without connection is local only (token null) until it's protected with a code.
// {id, name, color, token, created, rec:{evId:best, tour:points},
// best:{evId:[{v,date}, ...top 5]}, history:[{ev,mark,place,of,mode,date}, ...newest first], tours:[{pts,place,date}]}
const KEY='odb-players', HISTORY_MAX=200, TOP=5;
export const COLORS=['#e8262d','#2f6fe0','#ffd23a','#1f9e54','#8e4fd6','#ff7a1a','#2bc4e0','#ff5fa2','#8bd13a','#8a5a3b','#1c2a55','#2b2c2d'];
const DB=(()=>{ const d=store.get(KEY,null); return d&&Array.isArray(d.list)?d:{list:[],cur:null}; })();
const save=()=>store.set(KEY,DB);
// one-time resets: the triple jump and the hammer (later the high jump and the shot put) start from scratch once published (the marks they had were tests
// made while they were being tried out). Each player keeps the ids of the resets already done (new players: all)
const RESETS=[{id:'tj-ham-1',evs:['tj','ham']},{id:'hj-sp-1',evs:['hj','sp']},{id:'swim-1',evs:['crawl','breast','fly']},{id:'4x100-1',evs:['4x100']},{id:'4x100-2',evs:['4x100']},{id:'laser-cycle-1',evs:['laser','cycle']}];
DB.list.forEach(p=>{ const done=p.resets||[];
  RESETS.forEach(r=>{ if(done.includes(r.id)) return;
    r.evs.forEach(e=>{ delete p.rec[e]; if(p.best) delete p.best[e]; if(p.sent) delete p.sent[e]; if(p.pb) delete p.pb[e]; if(p.psent) Object.keys(p.psent).forEach(k=>{ if(k.startsWith(e+'|')) delete p.psent[k]; }); });
    p.history=(p.history||[]).filter(h=>!r.evs.includes(h.ev)); });
  p.resets=RESETS.map(r=>r.id); });
if(DB.list.length) save();
const newId=()=>{ try{ return globalThis.crypto.randomUUID(); }catch(e){ return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); } };
export const players=()=>DB.list;
export const player=()=>DB.list.find(p=>p.id===DB.cur)||null;
// records of the current player (live: reassigned when the player changes)
export let rec={};
const bind=()=>{ const p=player(); rec=p?p.rec:{}; };
bind();
export const saveRec=save;
// remote: {id, token} from the server (register / login); without it the player is local only
export function createPlayer(name,color,remote){
  // logging in again on this device with a player that's already here: just refresh it
  const same=remote&&DB.list.find(p=>p.id===remote.id);
  if(same){ Object.assign(same,{name,color,token:remote.token}); DB.cur=same.id; save(); bind(); return same; }
  const p={id:remote?remote.id:newId(),name,color,token:remote?remote.token:null,created:Date.now(),rec:{},best:{},history:[],tours:[],resets:RESETS.map(r=>r.id)};
  // the first player takes over the records kept before there were players
  if(!DB.list.length){ const old=store.get('odb-rec3',null); if(old) Object.assign(p.rec,old); }
  DB.list.push(p); DB.cur=p.id; save(); bind(); return p;
}
export function switchPlayer(id){ if(DB.list.some(p=>p.id===id)){ DB.cur=id; save(); bind(); } }
// a local player now protected on the server: takes the server's id and token
// (another account: its records go up again; the same account already on this device: both merge into one)
export function linkPlayer(remote){ const p=player(); if(!p) return;
  if(p.id!==remote.id) p.sent={};
  const twin=DB.list.find(q=>q!==p&&q.id===remote.id);
  if(twin){ p.history=p.history.concat(twin.history).sort((a,b)=>b.date-a.date).slice(0,HISTORY_MAX); p.tours=p.tours.concat(twin.tours);
    Object.entries(twin.rec).forEach(([k,v])=>{ const sprint=k==='100'||k==='110h'; if(p.rec[k]==null||(k==='tour'?v>p.rec[k]:better(sprint,v,p.rec[k]))) p.rec[k]=v; });
    Object.entries(twin.best).forEach(([k,l])=>{ p.best[k]=(p.best[k]||[]).concat(l); });
    DB.list=DB.list.filter(q=>q!==twin); }
  Object.assign(p,{id:remote.id,name:remote.name,color:remote.color,token:remote.token,expired:false}); DB.cur=p.id; save(); bind(); }
// best marks kept on the server (logging in on another phone or app): the better of each stays as personal record
export function mergeMarks(marks,evs){ const p=player(); if(!p||!Array.isArray(marks)) return;
  marks.forEach(m=>{
    if(m.ev==='surv'||m.ev==='survm'){ const k=m.ev, b=survBestKey(k);
      if(Number.isFinite(m.mark)&&(p.rec[k]==null||m.mark>p.rec[k])){ p.rec[k]=m.mark; p[b]={pts:m.mark,rounds:m.rounds||0,date:Date.parse(m.date)||Date.now()}; }
      if(Number.isFinite(m.mark)) p.sent={...p.sent,[k]:Math.max(m.mark,p.rec[k])===m.mark?m.mark:p.sent?.[k]}; return; }
    const ev=evs.find(e=>e.id===m.ev); if(!ev||!Number.isFinite(m.mark)) return;
    const sprint=ev.type==='sprint', date=Date.parse(m.date)||Date.now(), list=p.best[ev.id]||[];
    if(!list.some(b=>b.v===m.mark)){ list.push({v:m.mark,date}); list.sort((x,y)=>sprint?x.v-y.v:y.v-x.v); p.best[ev.id]=list.slice(0,TOP); }
    if(p.rec[ev.id]==null||better(sprint,m.mark,p.rec[ev.id])) p.rec[ev.id]=m.mark;
    p.sent={...p.sent,[ev.id]:m.mark}; });  // what the server has: only a better local record is sent again
  save(); }
// records wiped out on the server (wipes: [{id, ev, player_id (null: everyone), at}]): what the players here kept of
// that event from before then goes (marks made since stay, and the best of them is the record again), so the old
// one doesn't keep blocking new ones from being sent. The last one applied is kept on this device
export const lastWipe=()=>store.get('odb-wipe',0);
export function applyWipes(wipes){
  if(!wipes.length) return false;
  wipes.forEach(w=>{ const at=Date.parse(w.at)||Date.now(), ev=w.ev;
    DB.list.filter(p=>!w.player_id||p.id===w.player_id).forEach(p=>{
      if(ev==='surv'||ev==='survm'){ const k=survBestKey(ev), b=p[k]; if(!b||!(b.date>=at)){ delete p[k]; delete p.rec[ev]; } }
      else { const l=(p.best[ev]||[]).filter(b=>b.date>=at); if(l.length){ p.best[ev]=l; p.rec[ev]=l[0].v; } else { delete p.best[ev]; delete p.rec[ev]; } }
      if(p.sent) delete p.sent[ev];
      const pb=p.pb&&p.pb[ev]; if(pb) ['y','m'].forEach(s=>{ if(pb[s]&&!(pb[s].date>=at)) delete pb[s]; });
      if(p.psent) Object.keys(p.psent).forEach(k=>{ if(k.startsWith(ev+'|')) delete p.psent[k]; }); }); });
  save(); store.set('odb-wipe',Math.max(lastWipe(),...wipes.map(w=>w.id))); return true;
}
export function updatePlayer(fields){ const p=player(); if(!p) return; Object.assign(p,fields); save(); }
export function deletePlayer(id){ DB.list=DB.list.filter(p=>p.id!==id); if(DB.cur===id) DB.cur=DB.list[0]?.id||null; save(); bind(); }
const better=(sprint,a,b)=>sprint?a<b:a>b;
// the year and the month a moment belongs to, in Argentina's time (UTC-3), as the server counts them: ['2026', '2026-10']
export const periods=t=>{ const d=new Date(t-3*3600000), y=String(d.getUTCFullYear()); return [y,y+'-'+String(d.getUTCMonth()+1).padStart(2,'0')]; };
// your best of this year and this month in an event (pb[ev] = {y:{k,v,date,rounds}, m:{...}}); returns which improved
function periodBest(p,id,mark,sprint,rounds){
  const now=Date.now(), [y,m]=periods(now), pb=(p.pb||(p.pb={}))[id]||(p.pb[id]={}), out={};
  [['y',y],['m',m]].forEach(([s,k])=>{ const o=pb[s]; if(!o||o.k!==k||better(sprint,mark,o.v)){ pb[s]={k,v:mark,date:now,rounds}; out[s]=true; } });
  return out;
}
// what the last event improved, for the end of the event (this year's / this month's best)
export let lastPeriods={};
// an event finished: history, top 5 and personal record; returns true for a new personal record
export function recordEvent(ev,mark,place,of,mode){
  const p=player(); if(!p) return false;
  p.history.unshift({ev:ev.id,mark,place,of,mode,date:Date.now()}); p.history.length=Math.min(p.history.length,HISTORY_MAX);
  lastPeriods={};
  if(mark==null){ save(); return false; }
  const sprint=ev.type==='sprint', list=(p.best[ev.id]||[]).concat({v:mark,date:Date.now()});
  list.sort((x,y)=>sprint?x.v-y.v:y.v-x.v); p.best[ev.id]=list.slice(0,TOP);
  const isRec=p.rec[ev.id]==null||better(sprint,mark,p.rec[ev.id]); if(isRec) p.rec[ev.id]=mark;
  lastPeriods=periodBest(p,ev.id,mark,sprint);
  save(); return isRec;
}
// survival's best run of each mode (id: 'surv' the classic one, 'survm' the modern one): its points, rounds, date
export const survBestKey=id=>id==='survm'?'survmBest':'survBest';
// a survival run ended: best points (and how many rounds it got through); returns true for a new best
export function recordSurv(pts,rounds,id='surv'){ const p=player(); if(!p) return false;
  const best=pts>0&&(p.rec[id]==null||pts>p.rec[id]); if(best){ p.rec[id]=pts; p[survBestKey(id)]={pts,rounds,date:Date.now()}; }
  if(pts>0) periodBest(p,id,pts,false,rounds); save(); return best; }
export function recordTour(pts,place){ const p=player(); if(!p) return;
  p.tours.unshift({pts,place,date:Date.now()}); if(pts>(p.rec.tour||0)) p.rec.tour=pts; save(); }
// world record of an event: the best mark of any player on this device (machines don't count), with who set it
export function worldRec(ev){ let best=null;
  DB.list.forEach(p=>{ const v=p.rec[ev.id]; if(v!=null&&(!best||better(ev.type==='sprint',v,best.v))) best={v,name:p.name}; });
  return best; }
