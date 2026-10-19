// World top 10 per event: each player's best mark, with the day it was made (kept on the server, see api/t.js).
// Your personal records are sent whenever they improve; without connection they wait and go with the next ones.
// Without connection the board shows the players of this device. The last tab is survival (best run's points).
import {OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {getTop,sendMarks} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player,players,updatePlayer} from '../storage.js';
import {esc,place,showOv} from './screens.js';

const cache={};  // ev -> {at, top}
const FRESH=60000;
export async function loadTop(ev,force){
  const c=cache[ev]; if(c&&!force&&Date.now()-c.at<FRESH) return c.top;
  const r=await getTop(ev); cache[ev]={at:r.offline?0:Date.now(),top:r.top,offline:!!r.offline}; return r.top;
}
export const cachedTop=ev=>cache[ev]?.top||null;
const wasOffline=ev=>!!cache[ev]?.offline;

// your records not sent yet (or improved since): sent together; the server keeps only the better one
let syncing=false;
export async function syncMarks(){
  const p=player(); if(!p||!p.token||syncing) return;
  const sent=p.sent||{}, list=EVENTS.filter(e=>p.rec[e.id]!=null&&sent[e.id]!==p.rec[e.id])
    .map(e=>({ev:e.id,mark:p.rec[e.id],date:(p.best[e.id]||[]).find(b=>b.v===p.rec[e.id])?.date}));
  if(p.rec.surv!=null&&sent.surv!==p.rec.surv) list.push({ev:'surv',mark:p.rec.surv,rounds:p.survBest?.rounds,date:p.survBest?.date});
  if(!list.length) return;
  syncing=true;
  try{ await sendMarks(list); const done={...sent}; list.forEach(m=>{ done[m.ev]=m.mark; delete cache[m.ev]; }); if(player()===p) updatePlayer({sent:done}); }
  catch(e){ /* try again later */ }
  finally{ syncing=false; }
}

// this device only: best of each player here
function localTop(ev){
  const sprint=ev.type==='sprint', surv=ev.id==='surv';
  return players().filter(p=>p.rec[ev.id]!=null).map(p=>({player_id:p.id,name:p.name,color:p.color,mark:p.rec[ev.id],
    date:surv?p.survBest?.date:(p.best[ev.id]||[]).find(b=>b.v===p.rec[ev.id])?.date,rounds:surv?p.survBest?.rounds:null})).sort((a,b)=>sprint?a.mark-b.mark:b.mark-a.mark).slice(0,10);
}
// survival as one more board: points of the best run, and the round it reached
export const SURV={id:'surv',name:'Supervivencia',tag:'SUPERVIVENCIA',type:'score'};
const mk=(ev,v)=>ev===SURV?`${v} pts`:fmt(ev,v);
const day=d=>{ if(!d) return ''; const t=new Date(d); return isNaN(t)?'':t.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'}); };

// back: where «Volver» goes (kept while changing tabs); by default the events screen, or survival for its tab
let shownEv=null, back=null;
export async function showBoard(i,from){
  if(from!==undefined) back=from; else if(i!==undefined&&!document.querySelector('.b-card')) back=null;
  const ev=i===EVENTS.length?SURV:EVENTS[i]||EVENTS[0]; shownEv=ev.id; setS(null); setScreen('menu');
  const tabs=`<div class="b-tabs" role="tablist">${EVENTS.concat(SURV).map((e,j)=>`<button class="b-tab${e===ev?' on':''}" role="tab" aria-selected="${e===ev}" data-act="board" data-i="${j}">${e.tag}</button>`).join('')}</div>`;
  const card=body=>`<div class="card b-card"><div class="head"><div class="logo">RÉCORDS</div><h2>Top 10 · ${ev.name}</h2></div><div class="body">${tabs}${body}
    <div class="btns"><button class="btn" data-act="${back||(ev===SURV?'surv':'events')}" data-focus>Volver</button></div></div></div>`;
  const me=player()?.id;
  const rows=top=>top.length?`<table class="b-table"><tbody>${top.map((r,k)=>{ const pl=place(top,k,q=>mk(ev,q.mark));
    return `<tr class="${r.player_id===me?'me':''}"><td>${pl}.${pl<=3?' '+['🥇','🥈','🥉'][pl-1]:''}</td><td class="nm"><canvas data-color="${esc(r.color)}"></canvas>${esc(r.name)}</td><td class="mk">${mk(ev,r.mark)}</td>${ev===SURV?`<td class="sub">ronda ${(r.rounds||0)+1}</td>`:''}<td class="sub">${day(r.date)}</td></tr>`; }).join('')}</tbody></table>`
    :'<p class="small b-empty">Todavía no hay marcas. ¡La primera puede ser la tuya!</p>';
  const c=cachedTop(ev.id);
  showOv(card(c?rows(c):'<p class="small o-wait">Cargando…</p>'));
  await syncMarks();
  let top, note='';
  try{ top=await loadTop(ev.id); if(wasOffline(ev.id)) note='<p class="small">Sin conexión: estos son los últimos récords que viste.</p>'; }catch(e){ top=localTop(ev); note='<p class="small">No se pudo conectar con el servidor de récords: se ven solo los jugadores de este celular.</p>'; }
  if(shownEv!==ev.id||!OV.querySelector('.b-card')) return;  // left the board meanwhile
  const y=OV.scrollTop; showOv(card(note+rows(top))); OV.scrollTop=y;
}
