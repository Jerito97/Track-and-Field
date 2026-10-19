// Survival: the 5 events in a random order against a single machine, round after round; the machine gets better
// every round. Beat it (or tie) in every event to keep going: the first event you lose ends the run. Each event won
// adds its points (the tournament points table). The best run is kept in the profile and the world top 10.
import {EVENTS} from '../config.js';
import {newEvent,startPlay} from '../game/core.js';
import {fmt,pts} from '../game/scoring.js';
import {buildAthletes,G,setS,setScreen} from '../state.js';
import {player,recordSurv,store} from '../storage.js';
import {syncMarks} from './board.js';
import {art,showOv,THUMBS} from './screens.js';

// the machine's mark per event: easy in round 1, very hard by round 9, and still a bit better every round after that
const EASY={'100':12.8,'110h':16.8,lj:6.2,pv:3.8,jav:55}, HARD={'100':7.6,'110h':11.3,lj:11.6,pv:7.9,jav:122};
function targets(round){
  const d=Math.min(1,(round-1)/8), extra=Math.max(0,round-9)*.015, t={};
  EVENTS.forEach(ev=>{ const m=EASY[ev.id]+(HARD[ev.id]-EASY[ev.id])*Math.pow(d,.9); t[ev.id]=ev.type==='sprint'?m*(1-extra):m*(1+extra); });
  return t;
}
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const card=(logo,title,body)=>`<div class="card s-card"><div class="head"><div class="logo">${logo}</div><h2>${title}</h2></div><div class="body">${body}</div></div>`;
const R=()=>G.surv;
// the run in progress is kept on the phone (per player) after every step: leaving the game, or closing it, and coming
// back later continues from the event that was next (an event left halfway starts over)
const KEY=()=>'odb-surv-'+(player()?.id||'');
const saved=()=>store.get(KEY(),null);
const keep=()=>store.set(KEY(),G.surv);

// start screen: how it works, your best run, play
export function showSurvival(){
  setS(null); setScreen('menu');
  const b=player()?.survBest, sv=saved();
  showOv(card('SUPERVIVENCIA','Ganale a la máquina',`
    ${sv?`<div class="o-code s-resume"><div><span class="lbl">Partida guardada</span><b>Ronda ${sv.round} · ${sv.pts} pts</b><small>${sv.k>=5?`Ronda ${sv.round} superada: sigue la ${sv.round+1}`:`Te toca ${EVENTS[sv.order[sv.k]]?.name||''} (${sv.k+1}/5)`}</small></div><button class="btn" data-act="sresume" data-focus>Seguir</button></div>`:''}
    <p class="small">Las 5 pruebas en orden al azar contra <b>una sola máquina</b>. Cada ronda de 5 pruebas, la máquina mejora. Ganale (o empatale) en todas para seguir: <b>la primera prueba que perdés, se termina</b>. Cada prueba ganada suma sus puntos.</p>
    <div class="s-best"><span class="lbl">Tu mejor partida</span><b>${b?`${b.pts} pts`:'—'}</b>${b?`<small>Llegaste a la ronda ${b.rounds+1}</small>`:''}</div>
    <div class="btns"><button class="btn${sv?' alt':''}" data-act="sstart"${sv?'':' data-focus'}>${sv?'Nueva partida':'Jugar'}</button><button class="btn alt" data-act="board" data-i="${EVENTS.length}">Récords</button><button class="btn alt" data-act="menu">Volver</button></div>`));
}
export function startSurvival(){
  // a new run replaces the saved one (asks once if there is one)
  if(saved()&&!startSurvival.sure){ startSurvival.sure=true; const b=document.querySelector('[data-act="sstart"]'); if(b){ b.textContent='¿Empezar de cero? Tocá de nuevo'; return; } }
  startSurvival.sure=false;
  G.mode='surv'; G.surv={round:1,order:shuffle(EVENTS.map((e,i)=>i)),k:0,pts:0,won:0,log:[]}; keep();
  showSurvEvent();
}
export function resumeSurvival(){ const sv=saved(); if(!sv) return showSurvival(); G.mode='surv'; G.surv=sv; survNext(); }
// before each event: round, event, points so far, the round's events
function showSurvEvent(){
  const s=R(); setS(null); setScreen('menu');
  G.evIdx=s.order[s.k]; const ev=EVENTS[G.evIdx];
  buildAthletes(false,{name:'Máquina',target:targets(s.round)});
  const done=s.order.map((i,k)=>`<span class="s-step${k<s.k?' ok':k===s.k?' now':''}">${EVENTS[i].tag}</span>`).join('');
  showOv(card(`RONDA ${s.round}`,`${ev.name} · ${s.k+1}/5`,`
    <div class="row2"><div class="pict${THUMBS[ev.id]?' img':''}">${art(G.evIdx)}</div>
      <div class="s-side"><div class="s-steps">${done}</div>
        <div class="s-best"><span class="lbl">Puntos</span><b>${s.pts}</b><small>${s.won} ${s.won===1?'prueba ganada':'pruebas ganadas'}</small></div>
        <div class="menu"><button class="mi play" data-act="splay" data-focus>Jugar</button><button class="mi" data-act="menu">Seguir después</button><button class="mi" data-act="squit">Abandonar</button></div></div></div>`));
}
export function playSurv(){ newEvent(G.evIdx); startPlay(); }
// after the results table: won, tied or lost against the machine
export function survAfterEvent(){
  const s=R(), ev=EVENTS[G.evIdx], vals=G.res[ev.id], me=vals[0], cpu=vals[1], sprint=ev.type==='sprint';
  const beat=me!=null&&(cpu==null||(sprint?me<=cpu:me>=cpu)), tie=me!=null&&cpu!=null&&me===cpu;
  const both=me==null&&cpu==null;  // both fouled: nobody beat anybody, keep going
  const line=`<div class="s-vs"><div><span class="lbl">Vos</span><b>${fmt(ev,me)}</b></div><i>vs</i><div><span class="lbl">Máquina</span><b>${fmt(ev,cpu)}</b></div></div>`;
  if(!beat&&!both) return gameOver(`<p class="s-verdict lost">Perdiste en ${ev.name}</p>${line}`);
  const p=beat?pts(ev,me):0; s.pts+=p; if(beat) s.won++; s.log.push({ev:ev.id,round:s.round,me,cpu,pts:p});
  s.k++; const roundDone=s.k>=5; keep();
  setS(null); setScreen('menu');
  showOv(card(`RONDA ${s.round}`,tie?'¡Empate!':both?'Nulo los dos':'¡Le ganaste!',`
    <p class="s-verdict">${tie?'Empataste: seguís en carrera.':both?'Ninguno marcó: seguís en carrera.':`+${p} puntos`}</p>${line}
    <div class="s-best"><span class="lbl">Puntos</span><b>${s.pts}</b></div>
    ${roundDone?`<p class="small s-up"><b>¡Ronda ${s.round} superada!</b> En la próxima la máquina viene más fuerte.</p>`:''}
    <div class="btns"><button class="btn" data-act="snext" data-focus>${roundDone?`Ronda ${s.round+1}`:'Siguiente prueba'}</button><button class="btn alt" data-act="menu">Seguir después</button><button class="btn alt" data-act="squit">Abandonar</button></div>`));
}
export function survNext(){ const s=R(); if(s.k>=5){ s.round++; s.k=0; s.order=shuffle(EVENTS.map((e,i)=>i)); keep(); } showSurvEvent(); }
// the run ends (lost an event, or left): points, how far, best run saved and sent to the world top 10
export function survQuit(b){
  if(b&&!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Terminar la partida? Tocá de nuevo'; return; }
  if(G.mode==='surv'&&R()) gameOver('<p class="s-verdict lost">Abandonaste</p>'); }
function gameOver(head){
  const s=R(); G.surv=null; G.mode='single'; store.set(KEY(),null); setS(null); setScreen('menu');
  const rounds=s.round-1, best=recordSurv(s.pts,rounds); syncMarks();
  showOv(card('SUPERVIVENCIA',best?'¡Nuevo récord!':'Fin de la partida',`${head}
    <div class="s-final"><div><b>${s.pts}</b><span>puntos</span></div><div><b>${s.round}</b><span>ronda</span></div><div><b>${s.won}</b><span>${s.won===1?'prueba ganada':'pruebas ganadas'}</span></div></div>
    ${best?'':`<p class="small">Tu mejor partida: ${player().survBest.pts} pts.</p>`}
    <div class="btns"><button class="btn" data-act="sstart" data-focus>Jugar de nuevo</button><button class="btn alt" data-act="board" data-i="${EVENTS.length}">Récords</button><button class="btn alt" data-act="menu">Menú</button></div>`));
}
