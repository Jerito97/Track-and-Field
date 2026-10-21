// Notices (the bell on the main menu): a tournament someone put you in (invited you, or repeated one) that you haven't
// played yet, a tournament of yours that ended (where you finished), and a world record of yours that someone beat.
// Worked out on this phone from what the server says now against what it said the last time; kept per player on this
// phone (the last 30).
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {getLeaders,getMyTours,myTournaments} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player,store} from '../storage.js';
import {standings} from './online.js';
import {esc,showOv} from './screens.js';

const card=(logo,title,body)=>`<div class="card n-card"><div class="head"><div class="logo">${logo}</div><h2>${title}</h2></div><div class="body">${body}</div></div>`;
const KEY=()=>'odb-notifs-'+(player()?.id||'');
const load=()=>({list:[],wr:null,ended:null,at:0,...store.get(KEY(),{})});
const save=d=>store.set(KEY(),d);
export const unread=()=>load().list.filter(n=>!n.read).length;
const add=(d,n)=>{ if(d.list.some(x=>x.id===n.id)) return; d.list.unshift({...n,at:Date.now(),read:false}); d.list=d.list.slice(0,30); };
// asked at most once a minute (the menu is opened often)
const EVERY=60000;
let busy=false;

// asks the server and adds what's new; true if something was added
export async function checkNotifs(){
  const p=player(); if(!p?.token||busy||Date.now()-load().at<EVERY) return false;
  busy=true;
  try{
    const [lead,tours]=await Promise.all([getLeaders(),getMyTours()]);
    if(player()?.id!==p.id) return false;
    const d=load(), before=d.list.length; d.at=Date.now();
    // world records: the ones that were yours last time and now are someone else's (the first time, nothing: it
    // only learns which ones are yours)
    const mine=lead.filter(l=>l.player_id===p.id).map(l=>l.ev);
    (d.wr||[]).forEach(ev=>{ const l=lead.find(x=>x.ev===ev); if(!l||l.player_id===p.id) return;
      add(d,{id:`wr-${ev}-${l.player_id}-${l.mark}`,k:'wr',ev,who:l.name,mark:l.mark}); });
    d.wr=mine;
    // tournaments: one you're in without having made it or joined it from this phone (someone repeated one you were
    // in), nothing played yet; one that ended where you played (the ones already over the first time, not)
    const own=new Set(myTournaments()), ended=new Set(d.ended||[]), first=d.ended==null;
    tours.forEach(x=>{ const t=x.tournament, played=x.results.some(r=>r.player_id===p.id);
      if(!t.finished){ if(!played&&t.host_id!==p.id&&!own.has(t.code)) add(d,{id:'tn-'+t.code,k:'tn',code:t.code,name:t.name,evs:t.events.length,by:(x.entries.find(e=>e.player_id===p.id)||{}).invited_by||null}); return; }
      if(ended.has(t.code)) return; ended.add(t.code);
      if(first||!played) return;
      const rows=standings(x), i=rows.findIndex(r=>r.player_id===p.id);
      add(d,{id:'te-'+t.code,k:'te',code:t.code,name:t.name,place:i+1,of:rows.length}); });
    d.ended=[...ended].slice(-80);
    save(d); return d.list.length>before;
  } catch(e){ return false; }
  finally{ busy=false; }
}

const evOf=id=>id==='surv'?{id,name:'Supervivencia clásica',surv:true}:id==='survm'?{id,name:'Supervivencia moderna',surv:true}:EVENTS.find(e=>e.id===id);
function text(n){
  if(n.k==='wr'){ const ev=evOf(n.ev); if(!ev) return '';
    return `<b>${esc(n.who)}</b> te superó el récord mundial de <b>${esc(ev.name)}</b>: ${ev.surv?`${n.mark} pts`:fmt(ev,n.mark)}`; }
  if(n.k==='tn') return `${n.by?`<b>${esc(n.by)}</b> te invitó a`:'Te sumaron a'} <b>${esc(n.name)}</b>: ${n.evs===1?'tenés 1 prueba':`tenés ${n.evs} pruebas`} por jugar`;
  if(n.k==='te') return `Terminó <b>${esc(n.name)}</b>: ${n.place===1?'¡ganaste!':`quedaste ${n.place}º de ${n.of}`}`;
  return '';
}
// where a notice takes you: the tournament, or the event's world records
function act(n){
  if(n.k==='wr'){ const i=n.ev==='surv'?EVENTS.length:n.ev==='survm'?EVENTS.length+1:EVENTS.findIndex(e=>e.id===n.ev); return `data-act="board" data-i="${i}" data-back="notifs"`; }
  return `data-act="oopen" data-code="${esc(n.code)}"`;
}
const icon=n=>n.k==='wr'?'🏆':n.k==='te'?'🏁':'📣';
const ago=t=>{ const m=(Date.now()-t)/60000; return m<60?`hace ${Math.max(1,Math.round(m))} min`:m<1440?`hace ${Math.round(m/60)} h`:`hace ${Math.round(m/1440)} d`; };
// the list (opening it marks them all as seen)
export function showNotifs(){
  setS(null); setScreen('menu');
  const d=load(), list=d.list.filter(n=>text(n));
  showOv(card('AVISOS','Novedades',`
    ${list.length?`<div class="n-list">${list.map(n=>`<button class="n-item${n.read?'':' new'}" ${act(n)}><span class="n-ic" aria-hidden="true">${icon(n)}</span><span class="n-tx"><span>${text(n)}</span><small>${ago(n.at)}</small></span></button>`).join('')}</div>`
      :'<p class="small">No hay avisos. Acá te vamos a avisar si te sumaron a un torneo, cuando termina uno tuyo y si alguien te supera un récord mundial.</p>'}
    <div class="btns"><button class="btn alt" data-act="menu" data-focus>Volver</button></div>`));
  if(d.list.some(n=>!n.read)){ d.list.forEach(n=>{ n.read=true; }); save(d); }
}
