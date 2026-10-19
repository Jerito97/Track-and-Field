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
  const p={id:remote?remote.id:newId(),name,color,token:remote?remote.token:null,created:Date.now(),rec:{},best:{},history:[],tours:[]};
  // the first player takes over the records kept before there were players
  if(!DB.list.length){ const old=store.get('odb-rec3',null); if(old) Object.assign(p.rec,old); }
  DB.list.push(p); DB.cur=p.id; save(); bind(); return p;
}
export function switchPlayer(id){ if(DB.list.some(p=>p.id===id)){ DB.cur=id; save(); bind(); } }
// a local player now protected on the server: takes the server's id and token
export function linkPlayer(remote){ const p=player(); if(!p) return; Object.assign(p,{id:remote.id,name:remote.name,color:remote.color,token:remote.token,expired:false}); DB.cur=p.id; save(); bind(); }
// best marks kept on the server (logging in on another phone or app): the better of each stays as personal record
export function mergeMarks(marks,evs){ const p=player(); if(!p||!Array.isArray(marks)) return;
  marks.forEach(m=>{ const ev=evs.find(e=>e.id===m.ev); if(!ev||!Number.isFinite(m.mark)) return;
    const sprint=ev.type==='sprint', date=Date.parse(m.date)||Date.now(), list=p.best[ev.id]||[];
    if(!list.some(b=>b.v===m.mark)){ list.push({v:m.mark,date}); list.sort((x,y)=>sprint?x.v-y.v:y.v-x.v); p.best[ev.id]=list.slice(0,TOP); }
    if(p.rec[ev.id]==null||better(sprint,m.mark,p.rec[ev.id])) p.rec[ev.id]=m.mark;
    p.sent={...p.sent,[ev.id]:m.mark}; });  // what the server has: only a better local record is sent again
  save(); }
export function updatePlayer(fields){ const p=player(); if(!p) return; Object.assign(p,fields); save(); }
export function deletePlayer(id){ DB.list=DB.list.filter(p=>p.id!==id); if(DB.cur===id) DB.cur=DB.list[0]?.id||null; save(); bind(); }
const better=(sprint,a,b)=>sprint?a<b:a>b;
// an event finished: history, top 5 and personal record; returns true for a new personal record
export function recordEvent(ev,mark,place,of,mode){
  const p=player(); if(!p) return false;
  p.history.unshift({ev:ev.id,mark,place,of,mode,date:Date.now()}); p.history.length=Math.min(p.history.length,HISTORY_MAX);
  if(mark==null){ save(); return false; }
  const sprint=ev.type==='sprint', list=(p.best[ev.id]||[]).concat({v:mark,date:Date.now()});
  list.sort((x,y)=>sprint?x.v-y.v:y.v-x.v); p.best[ev.id]=list.slice(0,TOP);
  const isRec=p.rec[ev.id]==null||better(sprint,mark,p.rec[ev.id]); if(isRec) p.rec[ev.id]=mark;
  save(); return isRec;
}
export function recordTour(pts,place){ const p=player(); if(!p) return;
  p.tours.unshift({pts,place,date:Date.now()}); if(pts>(p.rec.tour||0)) p.rec.tour=pts; save(); }
// world record of an event: the best mark of any player on this device (machines don't count), with who set it
export function worldRec(ev){ let best=null;
  DB.list.forEach(p=>{ const v=p.rec[ev.id]; if(v!=null&&(!best||better(ev.type==='sprint',v,best.v))) best={v,name:p.name}; });
  return best; }
