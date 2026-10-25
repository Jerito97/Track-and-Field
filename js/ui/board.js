// World top 10 per event: each player's best mark, with the day it was made (kept on the server, see api/t.js).
// Your personal records are sent whenever they improve; without connection they wait and go with the next ones.
// Without connection the board shows the players of this device. The last tabs are survival, classic and modern
// (best run's points).
import {OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {getTop,getWipes,sendMarks} from '../online.js';
import {loadFriends,myFriends} from './friends.js';
import {setS,setScreen} from '../state.js';
import {applyWipes,lastWipe,periods,player,players,survBestKey,updatePlayer} from '../storage.js';
import {CATS,catOf,esc,place,showOv} from './screens.js';

const cache={};  // 'ev' (world) or 'ev:friends' (and '@year' / '@month') -> {at, top, me (your row when not in the 10)}
const FRESH=60000;
// span: '' all-time, 'year' this year, 'month' this month
const key=(ev,group,span)=>ev+(group?':'+group:'')+(span?'@'+span:'');
// group: null for the world, 'friends' for you and your friends
export async function loadTop(ev,force,group,span){
  const k=key(ev,group,span), c=cache[k]; if(c&&!force&&Date.now()-c.at<FRESH) return c.top;
  const r=await getTop(ev,group==='friends'?player()?.id:null,span,player()?.token?player().id:null); cache[k]={at:r.offline?0:Date.now(),top:r.top,me:r.me||null,offline:!!r.offline}; return r.top;
}
export const cachedTop=(ev,group,span)=>cache[key(ev,group,span)]?.top||null;
const cachedMe=(ev,group,span)=>{ const m=cache[key(ev,group,span)]?.me; return m&&m.player_id===player()?.id?m:null; };
const wasOffline=(ev,group,span)=>!!cache[key(ev,group,span)]?.offline;
// which board: the world (null) or you and your friends ('friends'), and which time (all-time, this year, this month); remembered
let scope=null, span='', bcat='all';  // bcat: the kind of event the tabs show (all, races, jumps...)
const SPANS=[['','Histórico'],['year','Este año'],['month','Este mes']];

// your records not sent yet (or improved since): sent together; the server keeps only the better one
let syncing=false;
// records wiped out on the server since the last time: cleared here too (asked at most once a minute), before
// sending anything
let wipedAt=0;
export async function checkWipes(){
  if(Date.now()-wipedAt<60000) return; wipedAt=Date.now();
  try{ const r=await getWipes(lastWipe()); if(!r.offline&&applyWipes(r.wipes||[])) Object.keys(cache).forEach(k=>delete cache[k]); }
  catch(e){ wipedAt=0; }
}
export async function syncMarks(){
  await checkWipes();
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
// i: event index (EVENTS.length: survival); from: where «Volver» goes; group: '' for the world, 'friends' for friends
// the kind of an event on the board (survival is one of its own); picking a kind shows its events, and the first of
// them if the one on screen isn't one
const kindOf=e=>e.surv?'surv':catOf(e);
const BCATS=[...CATS,['surv','Supervivencia']];
export function onBoardCat(c){ bcat=BCATS.some(k=>k[0]===c)?c:'all'; const l=EVENTS.concat(SURVS), cur=l.findIndex(e=>e.id+(scope||'')===shownEv);
  const keep=cur>=0&&(bcat==='all'||kindOf(l[cur])===bcat); showBoard(keep?cur:l.findIndex(e=>bcat==='all'||kindOf(e)===bcat)); }
// the rows that slide sideways (the event tabs, the filters) stay where they were when the board is drawn again,
// with the event picked in sight
function keepX(){ const sel='.b-card .b-tabs,.b-card .b-scopes', was=[...OV.querySelectorAll(sel)].map(e=>e.scrollLeft);
  return ()=>{ OV.querySelectorAll(sel).forEach((e,k)=>{ e.scrollLeft=was[k]||0; });
    const on=OV.querySelector('.b-card .b-tab.on'), t=on?.parentElement; if(!on) return;
    if(on.offsetLeft<t.scrollLeft) t.scrollLeft=on.offsetLeft-8; else if(on.offsetLeft+on.offsetWidth>t.scrollLeft+t.clientWidth) t.scrollLeft=on.offsetLeft+on.offsetWidth-t.clientWidth+8; }; }
// the top 10 (and your row) always fit with no scrolling: the rows take the height left on the screen, measured
// (the filters wrap differently on each phone), between a small and a comfortable size
function fitBoard(){
  const card=OV.querySelector('.b-card'), l=card?.querySelector('.b-list'); if(!l) return;
  const cs=getComputedStyle(OV), room=OV.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  for(let k=0;k<2;k++){ const rows=l.querySelectorAll('tbody tr:not(.b-gap)'), gap=l.querySelector('.b-gap'), head=l.querySelector('thead')?.getBoundingClientRect().height||0;
    const other=card.getBoundingClientRect().height-l.getBoundingClientRect().height, ls=getComputedStyle(l), pad=parseFloat(ls.paddingTop)+parseFloat(ls.paddingBottom)+2;
    const free=room-other-pad-head-(gap?gap.getBoundingClientRect().height:0), sp=parseFloat(getComputedStyle(l.querySelector('table')).borderSpacing.split(' ')[1]||'0');
    l.style.setProperty('--rowh',Math.max(13,Math.min(42,Math.floor((free-sp*(rows.length+2))/Math.max(rows.length,1)))));
    l.style.setProperty('--rowh',l.style.getPropertyValue('--rowh')+'px'); }
}
addEventListener('resize',()=>fitBoard());
export async function showBoard(i,from,group,sp){
  if(from!==undefined) back=from; else if(i!==undefined&&!document.querySelector('.b-card')) back=null;
  if(group!==undefined) scope=group||null;
  if(sp!==undefined) span=sp||'';
  if(scope&&(scope!=='friends'||!player()?.token)) scope=null;
  const ev=i>=EVENTS.length&&SURVS[i-EVENTS.length]?SURVS[i-EVENTS.length]:EVENTS[i]||EVENTS[0], evI=ev.surv?EVENTS.length+SURVS.indexOf(ev):EVENTS.indexOf(ev); shownEv=ev.id+(scope||''); setS(null); setScreen('menu');
  // the board, as the menus: a red title and what's shown on the right; the world or a group, the time, the event tabs,
  // the table (the podium in gold, silver and bronze, you highlighted) and «Volver» at the bottom
  const scopes=`<div class="b-scopes">${[{id:'',name:'Mundial'},...(player()?.token?[{id:'friends',name:'Amigos'}]:[])].map(g=>`<button class="b-scope${(g.id||null)===scope?' on':''}" data-act="board" data-i="${evI}" data-group="${g.id}">${g.name}</button>`).join('')}<button class="b-scope add" data-act="friends">${myFriends().length?'Editar amigos ›':'+ Agregar amigos'}</button></div>`
    +`<div class="b-scopes b-spans">${SPANS.map(([k,t])=>`<button class="b-scope${k===span?' on':''}" data-act="board" data-i="${evI}" data-span="${k}">${t}</button>`).join('')}</div>`;
  if(bcat!=='all'&&kindOf(ev)!==bcat) bcat='all';
  const cats=`<div class="b-scopes b-cats">${BCATS.map(([c,n])=>`<button class="b-scope${c===bcat?' on':''}" data-act="bcat" data-c="${c}">${n}</button>`).join('')}</div>`;
  const tabs=scopes+cats+`<div class="b-tabs" role="tablist">${EVENTS.concat(SURVS).map((e,j)=>bcat==='all'||kindOf(e)===bcat?`<button class="b-tab${e===ev?' on':''}" role="tab" aria-selected="${e===ev}" data-act="board" data-i="${j}">${e.tag}</button>`:'').join('')}</div>`;
  const card=body=>`<div class="mm b-card">
    <header class="m-top"><div class="m-logo">Récords</div><div class="m-title">${scope?'Amigos':'Top 10'}${span?' · '+SPANS.find(x=>x[0]===span)[1]:''} · ${esc(ev.name)}</div></header>
    <div class="b-filters">${tabs}</div>${body}
    <div class="b-foot"><button class="b-back" data-act="${back||(ev===SURV?'sclassic':ev===SURVM?'smodern':'events')}" data-focus>Volver</button></div></div>`;
  const me=player()?.id, unit=ev.surv?'Puntos':ev.type==='sprint'?'Tiempo':'Marca';
  const rows=(top,mine)=>top.length?`<div class="b-list scroll"><table class="b-table b-big"><thead><tr><th>Pos.</th><th class="nm">Atleta</th><th class="mk">${unit}</th>${ev.surv?'<th class="sub">Ronda</th>':''}<th class="sub">Fecha</th></tr></thead><tbody>${top.map((r,k)=>{ const pl=place(top,k,q=>mk(ev,q.mark));
    return `<tr class="${pl<=3?'p'+pl:''}${r.player_id===me?' me':''}"><td class="pos">${pl}.</td><td class="nm"><canvas data-color="${esc(r.color)}"></canvas>${esc(r.name)}</td><td class="mk">${mk(ev,r.mark)}</td>${ev.surv?`<td class="sub">${(r.rounds||0)+1}</td>`:''}<td class="sub">${day(r.date)}</td></tr>`; }).join('')}${mine?`<tr class="b-gap"><td colspan="${ev.surv?5:4}">…</td></tr><tr class="me b-mine"><td class="pos">${mine.rank}.</td><td class="nm"><canvas data-color="${esc(mine.color)}"></canvas>${esc(mine.name)}</td><td class="mk">${mk(ev,mine.mark)}</td>${ev.surv?`<td class="sub">${(mine.rounds||0)+1}</td>`:''}<td class="sub">${day(mine.date)}</td></tr>`:''}</tbody></table></div>`
    :`<p class="small b-empty">${scope?`${myFriends().length?'Ni vos ni tus amigos tienen':'Agregá amigos para comparar sus récords con los tuyos. Vos no tenés'} marca en esta prueba${span?(span==='year'?' este año':' este mes'):''} todavía.`:span?`Todavía no hay marcas ${span==='year'?'este año':'este mes'}. ¡La primera puede ser la tuya!`:'Todavía no hay marcas. ¡La primera puede ser la tuya!'}</p>`;
  const c=cachedTop(ev.id,scope,span), here=shownEv+span;
  let back2=keepX(); showOv(card(c?rows(c,cachedMe(ev.id,scope,span)):'<p class="small o-wait">Cargando…</p>'),'menu'); fitBoard(); back2();
  if(player()?.token) loadFriends().then(()=>{ const add=OV.querySelector('.b-card .b-scope.add'); if(shownEv===here&&add) add.textContent=myFriends().length?'Editar amigos ›':'+ Agregar amigos'; },()=>{});
  await syncMarks();
  let top, note='';
  try{ top=await loadTop(ev.id,false,scope,span); if(wasOffline(ev.id,scope,span)) note='<p class="small">Sin conexión: estos son los últimos récords que viste.</p>'; }
  catch(e){ top=scope||span?[]:localTop(ev); note=`<p class="small">${scope?'No se pudo conectar con el servidor.':'No se pudo conectar con el servidor de récords: se ven solo los jugadores de este celular.'}</p>`; }
  if(shownEv+span!==here||!OV.querySelector('.b-card')) return;  // left the board meanwhile
  const y=OV.scrollTop, ly=OV.querySelector('.scroll')?.scrollTop||0; back2=keepX(); showOv(card(note+rows(top,cachedMe(ev.id,scope,span))),'menu'); fitBoard(); back2(); OV.scrollTop=y; const l=OV.querySelector('.scroll'); if(l) l.scrollTop=ly;
}
