// The decathlon: every event, once each and in a row, in a fixed order (runs, jumps, throws and swimming mixed); played
// alone, each event's points (the tournament points table) added up. No second goes: an event left halfway (leaving
// it, or closing the game) counts as a foul. You can stop between events and go on later (the run is kept on the
// phone, per player). The best total goes to your profile and to its world top 10 (as survival's).
import {EVENTS} from '../config.js';
import {newEvent,startPlay} from '../game/core.js';
import {fmt,pts} from '../game/scoring.js';
import {buildAthletes,G,setS,setScreen} from '../state.js';
import {player,recordSurv,store,survBestKey} from '../storage.js';
import {syncMarks} from './board.js';
import {art,esc,showOv,THUMBS} from './screens.js';

export const DECA_ORDER=['100','lj','sp','hj','110h','dis','pv','jav','crawl','tj','ham','breast','4x100','fly','laser','cycle'];
const N=DECA_ORDER.length;
// its board's index on the records screen (after the events: the two survivals, then this one)
const BOARD_I=EVENTS.length+2;
const evIdx=id=>EVENTS.findIndex(e=>e.id===id);
const card=(title,body)=>`<div class="card s-card"><div class="head"><div class="logo">HEXADECATLÓN</div><h2>${title}</h2></div><div class="body">${body}</div></div>`;
const KEY=()=>'odb-deca-'+(player()?.id||'');
// the run kept on the phone; an event that was started and never finished (the game closed halfway) is a foul
function saved(){ const sv=store.get(KEY(),null); if(!sv||typeof sv.k!=='number') return null;
  if(sv.started){ sv.log.push({ev:DECA_ORDER[sv.k],mark:null,pts:0}); sv.k++; sv.started=false; store.set(KEY(),sv); }
  return sv; }
const keep=()=>store.set(KEY(),G.deca);
const steps=s=>`<div class="s-steps d-steps">${DECA_ORDER.map((id,k)=>`<span class="s-step${k<s.k?' s-done':k===s.k?' s-now':''}" title="${EVENTS[evIdx(id)].name}">${k<s.k?'✓':k+1}</span>`).join('')}</div>`;

// start screen: how it works, your best, play (or go on with the saved run)
export function showDecathlon(){
  setS(null); setScreen('menu');
  const b=player()?.[survBestKey('deca')], sv=saved();
  showOv(card('Todas las pruebas',`
    <div class="s-hero"><img src="assets/thumbs/events.webp" alt=""></div>
    <p class="small">Las ${N} pruebas seguidas, <b>una sola vez cada una</b>: suman los puntos de todas. Podés parar entre prueba y prueba y seguir después, pero si salís en el medio de una, esa cuenta como <b>nulo</b>.</p>
    ${sv?`<div class="o-code s-resume"><div><span class="lbl">Partida guardada</span><b>${sv.pts} pts · ${sv.k}/${N}</b><small>Te toca ${esc(EVENTS[evIdx(DECA_ORDER[sv.k])]?.name||'')}</small></div><button class="btn" data-act="dresume" data-focus>Seguir</button></div>`:''}
    <div class="s-best"><span class="lbl">Tu mejor hexadecatlón</span><b>${b?`${b.pts} pts`:'—'}</b></div>
    <div class="btns"><button class="btn${sv?' alt':''}" data-act="dstart"${sv?'':' data-focus'}>${sv?'Nueva partida':'Jugar'}</button><button class="btn alt" data-act="board" data-i="${BOARD_I}">Récords</button><button class="btn alt" data-act="surv">Volver</button></div>`));
}
export function startDecathlon(b){
  // a new run replaces the saved one (asks once if there is one)
  if(saved()&&b&&!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Empezar de cero? Tocá de nuevo'; return; }
  G.mode='deca'; G.deca={k:0,pts:0,log:[],started:false}; keep(); showDecaEvent();
}
export function resumeDecathlon(){ const sv=saved(); if(!sv) return showDecathlon(); G.mode='deca'; G.deca=sv; sv.k>=N?finish():showDecaEvent(); }
// before each event: which one, how far, the points so far
function showDecaEvent(){
  const s=G.deca; setS(null); setScreen('menu'); G.evIdx=evIdx(DECA_ORDER[s.k]); const ev=EVENTS[G.evIdx];
  showOv(card(`${ev.name} · ${s.k+1}/${N}`,`
    <div class="row2"><div class="pict${THUMBS[ev.id]?' img':''}">${art(G.evIdx)}</div>
      <div class="s-side">${steps(s)}
        <div class="s-best"><span class="lbl">Puntos</span><b>${s.pts}</b></div>
        <div class="menu"><button class="mi play" data-act="dplayev" data-focus>Jugar</button><button class="mi" data-act="menu">Seguir después</button><button class="mi" data-act="dquit">Abandonar</button></div></div></div>`));
}
// play it: from here it counts (closing the game halfway, a foul); alone, no machines
export function playDeca(){ const s=G.deca; s.started=true; keep(); G.mode='deca'; G.res={}; buildAthletes(true); newEvent(G.evIdx); startPlay(); }
// after the event's results: its points, then the next one
export function decaAfterEvent(left){
  const s=G.deca, ev=EVENTS[G.evIdx], mark=left?null:G.res[ev.id]?.[0]??null, p=pts(ev,mark);
  s.log.push({ev:ev.id,mark,pts:p}); s.pts+=p; s.k++; s.started=false; keep();
  if(s.k>=N) return finish();
  setS(null); setScreen('menu');
  showOv(card(`${ev.name} · ${s.k}/${N}`,`
    <p class="s-verdict${mark==null?' lost':''}">${mark==null?(left?'Saliste: cuenta como nulo':'Nulo: 0 puntos'):`${fmt(ev,mark)} · +${p} puntos`}</p>
    <div class="s-best"><span class="lbl">Puntos</span><b>${s.pts}</b></div>
    <p class="small">Sigue: <b>${esc(EVENTS[evIdx(DECA_ORDER[s.k])].name)}</b></p>
    <div class="btns"><button class="btn" data-act="dnext" data-focus>Siguiente prueba</button><button class="btn alt" data-act="menu">Seguir después</button><button class="btn alt" data-act="dquit">Abandonar</button></div>`));
}
export const decaNext=()=>showDecaEvent();
// left the event from the pause: a foul, and on
export const leaveDeca=()=>decaAfterEvent(true);
export function decaQuit(b){
  if(b&&!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Terminar el hexadecatlón? Tocá de nuevo'; return; }
  if(G.deca) finish(true);
}
// the end (all played, or given up): the total, each event's points, best saved and sent to the world top 10
function finish(quit){
  const s=G.deca; G.deca=null; G.mode='single'; store.set(KEY(),null); setS(null); setScreen('menu');
  const best=recordSurv(s.pts,s.k,'deca'); syncMarks();
  const rows=s.log.map(r=>{ const ev=EVENTS[evIdx(r.ev)]; return `<tr><td class="nm">${esc(ev.name)}</td><td class="sub">${fmt(ev,r.mark)}</td><td class="mk">${r.pts}</td></tr>`; }).join('');
  showOv(card(best?'¡Nuevo récord!':quit?'Abandonaste':'¡Terminaste!',`
    <div class="s-final"><div><b>${s.pts}</b><span>puntos</span></div><div><b>${s.k}/${N}</b><span>pruebas</span></div></div>
    ${best?'':player()?.decaBest?`<p class="small">Tu mejor hexadecatlón: ${player().decaBest.pts} pts.</p>`:''}
    ${rows?`<div class="scroll"><table class="o-table d-table d-sum"><tbody>${rows}</tbody></table></div>`:''}
    <div class="btns"><button class="btn" data-act="dstart" data-focus>Jugar de nuevo</button><button class="btn alt" data-act="board" data-i="${BOARD_I}">Récords</button><button class="btn alt" data-act="menu">Menú</button></div>`));
}
