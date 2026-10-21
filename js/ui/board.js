// World top 10 per event: each player's best mark, with the day it was made (kept on the server, see api/t.js).
// Your personal records are sent whenever they improve; without connection they wait and go with the next ones.
// Without connection the board shows the players of this device. The last tabs are survival, classic and modern
// (best run's points).
import {OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {getTop,sendMarks} from '../online.js';
import {groupName,loadGroups,myGroups} from './groups.js';
import {setS,setScreen} from '../state.js';
import {periods,player,players,survBestKey,updatePlayer} from '../storage.js';
import {esc,place,showOv} from './screens.js';

const cache={};  // 'ev' (world) or 'ev:group' -> {at, top}
const FRESH=60000;
// span: '' all-time, 'year' this year, 'month' this month
const key=(ev,group,span)=>ev+(group?':'+group:'')+(span?'@'+span:'');
export async function loadTop(ev,force,group,span){
  const k=key(ev,group,span), c=cache[k]; if(c&&!force&&Date.now()-c.at<FRESH) return c.top;
  const r=await getTop(ev,group,span); cache[k]={at:r.offline?0:Date.now(),top:r.top,offline:!!r.offline}; return r.top;
}
export const cachedTop=(ev,group,span)=>cache[key(ev,group,span)]?.top||null;
const wasOffline=(ev,group,span)=>!!cache[key(ev,group,span)]?.offline;
// which board: the world (null) or one of your groups, and which time (all-time, this year, this month); remembered
let scope=null, span='';
const SPANS=[['','Histórico'],['year','Este año'],['month','Este mes']];

// your records not sent yet (or improved since): sent together; the server keeps only the better one
let syncing=false;
export async function syncMarks(){
  const p=player(); if(!p||!p.token||syncing) return;
  const sent=p.sent||{}, list=EVENTS.filter(e=>p.rec[e.id]!=null&&sent[e.id]!==p.rec[e.id])
    .map(e=>({ev:e.id,mark:p.rec[e.id],date:(p.best[e.id]||[]).find(b=>b.v===p.rec[e.id])?.date}));
  ['surv','survm'].forEach(k=>{ const b=p[survBestKey(k)]; if(p.rec[k]!=null&&sent[k]!==p.rec[k]) list.push({ev:k,mark:p.rec[k],rounds:b?.rounds,date:b?.date}); });
  // this year's and this month's bests (they can be one without being a personal record)
  const recN=list.length, now=periods(Date.now()), psent=p.psent||{}, per=[];
  Object.entries(p.pb||{}).forEach(([ev,o])=>['y','m'].forEach((s,j)=>{ const b=o[s]; if(b&&b.k===now[j]&&psent[ev+'|'+b.k]!==b.v){ per.push(ev+'|'+b.k); list.push({ev,mark:b.v,date:b.date,rounds:b.rounds}); } }));
  if(!list.length) return;
  syncing=true;
  try{ await sendMarks(list); const done={...sent}, pdone={...psent}; list.forEach((m,j)=>{ if(j<recN) done[m.ev]=m.mark; Object.keys(cache).forEach(k=>{ if(k===m.ev||k.startsWith(m.ev+':')||k.startsWith(m.ev+'@')) delete cache[k]; }); });
    per.forEach(k=>{ const [ev,pk]=k.split('|'), b=Object.values(p.pb[ev]).find(x=>x.k===pk); if(b) pdone[k]=b.v; });
    if(player()===p) updatePlayer({sent:done,psent:pdone}); }
  catch(e){ /* try again later */ }
  finally{ syncing=false; }
}

// this device only: best of each player here
function localTop(ev){
  const sprint=ev.type==='sprint', surv=!!ev.surv, b=p=>p[survBestKey(ev.id)];
  return players().filter(p=>p.rec[ev.id]!=null).map(p=>({player_id:p.id,name:p.name,color:p.color,mark:p.rec[ev.id],
    date:surv?b(p)?.date:(p.best[ev.id]||[]).find(x=>x.v===p.rec[ev.id])?.date,rounds:surv?b(p)?.rounds:null})).sort((a,b)=>sprint?a.mark-b.mark:b.mark-a.mark).slice(0,10);
}
// survival as one more board: points of the best run, and the round it reached
export const SURV={id:'surv',name:'Supervivencia clásica',tag:'SUPERV. CLÁSICA',type:'score',surv:true};
export const SURVM={id:'survm',name:'Supervivencia moderna',tag:'SUPERV. MODERNA',type:'score',surv:true};
const SURVS=[SURV,SURVM];
const mk=(ev,v)=>ev.surv?`${v} pts`:fmt(ev,v);
const day=d=>{ if(!d) return ''; const t=new Date(d); return isNaN(t)?'':t.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'}); };

// back: where «Volver» goes (kept while changing tabs); by default the events screen, or survival for its tab
let shownEv=null, back=null;
// i: event index (EVENTS.length: survival); from: where «Volver» goes; group: '' for the world, an id for a group
export async function showBoard(i,from,group,sp){
  if(from!==undefined) back=from; else if(i!==undefined&&!document.querySelector('.b-card')) back=null;
  if(group!==undefined) scope=group||null;
  if(sp!==undefined) span=sp||'';
  if(scope&&!myGroups().some(g=>g.id===scope)) scope=null;
  const ev=i>=EVENTS.length&&SURVS[i-EVENTS.length]?SURVS[i-EVENTS.length]:EVENTS[i]||EVENTS[0], evI=ev.surv?EVENTS.length+SURVS.indexOf(ev):EVENTS.indexOf(ev); shownEv=ev.id+(scope||''); setS(null); setScreen('menu');
  // the board, as the menus: a red title and what's shown on the right; the world or a group, the time, the event tabs,
  // the table (the podium in gold, silver and bronze, you highlighted) and «Volver» at the bottom
  const scopes=`<div class="b-scopes">${[{id:'',name:'Mundial'}].concat(myGroups()).map(g=>`<button class="b-scope${(g.id||null)===scope?' on':''}" data-act="board" data-i="${evI}" data-group="${esc(g.id)}">${esc(g.name)}</button>`).join('')}<button class="b-scope add" data-act="groups">${myGroups().length?'Grupos ›':'+ Crear grupo'}</button></div>`
    +`<div class="b-scopes b-spans">${SPANS.map(([k,t])=>`<button class="b-scope${k===span?' on':''}" data-act="board" data-i="${evI}" data-span="${k}">${t}</button>`).join('')}</div>`;
  const tabs=scopes+`<div class="b-tabs" role="tablist">${EVENTS.concat(SURVS).map((e,j)=>`<button class="b-tab${e===ev?' on':''}" role="tab" aria-selected="${e===ev}" data-act="board" data-i="${j}">${e.tag}</button>`).join('')}</div>`;
  const card=body=>`<div class="mm b-card">
    <header class="m-top"><div class="m-logo">Récords</div><div class="m-title">${scope?esc(groupName(scope)):'Top 10'}${span?' · '+SPANS.find(x=>x[0]===span)[1]:''} · ${esc(ev.name)}</div></header>
    <div class="b-filters">${tabs}</div>${body}
    <div class="b-foot"><button class="b-back" data-act="${back||(ev===SURV?'sclassic':ev===SURVM?'smodern':'events')}" data-focus>Volver</button></div></div>`;
  const me=player()?.id, unit=ev.surv?'Puntos':ev.type==='sprint'?'Tiempo':'Marca';
  const rows=top=>top.length?`<div class="b-list scroll"><table class="b-table b-big"><thead><tr><th>Pos.</th><th class="nm">Atleta</th><th class="mk">${unit}</th>${ev.surv?'<th class="sub">Ronda</th>':''}<th class="sub">Fecha</th></tr></thead><tbody>${top.map((r,k)=>{ const pl=place(top,k,q=>mk(ev,q.mark));
    return `<tr class="${pl<=3?'p'+pl:''}${r.player_id===me?' me':''}"><td class="pos">${pl}.</td><td class="nm"><canvas data-color="${esc(r.color)}"></canvas>${esc(r.name)}</td><td class="mk">${mk(ev,r.mark)}</td>${ev.surv?`<td class="sub">${(r.rounds||0)+1}</td>`:''}<td class="sub">${day(r.date)}</td></tr>`; }).join('')}</tbody></table></div>`
    :`<p class="small b-empty">${scope?`Nadie del grupo tiene marca en esta prueba${span?(span==='year'?' este año':' este mes'):''} todavía.`:span?`Todavía no hay marcas ${span==='year'?'este año':'este mes'}. ¡La primera puede ser la tuya!`:'Todavía no hay marcas. ¡La primera puede ser la tuya!'}</p>`;
  const c=cachedTop(ev.id,scope,span), here=shownEv+span;
  showOv(card(c?rows(c):'<p class="small o-wait">Cargando…</p>'),'menu');
  if(!myGroups().length&&player()?.token) loadGroups().then(()=>{ if(shownEv===here&&OV.querySelector('.b-card')&&myGroups().length) showBoard(i); },()=>{});
  await syncMarks();
  let top, note='';
  try{ top=await loadTop(ev.id,false,scope,span); if(wasOffline(ev.id,scope,span)) note='<p class="small">Sin conexión: estos son los últimos récords que viste.</p>'; }
  catch(e){ top=scope||span?[]:localTop(ev); note=`<p class="small">${scope?'No se pudo conectar con el servidor.':'No se pudo conectar con el servidor de récords: se ven solo los jugadores de este celular.'}</p>`; }
  if(shownEv+span!==here||!OV.querySelector('.b-card')) return;  // left the board meanwhile
  const y=OV.scrollTop, ly=OV.querySelector('.scroll')?.scrollTop||0; showOv(card(note+rows(top)),'menu'); OV.scrollTop=y; const l=OV.querySelector('.scroll'); if(l) l.scrollTop=ly;
}
