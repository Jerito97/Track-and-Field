// The daily challenge: one event a day, the same for everyone (the server picks it), one go: it's used as it starts, so
// leaving halfway or closing the game counts as a foul. The day's board, your place, your streak (days in a row
// played) and how yesterday's went. The main menu shows it in a slim bar over the modes.
import {EVENTS} from '../config.js';
import {newEvent,startPlay} from '../game/core.js';
import {fmt} from '../game/scoring.js';
import {dailyFinish,dailyStart,getDaily} from '../online.js';
import {buildAthletes,G,setS,setScreen} from '../state.js';
import {player,store} from '../storage.js';
import {art,esc,paintOv,place,showOv} from './screens.js';

let data=null, at=0, pid=null;
const evOf=id=>EVENTS.find(e=>e.id===id);
// a mark that couldn't be sent (no connection): sent the next time the challenge is asked for
const PEND='odb-dpend';
async function flushPending(){ const q=store.get(PEND,null); if(!q||q.pid!==player()?.id) return;
  try{ await dailyFinish(q.day,q.mark); store.set(PEND,null); }catch(e){ if(e.status&&e.status<500) store.set(PEND,null); } }
export const cachedDaily=()=>pid===player()?.id?data:null;
export async function loadDaily(force){
  const p=player(); if(!p) return null;
  if(!force&&data&&pid===p.id&&Date.now()-at<60000) return data;
  await flushPending();
  const d=await getDaily(p.token?p.id:null); data=d; pid=p.id; at=Date.now(); return d;
}
const left=t=>{ const ms=Math.max(0,new Date(t)-Date.now()), h=Math.floor(ms/3600e3); return h>=1?`${h} h`:`${Math.max(1,Math.round(ms/60000))} min`; };

// the menu's bar: today's event, your streak, Jugar (or how you did)
export function dailyBar(){
  const d=cachedDaily(), ev=d&&evOf(d.ev); if(!ev) return '';
  const me=d.me, done=me&&me.played;
  return `<span class="m-dk">⚡ Desafío del día</span><b>${esc(ev.name)}</b>${me&&me.streak>1?`<span class="m-ds">🔥 ${me.streak}</span>`:''}`
    +`<span class="m-dg${done?' done':''}">${done?(me.mark!=null?`${fmt(ev,me.mark)} · ${me.place}º de ${d.count}`:'Nulo'):'Jugar ›'}</span>`;
}
export function refreshDailyBar(){
  loadDaily().then(()=>{ const el=document.querySelector('.m-daily'); if(!el) return; const h=dailyBar(); el.innerHTML=h; el.hidden=!h; },()=>{});
}

const card=(title,body)=>`<div class="card o-card d-card"><div class="head"><div class="logo">DESAFÍO DEL DÍA</div><h2>${title}</h2></div><div class="body">${body}</div></div>`;
export async function showDaily(msg){
  setS(null); setScreen('menu');
  const p=player();
  if(!p?.token){ showOv(card('Desafío del día',`<p class="small">El desafío del día se juega con tu jugador registrado (con nombre y código).</p><div class="btns"><button class="btn alt" data-act="menu" data-focus>Volver</button></div>`)); return; }
  const c=cachedDaily(); if(!c) showOv(card('Desafío del día','<p class="small o-wait">Cargando…</p>'));
  let d; try{ d=await loadDaily(true); }
  catch(e){ showOv(card('Desafío del día',`<p class="o-err" role="alert">${esc(e.message)}</p><div class="btns"><button class="btn alt" data-act="menu" data-focus>Volver</button></div>`)); return; }
  const ev=evOf(d.ev); if(!ev) return;
  const me=d.me||{}, i=EVENTS.indexOf(ev);
  // the board brings the first 50: further down, you after them
  const out=me.played&&!d.top.some(r=>r.player_id===p.id);
  const rows=d.top.length?`<table class="o-table d-table"><tbody>${d.top.map((r,k)=>{ const pl=r.mark==null?'—':place(d.top,k,q=>q.mark==null?'x':fmt(ev,q.mark))+'.';
      return `<tr class="${r.player_id===p.id?'me':''}"><td>${pl}${r.mark!=null&&k<3?' '+['🥇','🥈','🥉'][k]:''}</td><td class="nm"><canvas data-color="${esc(r.color)}"></canvas>${esc(r.name)}</td><td class="mk">${r.mark==null?'Nulo':fmt(ev,r.mark)}</td></tr>`; }).join('')}${out?`<tr class="gap"><td></td><td class="nm">…</td><td></td></tr><tr class="me"><td>${me.place?me.place+'.':'—'}</td><td class="nm"><canvas data-color="${esc(p.color)}"></canvas>${esc(p.name)}</td><td class="mk">${me.mark==null?'Nulo':fmt(ev,me.mark)}</td></tr>`:''}</tbody></table>`
    :'<p class="small">Todavía nadie lo jugó hoy: ¡estrenalo!</p>';
  const y=d.yday, yev=evOf(y.ev), won=y.me&&y.me.place===1;
  const yline=y.winner&&yev?`<p class="small d-yday">Ayer (${esc(yev.name)}): ${won?`<b>¡ganaste vos!</b> con ${fmt(yev,y.winner.mark)}`:`ganó <b>${esc(y.winner.name)}</b> con ${fmt(yev,y.winner.mark)}${y.me?` · vos ${y.me.place?`${y.me.place}º de ${y.count}`:'nulo'}`:''}`}</p>`:'';
  const mine=me.played?`<div class="d-me"><span class="lbl">Tu resultado</span><b>${me.mark!=null?fmt(ev,me.mark):'Nulo'}</b>${me.place?`<small>${me.place}º de ${d.count}</small>`:''}</div>`
    :`<button class="btn d-play" data-act="dplay" data-focus>Jugar · 1 intento</button>`;
  showOv(card(esc(ev.name),`${msg?`<p class="o-err" role="alert">${esc(msg)}</p>`:''}
    <div class="d-top"><div class="d-pic">${art(i,true)}</div><div class="d-info">
      <p class="d-rules">1 intento (si salís o cerrás el juego, nulo) · termina en <b>${left(d.ends_at)}</b> · ${d.count} ${d.count===1?'jugó':'jugaron'}${me.streak?` · 🔥 racha de ${me.streak} ${me.streak===1?'día':'días'}`:''}</p>
      ${mine}</div></div>
    <span class="lbl">Tabla de hoy</span><div class="d-list">${rows}</div>${yline}
    <div class="btns"><button class="btn alt" data-act="menu"${me.played?' data-focus':''}>Volver</button></div>`));
  paintOv();
  // your row in sight (a long board)
  const toMe=()=>{ const r=document.querySelector('.d-list tr.me'); if(r) r.scrollIntoView({block:'center'}); };
  toMe(); document.fonts?.ready.then(()=>requestAnimationFrame(toMe));
}
// play it: the go is used on the server first (no connection: it can't be played)
export async function playDaily(){
  const d=cachedDaily(); if(!d) return showDaily();
  let r; try{ r=await dailyStart(d.ev); }catch(e){ data=null; return showDaily(e.message); }
  G.mode='daily'; G.dailyDay=r.day; G.dsent=false; G.evIdx=EVENTS.findIndex(e=>e.id===d.ev);
  // played alone, without the machines: only the others' marks matter
  buildAthletes(true); newEvent(G.evIdx); startPlay();
}
// the event ended (mark, or null for a foul / leaving halfway)
export function finishDaily(mark){
  if(G.dsent) return G.dsending; G.dsent=true; const day=G.dailyDay, pid=player().id;
  G.dsending=dailyFinish(day,mark).catch(()=>store.set(PEND,{pid,day,mark})).then(()=>{ data=null; });
  return G.dsending;
}
export async function leaveDaily(){ await finishDaily(null); showDaily(); }
export async function afterDaily(){ if(G.dsending) await G.dsending; showDaily(); }
