// Survival: 5 events in a random order against a single machine, round after round; the machine gets better every
// round. Beat it (or tie) in every event to keep going: the first event you lose ends the run. Each event won adds its
// points (the tournament points table), and each round got through a bonus. Two modes, each with its own events,
// saved run, best run (in the profile) and world top 10: the classic one (the 5 classic events) and the modern one
// (relay, triple jump, hammer, crawl and cycling).
import {EVENTS} from '../config.js';
import {newEvent,startPlay} from '../game/core.js';
import {fmt,pts} from '../game/scoring.js';
import {buildAthletes,G,setS,setScreen} from '../state.js';
import {player,recordSurv,store,survBestKey} from '../storage.js';
import {syncMarks} from './board.js';
import {art,showOv,THUMBS} from './screens.js';

// points for getting through a round (all 5 events), on top of each event's
const ROUND_BONUS=1000;
// the machine's mark per event and round. Every event on the same scale, from simulated players' marks (casual 0,
// expert 1; the median of a few runs each): round 1 at -.4 of it, round 4 at -.05 (a casual player), 8 at .27, 12 at
// .77, 16 at .97 (an expert's mark); after that 0.5% better every round. The 100 m and the hurdles are mostly how fast
// the fingers go, where people fall behind the simulated players: there they count 15% and 8% slower
// (the pole vault climbs gentler than that: a few cm a round)
// The modern one: each round as far beyond its event's normal machines as the classic one's are beyond theirs (the
// relay and the crawl, mostly fingers, like the 100 m and the hurdles; the triple jump and the hammer like the long
// jump and the javelin); cycling on its own scale (it can't get much faster than a perfect rider, ~32.6 s): round 4
// the normal machines', 16 close to perfect
const STEPS=[1,4,8,12,16];
const MODES={
  classic:{id:'surv',name:'Clásica',img:'survclas',evs:['100','lj','110h','pv','jav'],
    levels:{'100':[13.1,11.9,10.8,9.0,8.3],'110h':[15.0,14.0,13.1,12.1,11.7],lj:[6.3,7.6,8.8,10.6,11.2],pv:[5.6,5.9,6.3,6.8,7.3],jav:[62,80,96,121,131]}},
  modern:{id:'survm',name:'Moderna',img:'survmod',evs:['4x100','tj','ham','crawl','cycle'],
    levels:{'4x100':[36.3,33.4,30.8,27.0,25.4],tj:[14.9,17.6,19.8,22.5,24.0],ham:[46,55,62,73,79],crawl:[21.8,20.0,18.5,16.2,15.3],cycle:[44,40,37.5,34.5,33.0]}}};
// the mode being played (the run in progress says which), or the one on screen
let shownMode='classic';
const M=()=>MODES[(G.surv&&G.surv.mode)||shownMode];
const evIdx=id=>EVENTS.findIndex(e=>e.id===id);
// its board's index on the records screen (after the events: classic, then modern)
const boardI=m=>EVENTS.length+(m.id==='survm'?1:0);
function targets(m,round){
  const t={};
  m.evs.map(id=>EVENTS[evIdx(id)]).forEach(ev=>{ const L=m.levels[ev.id], sprint=ev.type==='sprint';
    let v;
    if(round>=STEPS[STEPS.length-1]){ const k=Math.pow(1.005,round-STEPS[STEPS.length-1]); v=sprint?L[L.length-1]/k:L[L.length-1]*k; }
    else { const i=STEPS.findIndex((r,j)=>round>=r&&round<STEPS[j+1]), u=(round-STEPS[i])/(STEPS[i+1]-STEPS[i]); v=L[i]+(L[i+1]-L[i])*u; }
    t[ev.id]=v; });
  return t;
}
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const card=(logo,title,body)=>`<div class="card s-card"><div class="head"><div class="logo">${logo}</div><h2>${title}</h2></div><div class="body">${body}</div></div>`;
const R=()=>G.surv;
// the run in progress is kept on the phone (per player) after every step: leaving the game, or closing it, and coming
// back later continues from the event that was next (an event left halfway starts over)
const KEY=m=>`odb-${m.id}-`+(player()?.id||'');
const saved=(m=M())=>store.get(KEY(m),null);
const keep=()=>store.set(KEY(M()),G.surv);

// the survival modes: the classic one and the modern one
export function showSurvModes(){
  setS(null); setScreen('menu');
  showOv(card('SUPERVIVENCIA','Elegí el modo',`
    <div class="t-two">
      <button class="t-opt" data-act="sclassic" data-focus><img class="t-img" src="assets/thumbs/survclas-sm.webp" alt=""><b>Clásica</b><span>Las 5 pruebas de siempre: 100 m, largo, vallas, garrocha y jabalina.</span></button>
      <button class="t-opt" data-act="smodern"><img class="t-img" src="assets/thumbs/survmod-sm.webp" alt=""><b>Moderna</b><span>Las pruebas nuevas: posta, triple, martillo, crawl y ciclismo.</span></button>
    </div>
    <div class="btns"><button class="btn alt" data-act="menu">Volver</button></div>`));
}
// start screen: how it works, your best run, play
export function showSurvival(mode=shownMode){
  shownMode=mode; setS(null); setScreen('menu');
  const m=MODES[mode], b=player()?.[survBestKey(m.id)], sv=saved(m);
  showOv(card('SUPERVIVENCIA',m.name,`
    <div class="s-hero"><img src="assets/thumbs/${m.img}.webp" alt=""></div>
    ${sv?`<div class="o-code s-resume"><div><span class="lbl">Partida guardada</span><b>Ronda ${sv.round} · ${sv.pts} pts</b><small>${sv.k>=5?`Ronda ${sv.round} superada: sigue la ${sv.round+1}`:`Te toca ${EVENTS[sv.order[sv.k]]?.name||''} (${sv.k+1}/5)`}</small></div><button class="btn" data-act="sresume" data-focus>Seguir</button></div>`:''}
    <div class="s-best"><span class="lbl">Tu mejor partida</span><b>${b?`${b.pts} pts`:'—'}</b>${b?`<small>Llegaste a la ronda ${b.rounds+1}</small>`:''}</div>
    <div class="btns"><button class="btn${sv?' alt':''}" data-act="sstart"${sv?'':' data-focus'}>${sv?'Nueva partida':'Jugar'}</button><button class="btn alt" data-act="board" data-i="${boardI(m)}">Récords</button><button class="btn alt" data-act="surv">Volver</button></div>`));
}
export function startSurvival(){
  // a new run replaces the saved one (asks once if there is one)
  if(saved()&&!startSurvival.sure){ startSurvival.sure=true; const b=document.querySelector('[data-act="sstart"]'); if(b){ b.textContent='¿Empezar de cero? Tocá de nuevo'; return; } }
  startSurvival.sure=false;
  const m=MODES[shownMode];
  G.mode='surv'; G.surv={mode:shownMode,round:1,order:shuffle(m.evs.map(evIdx)),k:0,pts:0,won:0,log:[]}; keep();
  showSurvEvent();
}
export function resumeSurvival(){ const sv=saved(MODES[shownMode]); if(!sv) return showSurvival(); G.mode='surv'; G.surv={mode:shownMode,...sv}; survNext(); }
// before each event: round, event, points so far, the round's events
function showSurvEvent(){
  const s=R(); setS(null); setScreen('menu');
  G.evIdx=s.order[s.k]; const ev=EVENTS[G.evIdx];
  buildAthletes(false,{name:'Máquina',target:targets(M(),s.round)});
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
export function survNext(){ const s=R(); if(s.k>=5){ s.round++; s.k=0; s.order=shuffle(M().evs.map(evIdx)); keep(); } showSurvEvent(); }
// the run ends (lost an event, or left): points, how far, best run saved and sent to the world top 10
export function survQuit(b){
  if(b&&!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Terminar la partida? Tocá de nuevo'; return; }
  if(G.mode==='surv'&&R()) gameOver('<p class="s-verdict lost">Abandonaste</p>'); }
function gameOver(head){
  const s=R(), m=M(); shownMode=s.mode||'classic'; G.surv=null; G.mode='single'; store.set(KEY(m),null); setS(null); setScreen('menu');
  const rounds=s.round-1, best=recordSurv(s.pts,rounds,m.id); syncMarks();
  showOv(card('SUPERVIVENCIA '+m.name.toUpperCase(),best?'¡Nuevo récord!':'Fin de la partida',`${head}
    <div class="s-final"><div><b>${s.pts}</b><span>puntos</span></div><div><b>${s.round}</b><span>ronda</span></div><div><b>${s.won}</b><span>${s.won===1?'prueba ganada':'pruebas ganadas'}</span></div></div>
    ${best?'':`<p class="small">Tu mejor partida: ${player()[survBestKey(m.id)].pts} pts.</p>`}
    <div class="btns"><button class="btn" data-act="sstart" data-focus>Jugar de nuevo</button><button class="btn alt" data-act="board" data-i="${boardI(m)}">Récords</button><button class="btn alt" data-act="menu">Menú</button></div>`));
}
