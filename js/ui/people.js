// Players: everyone registered, and each one's profile (best mark per event, its date and place in the world top).
// The menu shows a few of them at the bottom; the list and profiles come from the server.
import {OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {getPlayers,getProfile} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player} from '../storage.js';
import {catOf,esc,paintOv,recHidden,recTabs,showOv} from './screens.js';

let list=null, at=0, listOffline=false;
export const cachedPlayers=()=>list;
export async function loadPlayers(force){
  if(list&&!force&&Date.now()-at<60000) return list;
  const r=await getPlayers(); list=r.players; at=r.offline?0:Date.now(); listOffline=!!r.offline; return list;
}
const day=d=>{ const t=new Date(d); return isNaN(t)?'':t.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'}); };
const card=(logo,title,body,btns)=>`<div class="card u-card"><div class="head"><div class="logo">${logo}</div><h2>${title}</h2></div><div class="body">${body}<div class="btns">${btns}</div></div></div>`;
const MENU='<button class="btn alt" data-act="menu">Menú</button>';

// menu footer: a few heads (yours first) and how many players there are
export function peopleStrip(){
  const l=cachedPlayers(); if(!l) return '<span class="u-more">Ver todos ›</span>';
  const me=player()?.id, few=[...l.filter(p=>p.id===me),...l.filter(p=>p.id!==me)].slice(0,5);
  return `<span class="u-heads">${few.map(p=>`<span class="u-h"><canvas data-color="${esc(p.color)}"></canvas></span>`).join('')}</span><span class="u-more">${l.length} ${l.length===1?'jugador':'jugadores'} ›</span>`;
}
export function refreshStrip(){ loadPlayers().then(()=>{ const el=OV.querySelector('.m-people .u-row'); if(el){ el.innerHTML=peopleStrip(); paintOv(); } },()=>{}); }

let view=null;  // what's on screen, so a late answer doesn't replace another screen
// list: one per line, in alphabetical order, with a search box (ignores case and accents)
const fold=t=>String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const byName=(a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'});
function rows(l,q){ const me=player()?.id, f=fold(q.trim()), shown=l.filter(p=>!f||fold(p.name).includes(f)).sort(byName);
  if(!shown.length) return `<p class="small u-none">${l.length?'No hay ningún jugador con ese nombre.':'Todavía no hay jugadores.'}</p>`;
  return shown.map(p=>`<button class="u-item${p.id===me?' me':''}" data-act="person" data-id="${esc(p.id)}"><span class="p-av sm"><canvas data-color="${esc(p.color)}"></canvas></span><span class="u-nm"><b>${esc(p.name)}</b><small>${p.id===me?'Vos · ':''}${p.marks?`${p.marks} ${p.marks===1?'prueba':'pruebas'} con marca`:'Sin marcas todavía'}</small></span><i>›</i></button>`).join(''); }
let query='';
export async function showPeople(){
  view='list'; setS(null); setScreen('menu');
  const draw=(l,msg)=>{
    showOv(card('JUGADORES',l?`Todos los jugadores (${l.length})`:'Todos los jugadores',msg||`${listOffline?'<p class="small">Sin conexión: esta es la última lista que viste.</p>':''}<input id="usearch" class="u-search" type="search" placeholder="Buscar jugador…" autocomplete="off" value="${esc(query)}"><div class="u-list">${rows(l,query)}</div>`,
      '<button class="btn" data-act="menu" data-focus>Volver</button>'));
    const inp=OV.querySelector('#usearch'); if(inp) inp.addEventListener('input',()=>{ query=inp.value; OV.querySelector('.u-list').innerHTML=rows(l,query); paintOv(); }); };
  const c=cachedPlayers(); draw(c||[], c?'':'<p class="small o-wait">Cargando…</p>');
  try{ const l=await loadPlayers(true); if(view==='list'){ const inp=OV.querySelector('#usearch'), focused=inp&&document.activeElement===inp; draw(l); if(focused){ const n=OV.querySelector('#usearch'); n.focus(); n.setSelectionRange(n.value.length,n.value.length); } } }
  catch(e){ if(view==='list') draw(null,`<p class="o-err" role="alert">${esc(e.message)}</p>`); }
}
export async function showPerson(id){
  view=id; setS(null); setScreen('menu');
  const known=cachedPlayers()?.find(p=>p.id===id);
  showOv(card('JUGADOR',known?esc(known.name):'Jugador','<p class="small o-wait">Cargando…</p>','<button class="btn" data-act="people" data-focus>Volver</button>'+MENU));
  let r; try{ r=await getProfile(id); }
  catch(e){ if(view===id) showOv(card('JUGADOR','Jugador',`<p class="o-err" role="alert">${esc(e.message)}</p>`,'<button class="btn" data-act="people" data-focus>Volver</button>'+MENU)); return; }
  if(view!==id) return;
  const p=r.player, marks={}; r.marks.forEach(m=>{ marks[m.ev]=m; });
  const rows=EVENTS.map(ev=>{ const m=marks[ev.id];
    return `<tr data-pc="${catOf(ev)}"${recHidden(catOf(ev))}><td class="nm">${ev.tag.charAt(0)+ev.tag.slice(1).toLowerCase()}</td><td class="mk">${m?fmt(ev,m.mark):'—'}</td><td class="sub">${m?`${m.rank<=3?['🥇','🥈','🥉'][m.rank-1]+' ':''}${m.rank}º del mundo`:''}</td><td class="sub">${m?day(m.date):''}</td></tr>`; }).join('')
    +(()=>{ const m=marks.surv; return `<tr data-pc="surv"${recHidden('surv')}><td class="nm">Supervivencia clásica</td><td class="mk">${m?`${m.mark} pts`:'—'}</td><td class="sub">${m?`${m.rank<=3?['🥇','🥈','🥉'][m.rank-1]+' ':''}${m.rank}º del mundo · ronda ${(m.rounds||0)+1}`:''}</td><td class="sub">${m?day(m.date):''}</td></tr>`; })();
  showOv(card('JUGADOR','Perfil',`
    <div class="p-row"><span class="p-av"><canvas data-color="${esc(p.color)}"></canvas></span><div><b class="u-big">${esc(p.name)}</b><p class="small">${p.id===player()?.id?'Sos vos · ':''}Juega desde el ${day(p.created_at)}</p></div></div>
    <span class="lbl">Récords</span>${recTabs()}<table class="b-table u-recs"><tbody>${rows}</tbody></table>`,
    '<button class="btn" data-act="people" data-focus>Volver</button>'+MENU));
}
