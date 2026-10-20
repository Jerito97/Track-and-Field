// Survival (the classic one): the 5 classic events in a random order against a single machine, round after round;
// the machine gets better every round. Beat it (or tie) in every event to keep going: the first event you lose ends
// the run. Each event won adds its points (the tournament points table), and each round got through a bonus. The best
// run is kept in the profile and the world top 10.
import {CLASSIC,EVENTS} from '../config.js';
import {newEvent,startPlay} from '../game/core.js';
import {fmt,pts} from '../game/scoring.js';
import {buildAthletes,G,setS,setScreen} from '../state.js';
import {player,recordSurv,store} from '../storage.js';
import {syncMarks} from './board.js';
import {art,showOv,THUMBS} from './screens.js';

// points for getting through a round (all 5 events), on top of each event's
const ROUND_BONUS=1000;
// the machine's mark per event and round, measured against simulated players: round 1 easy, round 4 like a casual
// player, 8 like a good one, 12 nearly an expert, 16 an expert's mark; after that 0.5% better every round
const STEPS=[1,4,8,12,16];
// (sprints start at the normal machines' level: they were much harder early on than the field events; the 100 m
// climbs gentler than the rest: there it's how fast the fingers go, and people tap slower than the simulated ones)
const LEVELS={'100':[13.2,12.0,10.8,9.4,8.4],'110h':[16.0,14.5,13.0,11.9,11.3],lj:[6.5,7.6,9.1,10.6,11.1],pv:[5.0,6.0,6.8,7.9,8.4],jav:[65,80,90,120,132]};
function targets(round){
  const t={};
  CLASSIC.forEach(ev=>{ const L=LEVELS[ev.id], sprint=ev.type==='sprint';
    let m;
    if(round>=STEPS[STEPS.length-1]){ const k=Math.pow(1.005,round-STEPS[STEPS.length-1]); m=sprint?L[L.length-1]/k:L[L.length-1]*k; }
    else { const i=STEPS.findIndex((r,j)=>round>=r&&round<STEPS[j+1]), u=(round-STEPS[i])/(STEPS[i+1]-STEPS[i]); m=L[i]+(L[i+1]-L[i])*u; }
    t[ev.id]=m; });
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

// the survival modes: the classic one (the 5 classic events) and the modern one (with the new events: coming soon)
export function showSurvModes(){
  setS(null); setScreen('menu');
  showOv(card('SUPERVIVENCIA','Elegí el modo',`
    <div class="t-two">
      <button class="t-opt" data-act="sclassic" data-focus><img class="t-img" src="assets/thumbs/survclas-sm.webp" alt=""><b>Clásica</b><span>Las 5 pruebas de siempre: 100 m, largo, vallas, garrocha y jabalina.</span></button>
      <button class="t-opt soon" disabled aria-disabled="true"><img class="t-img" src="assets/thumbs/survmod-sm.webp" alt=""><b>Moderna <i class="soon-tag">Próximamente</i></b><span>Con las pruebas nuevas.</span></button>
    </div>
    <div class="btns"><button class="btn alt" data-act="menu">Volver</button></div>`));
}
// start screen: how it works, your best run, play
export function showSurvival(){
  setS(null); setScreen('menu');
  const b=player()?.survBest, sv=saved();
  showOv(card('SUPERVIVENCIA','Clásica',`
    <div class="s-hero"><img src="assets/thumbs/survclas.webp" alt=""></div>
    ${sv?`<div class="o-code s-resume"><div><span class="lbl">Partida guardada</span><b>Ronda ${sv.round} · ${sv.pts} pts</b><small>${sv.k>=5?`Ronda ${sv.round} superada: sigue la ${sv.round+1}`:`Te toca ${EVENTS[sv.order[sv.k]]?.name||''} (${sv.k+1}/5)`}</small></div><button class="btn" data-act="sresume" data-focus>Seguir</button></div>`:''}
    <div class="s-best"><span class="lbl">Tu mejor partida</span><b>${b?`${b.pts} pts`:'—'}</b>${b?`<small>Llegaste a la ronda ${b.rounds+1}</small>`:''}</div>
    <div class="btns"><button class="btn${sv?' alt':''}" data-act="sstart"${sv?'':' data-focus'}>${sv?'Nueva partida':'Jugar'}</button><button class="btn alt" data-act="board" data-i="${EVENTS.length}">Récords</button><button class="btn alt" data-act="surv">Volver</button></div>`));
}
export function startSurvival(){
  // a new run replaces the saved one (asks once if there is one)
  if(saved()&&!startSurvival.sure){ startSurvival.sure=true; const b=document.querySelector('[data-act="sstart"]'); if(b){ b.textContent='¿Empezar de cero? Tocá de nuevo'; return; } }
  startSurvival.sure=false;
  G.mode='surv'; G.surv={round:1,order:shuffle(CLASSIC.map((e,i)=>i)),k:0,pts:0,won:0,log:[]}; keep();
  showSurvEvent();
}
export function resumeSurvival(){ const sv=saved(); if(!sv) return showSurvival(); G.mode='surv'; G.surv=sv; survNext(); }
// before each event: round, event, points so far, the round's events
function showSurvEvent(){
  const s=R(); setS(null); setScreen('menu');
  G.evIdx=s.order[s.k]; const ev=EVENTS[G.evIdx];
  buildAthletes(false,{name:'Máquina',target:targets(s.round)});
  // the round's progress: a dot per event (done, this one, still to come)
  const done=s.order.map((i,k)=>`<span class="s-step${k<s.k?' s-done':k===s.k?' s-now':''}" title="${EVENTS[i].name}">${k<s.k?'✓':k+1}</span>`).join('');
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
  s.k++; const roundDone=s.k>=5; if(roundDone) s.pts+=ROUND_BONUS; keep();
  setS(null); setScreen('menu');
  showOv(card(`RONDA ${s.round}`,tie?'¡Empate!':both?'Nulo los dos':'¡Le ganaste!',`
    <p class="s-verdict">${tie?'Empataste: seguís en carrera.':both?'Ninguno marcó: seguís en carrera.':`+${p} puntos`}</p>${line}
    <div class="s-best"><span class="lbl">Puntos</span><b>${s.pts}</b></div>
    ${roundDone?`<p class="small s-up"><b>¡Ronda ${s.round} superada! +${ROUND_BONUS} puntos de bonus.</b> En la próxima la máquina viene más fuerte.</p>`:''}
    <div class="btns"><button class="btn" data-act="snext" data-focus>${roundDone?`Ronda ${s.round+1}`:'Siguiente prueba'}</button><button class="btn alt" data-act="menu">Seguir después</button><button class="btn alt" data-act="squit">Abandonar</button></div>`));
}
export function survNext(){ const s=R(); if(s.k>=5){ s.round++; s.k=0; s.order=shuffle(CLASSIC.map((e,i)=>i)); keep(); } showSurvEvent(); }
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
