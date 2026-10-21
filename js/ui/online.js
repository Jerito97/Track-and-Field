// Online tournament screens: create / join with a code, the tournament board (events to play, standings), and
// playing an event for it. Everyone plays each event once, whenever they want.
import {$,OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {newEvent,startPlay} from '../game/core.js';
import {fmt,pts} from '../game/scoring.js';
import {cleanCode,closeTournament,createTournament,repeatTournament,getMyTours,getTournament,inviteLink,invitePlayer,joinTournament,myTournaments,sendResult} from '../online.js';
import {buildAthletes,G,screen,setS,setScreen} from '../state.js';
import {player,players,store} from '../storage.js';
import {loadPlayers} from './people.js';
import {CATS,catOf,esc,paintOv,place,showOv} from './screens.js';

const evById=id=>EVENTS.find(e=>e.id===id);
// choosing the events: grouped as on the events screen (races, jumps, throws, swimming); a group's name ticks all of it,
// or unticks all of it when they're all ticked already
const short=e=>e.tag.charAt(0)+e.tag.slice(1).toLowerCase();  // the card's name: 100 m, Vallas, Posta...
const evPicker=on=>`<div class="o-evs">${CATS.filter(([c])=>c!=='all').map(([c,n])=>{ const evs=EVENTS.filter(e=>catOf(e)===c); if(!evs.length) return '';
  return `<div class="o-cat"><button type="button" class="o-catb" data-act="ocat" data-c="${c}">${n}</button><div class="o-catl">${evs.map(e=>`<label><input type="checkbox" name="oev" value="${e.id}" data-c="${c}"${on(e)?' checked':''}> ${short(e)}</label>`).join('')}</div></div>`; }).join('')}</div>`;
export function toggleCat(c){ const boxes=[...OV.querySelectorAll(`input[name="oev"][data-c="${c}"]`)], all=boxes.every(b=>b.checked); boxes.forEach(b=>{ b.checked=!all; }); }
const card=(logo,title,body)=>`<div class="card o-card"><div class="head"><div class="logo">${logo}</div><h2>${title}</h2></div><div class="body">${body}</div></div>`;
const err=msg=>`<p class="o-err" role="alert">${esc(msg)}</p>`;
let busy=false;

// hub: create (name, events, how long it lasts), join with a code, your tournaments being played, and the history
const DAYS=[[1,'1 día'],[3,'3 días'],[7,'1 semana']];
let days=7, tours=null, toursPid=null;  // your tournaments as the server sent them last, and whose they are
const ownTours=()=>{ if(toursPid!==player().id){ tours=null; toursPid=player().id; } };
const day=d=>new Date(d).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'});
function timeLeft(t){ const ms=new Date(t.ends_at)-Date.now(), h=ms/3600000;
  return h>=48?`termina en ${Math.round(h/24)} días`:h>=1?`termina en ${Math.round(h)} h`:`termina en ${Math.max(1,Math.round(ms/60000))} min`; }
const finishedTours=()=>(tours||[]).filter(d=>d.tournament.finished);
function activeList(){
  if(!tours){ const mine=myTournaments(); return mine.length?`<div class="o-list">${mine.map(c=>`<button class="o-item" data-act="oopen" data-code="${c}"><b>${c}</b><span>Ver ›</span></button>`).join('')}</div>`:''; }
  const act=tours.filter(d=>!d.tournament.finished);
  if(!act.length) return '<p class="small">No estás en ningún torneo en juego.</p>';
  return `<div class="o-list">${act.map(d=>{ const t=d.tournament, rows=standings(d);
    return `<button class="o-item o-tour" data-act="oopen" data-code="${t.code}"><span class="o-tn"><b>${esc(t.name)}</b><small>${rows.length} ${rows.length===1?'jugador':'jugadores'} · ${timeLeft(t)}</small></span><span>Ver ›</span></button>`; }).join('')}</div>`;
}
export function showOnline(msg){
  setS(null); setScreen('menu'); ownTours(); const pid=player().id;
  const draw=()=>{ const fin=finishedTours().length;
    showOv(card('ONLINE','Torneos con amigos',`
    <p class="small o-intro">Pasales el código a tus amigos: cada uno juega cuando quiera y gana el que suma más puntos.</p>
    ${msg?err(msg):''}
    <div class="o-two">
      <div class="o-box"><span class="lbl">Crear torneo</span>
        <input id="oname" maxlength="30" placeholder="Nombre (opcional)" autocomplete="off">
        ${evPicker(e=>!e.extra)}
        <div class="o-mk"><div class="o-days"><span class="small">Dura</span>${DAYS.map(([d,t])=>`<button class="o-day${d===days?' on':''}" data-act="odays" data-d="${d}" aria-pressed="${d===days}">${t}</button>`).join('')}</div>
        <button class="btn" data-act="ocreate">Crear</button></div></div>
      <div class="o-box"><span class="lbl">Unirme con un código</span>
        <input id="ocode" maxlength="8" placeholder="Ej: K7Q4P" autocomplete="off" autocapitalize="characters">
        <button class="btn" data-act="ojoin">Entrar</button>
        <span class="lbl">En juego</span><div id="oact">${tours||myTournaments().length?activeList():'<p class="small o-wait">Cargando…</p>'}</div>
        <button class="btn alt o-histbtn" data-act="ohist">Historial de torneos${fin?` (${fin})`:''}</button>
      </div>
    </div>
    <div class="btns"><button class="btn alt" data-act="menu">Volver</button></div>`));
    $('ocode').addEventListener('keydown',e=>{ if(e.key==='Enter') OV.querySelector('[data-act="ojoin"]').click(); }); };
  draw(); hubOpen=true;
  getMyTours().then(t=>{ if(player().id!==pid) return; tours=t; if(hubOpen&&OV.querySelector('#oact')){ const keep={name:$('oname').value,code:$('ocode').value}; draw(); $('oname').value=keep.name; $('ocode').value=keep.code; } },()=>{ const el=OV.querySelector('#oact'); if(el&&!tours) el.innerHTML=activeList()||'<p class="small">Sin conexión.</p>'; });
}
let hubOpen=false;
export function onDays(d){ days=+d; OV.querySelectorAll('.o-day').forEach(b=>{ const on=+b.dataset.d===days; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); }); }
// history: finished tournaments, newest first, with the winner and your place
export async function showHistory(){
  hubOpen=false; setS(null); setScreen('menu'); ownTours(); const pid=player().id;
  const draw=msg=>{ const fin=finishedTours(), me=player().id;
    showOv(card('HISTORIAL',`Torneos terminados${tours?` (${fin.length})`:''}`,msg||(fin.length?`<div class="o-list">${fin.map(d=>{ const t=d.tournament, rows=standings(d), i=rows.findIndex(r=>r.player_id===me), pl=i<0?null:place(rows,i,q=>String(q.total)), win=rows.filter((r,k)=>place(rows,k,q=>String(q.total))===1).map(r=>esc(r.name)).join(' y ');
      return `<button class="o-item o-tour" data-act="oopen" data-code="${t.code}"><span class="o-tn"><b>${esc(t.name)}</b><small>${day(t.closed_at||t.ends_at)} · ${rows.length} jugadores · Ganó ${win}</small></span><span class="o-pl">${pl==null?'':`${pl<=3?['🥇','🥈','🥉'][pl-1]+' ':''}${pl}º`}</span></button>`; }).join('')}</div>`
      :'<p class="small">Todavía no terminó ningún torneo tuyo.</p>'))+'');
    OV.querySelector('.o-card .body').insertAdjacentHTML('beforeend','<div class="btns"><button class="btn alt" data-act="online" data-focus>Volver</button></div>'); };
  draw(tours?'':'<p class="small o-wait">Cargando…</p>');
  try{ const t=await getMyTours(); if(player().id!==pid) return; tours=t; draw(); }catch(e){ if(!tours) draw(err(e.message)); }
}
const loading=t=>showOv(card('ONLINE',t,'<p class="small o-wait">Cargando…</p>'));

async function guard(fn){ if(busy) return; busy=true; try{ await fn(); } finally{ busy=false; } }
// repeat a finished tournament: choose the events (the same ones ticked) and how long; everyone who played it is in
let shownT=null;
export function showRepeat(code,msg){
  const t=shownT&&shownT.code===code?shownT:null; if(!t){ showTournament(code); return; }
  showOv(card('REPETIR',esc(t.name),`${msg?err(msg):''}
    <p class="small o-note">Se arma de nuevo con <b>los mismos jugadores</b> ya anotados: les aparece en <b>En juego</b>, sin pasar el código. Elegí las pruebas y cuánto dura.</p>
    ${evPicker(e=>t.events.includes(e.id))}
    <div class="o-days"><span class="small">Dura</span>${DAYS.map(([d,tx])=>`<button class="o-day${d===days?' on':''}" data-act="odays" data-d="${d}" aria-pressed="${d===days}">${tx}</button>`).join('')}</div>
    <div class="btns"><button class="btn" data-act="orepeatgo" data-code="${code}" data-focus>Empezar</button><button class="btn alt" data-act="oopen" data-code="${code}">Volver</button></div>`));
}
export const onRepeat=code=>guard(async()=>{
  const events=[...OV.querySelectorAll('input[name="oev"]:checked')].map(i=>i.value);
  if(!events.length){ showRepeat(code,'Elegí al menos una prueba.'); return; }
  loading('Armando el torneo');
  try{ const nc=await repeatTournament(code,events,days); tours=null; await showTournament(nc); }catch(e){ showRepeat(code,e.message); }
});
export const onCreate=()=>guard(async()=>{
  const events=[...OV.querySelectorAll('input[name="oev"]:checked')].map(i=>i.value), name=$('oname').value.trim();
  if(!events.length){ showOnline('Elegí al menos una prueba.'); return; }
  loading('Creando torneo');
  try{ const code=await createTournament(name,events,days); tours=null; await showTournament(code); }catch(e){ showOnline(e.message); }
});
export const onJoin=(raw)=>guard(async()=>{
  const code=cleanCode(raw??$('ocode').value); if(code.length<4){ showOnline('Escribí el código que te pasaron.'); return; }
  loading('Entrando');
  try{ await joinTournament(code); tours=null; await showTournament(code); }catch(e){ showOnline(e.message); }
});

// results waiting to be sent (no connection when the event ended), each with whose it is: sent with that player's
// session when there's connection (board opened, back online, game opened). An event left halfway by closing the game
// (marked as started and never finished) is sent as a foul. Kept only while it can still go through: no connection,
// session to renew, or a server failure; anything the server refuses (already played, finished...) is dropped.
const PENDING='odb-online-pending', STARTED='odb-online-started';
const pending=()=>store.get(PENDING,[]).filter(p=>p.pid);
const keep=e=>!e.status||e.status===401||e.status>=500;
let flushing=null;
export function flush(){ if(!flushing) flushing=flushNow().finally(()=>{ flushing=null; }); return flushing; }
async function flushNow(){
  const st=store.get(STARTED,null);
  if(st&&!(screen==='play'&&G.mode==='online')){ store.set(STARTED,null); store.set(PENDING,pending().concat({...st,mark:null})); }
  const left=[];
  for(const p of pending()){ const tk=players().find(q=>q.id===p.pid)?.token; if(!tk){ left.push(p); continue; }
    try{ await sendResult(p.code,p.ev,p.mark,tk); }catch(e){ if(keep(e)) left.push(p); } }
  store.set(PENDING,left); }

// standings: points per event as in the solo tournament, summed; equal totals share the place
export function standings(data){
  const evs=data.tournament.events.map(evById).filter(Boolean);
  return data.entries.map(en=>{ const mine=data.results.filter(r=>r.player_id===en.player_id), marks={};
    mine.forEach(r=>{ marks[r.ev]=r.mark; });
    const total=evs.reduce((s,ev)=>s+(ev.id in marks?pts(ev,marks[ev.id]):0),0);
    return {...en,marks,played:mine.length,total,done:mine.length>=evs.length}; }).sort((a,b)=>b.total-a.total);
}
let shown=null;  // code of the board on screen
export const shownCode=()=>shown;
// while a board of a tournament in play is open (and the phone screen on), it updates itself every few seconds:
// only redrawn when something changed, keeping the scroll and without the «Cargando» in between
const AUTO=15000;
let auto=null, lastSig='';
const onBoard=code=>!!OV.querySelector(`[data-act="orefresh"][data-code="${code}"]`);
function autoRefresh(code){ clearTimeout(auto);
  auto=setTimeout(()=>{ if(shown!==code||!onBoard(code)) return;
    // not while about to end it (the confirm would be lost) or while the screen is off
    if(document.visibilityState!=='visible'||OV.querySelector('.o-close[data-sure]')) return autoRefresh(code);
    showTournament(code,null,true); },AUTO); }
export async function showTournament(code,msg,silent){
  code=cleanCode(code);
  if(silent&&(shown!==code||!onBoard(code))) return;
  if(!silent){ shown=code; lastSig=''; setS(null); setScreen('menu'); loading('Torneo '+code); }
  if(G.sending) await G.sending;
  await flush();
  let data; try{ data=await getTournament(code); }catch(e){ if(silent) return autoRefresh(code); showOnline(e.message); return; }
  if(shown!==code) return;
  if(silent){ if(!onBoard(code)) return; const sig=JSON.stringify([data.entries,data.results,data.tournament.finished]); if(sig===lastSig) return autoRefresh(code); }
  lastSig=JSON.stringify([data.entries,data.results,data.tournament.finished]);
  const keepY=silent?OV.scrollTop:0;
  // your results still waiting for connection count as played here
  const mine=pending().filter(q=>q.pid===player().id&&q.code===code&&!data.results.some(r=>r.player_id===q.pid&&r.ev===q.ev));
  data.results=data.results.concat(mine.map(q=>({player_id:q.pid,ev:q.ev,mark:q.mark})));
  const note=(data.offline?'<p class="small">Sin conexión: esta es la última tabla que viste.</p>':'')+(mine.length?`<p class="small">${mine.length===1?'Tenés 1 resultado que se envía':`Tenés ${mine.length} resultados que se envían`} cuando vuelva la conexión.</p>`:'');
  const t=data.tournament; shownT=t;
  const p=player(), evs=t.events.map(evById).filter(Boolean), rows=standings(data), meRow=rows.find(r=>r.player_id===p.id), fin=t.finished;
  if(!meRow){ if(fin){ showOnline('Este torneo ya terminó.'); return; } try{ await joinTournament(code); }catch(e){ showOnline(e.message); return; } return showTournament(code,msg); }
  const myEvs=evs.map(ev=>{ const played=ev.id in meRow.marks;
    return `<div class="o-ev${played||fin?' done':''}"><b>${ev.name}</b>${played?`<span>${fmt(ev,meRow.marks[ev.id])} · ${pts(ev,meRow.marks[ev.id])} pts</span>`:fin?'<span class="o-np">No jugada · 0 pts</span>':`<button class="btn" data-act="oplay" data-ev="${ev.id}">Jugar</button>`}</div>`; }).join('');
  const table=`<table class="o-table"><thead><tr><th></th><th></th>${evs.map(ev=>`<th>${ev.tag.replace(/ /g,'&nbsp;')}</th>`).join('')}<th>Pts</th></tr></thead><tbody>${rows.map((r,i)=>{ const pl=place(rows,i,q=>String(q.total));
    return `<tr class="${r.player_id===p.id?'me':''}"><td>${pl}.${fin&&pl<=3?' '+['🥇','🥈','🥉'][pl-1]:''}</td><td class="nm"><canvas data-color="${esc(r.color)}"></canvas>${esc(r.name)}</td>${evs.map(ev=>`<td class="sub">${ev.id in r.marks?fmt(ev,r.marks[ev.id]):fin?'—':'·'}</td>`).join('')}<td>${r.total}</td></tr>`; }).join('')}</tbody></table>`;
  const why={all:'Todos jugaron todas las pruebas.',time:'Se terminó el tiempo: las pruebas que no se jugaron cuentan 0.',host:'Lo terminó quien lo creó: las pruebas que no se jugaron cuentan 0.'}[t.reason]||'';
  const host=t.host_id===p.id;
  showOv(card('TORNEO',esc(t.name),`
    ${msg?err(msg):''}${note}
    ${fin?`<p class="small o-final"><b>¡Torneo terminado!</b> ${why}</p>`
      :`<div class="o-code"><div><span class="lbl">Código</span><b>${code}</b></div><div class="o-inv"><button class="btn" data-act="oinvite" data-code="${code}">Invitar jugadores</button><button class="btn alt" data-act="oshare" data-code="${code}">Compartir link</button></div></div>
    <p class="small o-note">Cada prueba se juega <b>una sola vez</b> (salir a la mitad es nulo) · El torneo ${timeLeft(t)} (${day(t.ends_at)})${rows.length<2?' · Invitá jugadores o pasales el código':''}</p>`}
    <span class="lbl">Tus pruebas</span><div class="o-evlist">${myEvs}</div>
    <span class="lbl">Tabla${fin?' final':''}</span>${table}
    <div class="btns">${fin?'':`<button class="btn alt" data-act="orefresh" data-code="${code}">Actualizar</button>`}${fin?`<button class="btn" data-act="orepeat" data-code="${code}">Repetir torneo</button>`:''}<button class="btn alt" data-act="${fin?'ohist':'online'}">Volver</button>${host&&!fin?`<button class="btn alt o-close" data-act="oclose" data-code="${code}">Terminar torneo</button>`:''}</div>`));
  if(silent) OV.scrollTop=keepY;
  if(!fin) autoRefresh(code);
}
// who created it can end it now (asks once more first)
export async function onClose(b){
  if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Terminarlo ya? Tocá de nuevo'; return; }
  const code=b.dataset.code; loading('Terminando torneo');
  try{ await closeTournament(code); tours=null; }catch(e){ return showTournament(code,e.message); }
  showTournament(code);
}
// invite registered players: everyone who isn't in it yet, by name, with a search box; a tap puts them in (they get
// it in their notices)
let invQ='', invCode=null;
const fold=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export async function showInvite(code,msg){
  code=cleanCode(code); invCode=code; shown=null; setS(null); setScreen('menu');
  const body=inner=>card('TORNEO','Invitar jugadores',`${msg?err(msg):''}<p class="small">Les llega un aviso en el menú y ya quedan anotados en el torneo.</p>${inner}
    <div class="btns"><button class="btn alt" data-act="oopen" data-code="${code}" data-focus>Volver al torneo</button></div>`);
  showOv(body('<p class="small o-wait">Cargando…</p>'));
  let all, inT;
  try{ [all,inT]=await Promise.all([loadPlayers(true),getTournament(code).then(d=>new Set(d.entries.map(e=>e.player_id)))]); }
  catch(e){ if(invCode===code) showOv(body(err(e.message))); return; }
  if(invCode!==code) return;
  const me=player().id, others=all.filter(p=>p.id!==me).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  const rows=()=>{ const f=fold(invQ.trim()), l=others.filter(p=>!f||fold(p.name).includes(f));
    return l.length?l.map(p=>`<div class="u-item o-invp"><span class="p-av sm"><canvas data-color="${esc(p.color)}"></canvas></span><span class="u-nm"><b>${esc(p.name)}</b></span>${inT.has(p.id)?'<span class="o-in">Ya está</span>':`<button class="btn" data-act="oinv" data-id="${esc(p.id)}">Invitar</button>`}</div>`).join('')
      :'<p class="small">No hay ningún jugador con ese nombre.</p>'; };
  showOv(body(`<input id="oisearch" class="u-search" type="search" placeholder="Buscá por nombre…" autocomplete="off" value="${esc(invQ)}"><div class="u-list" id="oilist">${rows()}</div>`));
  paintOv();
  const inp=$('oisearch'); inp.addEventListener('input',()=>{ invQ=inp.value; $('oilist').innerHTML=rows(); paintOv(); });
}
export async function onInvite(b){
  if(b.disabled) return; const code=invCode; b.disabled=true; b.textContent='…';
  try{ await invitePlayer(code,b.dataset.id); b.outerHTML='<span class="o-in">Invitado ✓</span>'; tours=null; }
  catch(e){ b.disabled=false; b.textContent='Invitar'; showInvite(code,e.message); }
}
export async function onShare(code){
  const url=inviteLink(code), text=`¡Sumate a mi torneo de Track & Field! Código: ${code}`;
  try{ if(navigator.share){ await navigator.share({title:'Track & Field',text,url}); return; } }catch(e){ return; }
  try{ await navigator.clipboard.writeText(`${text} ${url}`); showTournament(code,'Copiado: pegalo en WhatsApp o donde quieras.'); }
  catch(e){ showTournament(code,`Pasales el código ${code} o este link: ${url}`); }
}
// play an event for the tournament (only your mark counts)
export function playOnline(code,evId){
  G.mode='online'; G.code=code; G.evIdx=EVENTS.findIndex(e=>e.id===evId); G.sent=false; G.sending=null;
  store.set(STARTED,{pid:player().id,code,ev:evId});
  // with friends every event is played alone, without the machines (only the friends' results matter)
  buildAthletes(true); newEvent(G.evIdx); startPlay();
}
// the event ended (mark, or null for a foul / leaving halfway): send it, keep it for later if offline
export function finishOnline(mark){
  if(G.sent) return G.sending; G.sent=true; const code=G.code, ev=EVENTS[G.evIdx].id, pid=player().id;
  store.set(STARTED,null);
  G.sending=sendResult(code,ev,mark).catch(e=>{ if(keep(e)) store.set(PENDING,pending().concat({pid,code,ev,mark})); });
  return G.sending;
}
export async function leaveOnline(){ await finishOnline(null); showTournament(G.code); }
// opened with ?t=CODE (invite link): join once there's a player
export function inviteFromUrl(){ const c=new URLSearchParams(location.search).get('t'); return c?cleanCode(c):null; }
export function clearInvite(){ try{ history.replaceState(null,'',location.pathname); }catch(e){ /* ignore */ } }
