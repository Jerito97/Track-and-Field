// World top 10 per event: each player's best mark, with the day it was made (kept on the server, see api/t.js).
// Your personal records are sent whenever they improve; without connection they wait and go with the next ones.
// Without connection the board shows the players of this device. The last tab is survival (best run's points).
import {OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {getTop,sendMarks} from '../online.js';
import {groupName,loadGroups,myGroups} from './groups.js';
import {setS,setScreen} from '../state.js';
import {player,players,updatePlayer} from '../storage.js';
import {esc,place,showOv} from './screens.js';

const cache={};  // 'ev' (world) or 'ev:group' -> {at, top}
const FRESH=60000;
export async function loadTop(ev,force,group){
  const k=group?ev+':'+group:ev, c=cache[k]; if(c&&!force&&Date.now()-c.at<FRESH) return c.top;
  const r=await getTop(ev,group); cache[k]={at:r.offline?0:Date.now(),top:r.top,offline:!!r.offline}; return r.top;
}
export const cachedTop=(ev,group)=>cache[group?ev+':'+group:ev]?.top||null;
const wasOffline=(ev,group)=>!!cache[group?ev+':'+group:ev]?.offline;
// which board: the world (null) or one of your groups; remembered
let scope=null;

// your records not sent yet (or improved since): sent together; the server keeps only the better one
let syncing=false;
export async function syncMarks(){
  const p=player(); if(!p||!p.token||syncing) return;
  const sent=p.sent||{}, list=EVENTS.filter(e=>p.rec[e.id]!=null&&sent[e.id]!==p.rec[e.id])
    .map(e=>({ev:e.id,mark:p.rec[e.id],date:(p.best[e.id]||[]).find(b=>b.v===p.rec[e.id])?.date}));
  if(p.rec.surv!=null&&sent.surv!==p.rec.surv) list.push({ev:'surv',mark:p.rec.surv,rounds:p.survBest?.rounds,date:p.survBest?.date});
  if(!list.length) return;
  syncing=true;
  try{ await sendMarks(list); const done={...sent}; list.forEach(m=>{ done[m.ev]=m.mark; Object.keys(cache).forEach(k=>{ if(k===m.ev||k.startsWith(m.ev+':')) delete cache[k]; }); }); if(player()===p) updatePlayer({sent:done}); }
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
// i: event index (EVENTS.length: survival); from: where «Volver» goes; group: '' for the world, an id for a group
export async function showBoard(i,from,group){
  if(from!==undefined) back=from; else if(i!==undefined&&!document.querySelector('.b-card')) back=null;
  if(group!==undefined) scope=group||null;
  if(scope&&!myGroups().some(g=>g.id===scope)) scope=null;
  const ev=i===EVENTS.length?SURV:EVENTS[i]||EVENTS[0], evI=i===EVENTS.length?EVENTS.length:EVENTS.indexOf(ev); shownEv=ev.id+(scope||''); setS(null); setScreen('menu');
  const scopes=`<div class="b-scopes">${[{id:'',name:'🌎 Mundial'}].concat(myGroups()).map(g=>`<button class="b-scope${(g.id||null)===scope?' on':''}" data-act="board" data-i="${evI}" data-group="${esc(g.id)}">${esc(g.name)}</button>`).join('')}<button class="b-scope add" data-act="groups">${myGroups().length?'Grupos ›':'+ Crear grupo'}</button></div>`;
  const tabs=scopes+`<div class="b-tabs" role="tablist">${EVENTS.concat(SURV).map((e,j)=>`<button class="b-tab${e===ev?' on':''}" role="tab" aria-selected="${e===ev}" data-act="board" data-i="${j}">${e.tag}</button>`).join('')}</div>`;
  const card=body=>`<div class="card b-card"><div class="head"><div class="logo">RÉCORDS</div><h2>${scope?esc(groupName(scope)):'Top 10'} · ${ev.name}</h2></div><div class="body">${tabs}${body}
    <div class="btns"><button class="btn" data-act="${back||(ev===SURV?'surv':'events')}" data-focus>Volver</button></div></div></div>`;
  const me=player()?.id;
  const rows=top=>top.length?`<table class="b-table"><tbody>${top.map((r,k)=>{ const pl=place(top,k,q=>mk(ev,q.mark));
    return `<tr class="${r.player_id===me?'me':''}"><td>${pl}.${pl<=3?' '+['🥇','🥈','🥉'][pl-1]:''}</td><td class="nm"><canvas data-color="${esc(r.color)}"></canvas>${esc(r.name)}</td><td class="mk">${mk(ev,r.mark)}</td>${ev===SURV?`<td class="sub">ronda ${(r.rounds||0)+1}</td>`:''}<td class="sub">${day(r.date)}</td></tr>`; }).join('')}</tbody></table>`
    :`<p class="small b-empty">${scope?'Nadie del grupo tiene marca en esta prueba todavía.':'Todavía no hay marcas. ¡La primera puede ser la tuya!'}</p>`;
  const c=cachedTop(ev.id,scope), here=shownEv;
  showOv(card(c?rows(c):'<p class="small o-wait">Cargando…</p>'));
  if(!myGroups().length&&player()?.token) loadGroups().then(()=>{ if(shownEv===here&&OV.querySelector('.b-card')&&myGroups().length) showBoard(i); },()=>{});
  await syncMarks();
  let top, note='';
  try{ top=await loadTop(ev.id,false,scope); if(wasOffline(ev.id,scope)) note='<p class="small">Sin conexión: estos son los últimos récords que viste.</p>'; }
  catch(e){ top=scope?[]:localTop(ev); note=`<p class="small">${scope?'No se pudo conectar con el servidor.':'No se pudo conectar con el servidor de récords: se ven solo los jugadores de este celular.'}</p>`; }
  if(shownEv!==here||!OV.querySelector('.b-card')) return;  // left the board meanwhile
  const y=OV.scrollTop; showOv(card(note+rows(top))); OV.scrollTop=y;
}
