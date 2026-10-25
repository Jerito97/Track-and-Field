// Friends: adding someone sends them a request; once they accept, you're friends both ways (if they had asked you,
// right away). Records has a board of you and your friends next to the world's; the main menu shows a few of them.
// Here: the requests to you (accept or turn down), your friends, a search box to ask anyone registered, and the list
// of everyone. A friend is taken off (or a request taken back) from their profile.
import {$,OV} from '../canvas.js';
import {acceptFriend,addFriend,delFriend,getFriends,rejectFriend} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player} from '../storage.js';
import {loadPlayers} from './people.js';
import {esc,paintOv,showOv} from './screens.js';

// your friends and the requests (to you, yours) as the server sent them last, whose they are, when
let data={friends:[],incoming:[],outgoing:[]}, fPid=null, fAt=0;
const mine=()=>fPid===player()?.id?data:{friends:[],incoming:[],outgoing:[]};
export const myFriends=()=>mine().friends;
export const myRequests=()=>mine().incoming;
// with a player: 'friend', 'out' (you asked them), 'in' (they asked you) or null
export const relation=id=>{ const d=mine(); return d.friends.some(f=>f.id===id)?'friend':d.outgoing.some(f=>f.id===id)?'out':d.incoming.some(f=>f.id===id)?'in':null; };
export const isFriend=id=>relation(id)==='friend';
export async function loadFriends(force){
  const pid=player()?.id; if(!player()?.token) return [];
  if(!force&&fPid===pid&&Date.now()-fAt<60000) return myFriends();
  const d=await getFriends(); if(player()?.id===pid){ data=d; fPid=pid; fAt=Date.now(); } return myFriends();
}

const card=(title,body,btns)=>`<div class="card g-card"><div class="head"><div class="logo">AMIGOS</div><h2>${title}</h2></div><div class="body">${body}<div class="btns">${btns}</div></div></div>`;
const err=m=>m?`<p class="o-err" role="alert">${esc(m)}</p>`:'';
const head=c=>`<span class="p-av sm"><canvas data-color="${esc(c)}"></canvas></span>`;
const fold=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const byName=(a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'});

// the menu's strip: a few heads (yours first) and how many friends
export function friendsStrip(){
  const p=player(); if(!p?.token) return '<span class="u-more">Ver jugadores ›</span>';
  const l=myFriends(), few=[{color:p.color},...l].slice(0,5);
  return `<span class="u-heads">${few.map(f=>`<span class="u-h"><canvas data-color="${esc(f.color)}"></canvas></span>`).join('')}</span><span class="u-more">${l.length?`${l.length} ${l.length===1?'amigo':'amigos'} ›`:'Agregar amigos ›'}</span>`;
}
export function refreshFriendsStrip(){ loadFriends().then(()=>{ const el=OV.querySelector('.m-people .u-row'); if(el){ el.innerHTML=friendsStrip(); paintOv(); } },()=>{}); }

// your friends; typing in the box, everyone registered with that name (to add them)
let query='', all=null;
export async function showFriends(msg){
  setS(null); setScreen('menu');
  const back='<button class="btn alt" data-act="menu" data-focus>Volver</button>', people='<button class="btn alt" data-act="people">Todos los jugadores</button>';
  if(!player()?.token){ showOv(card('Amigos','<p class="small">Para tener amigos necesitás tu jugador con código.</p>','<button class="btn" data-act="protect">Poner código</button>'+people+back)); return; }
  const draw=wait=>{ const n=myFriends().length;
    showOv(card(n?`Amigos (${n})`:'Amigos',`${err(msg)}
      <input id="fsearch" class="u-search" type="search" placeholder="Buscá un jugador para mandarle solicitud…" autocomplete="off" value="${esc(query)}">
      <div class="u-list scroll" id="flist">${wait?'<p class="small o-wait">Cargando…</p>':rows()}</div>`,
      `<button class="btn" data-act="board" data-group="friends">Récords de amigos</button>${people}${back}`));
    paintOv();
    const inp=$('fsearch'); inp.addEventListener('input',()=>{ query=inp.value; $('flist').innerHTML=rows(); paintOv(); }); };
  draw(!myFriends().length&&fPid!==player().id);
  try{ await loadFriends(true); if(OV.querySelector('#flist')) draw(); }catch(e){ if(OV.querySelector('#flist')){ msg=e.message; draw(); } }
  loadPlayers().then(l=>{ all=l; if(query.trim()&&OV.querySelector('#flist')){ $('flist').innerHTML=rows(); paintOv(); } },()=>{});
}
// what goes at the right of a player: by how you are with them
export const relBtn=(id,from)=>{ const r=relation(id), d=from?` data-from="${from}"`:'';
  return r==='friend'?'<span class="o-in">Amigo ✓</span>':r==='out'?'<span class="o-in f-pend">Pendiente</span>'
    :r==='in'?`<button class="btn" data-act="faccept" data-id="${esc(id)}"${d}>Aceptar</button><button class="btn alt" data-act="freject" data-id="${esc(id)}"${d}>Rechazar</button>`
    :`<button class="btn" data-act="fadd" data-id="${esc(id)}"${d}>Agregar</button>`; };
function rows(){
  const me=player()?.id, f=fold(query.trim());
  if(!f){ const l=myFriends().slice().sort(byName), req=myRequests();
    const reqs=req.length?`<span class="lbl">Solicitudes (${req.length})</span>`+req.map(p=>`<div class="u-item o-invp f-req">${head(p.color)}<span class="u-nm"><b>${esc(p.name)}</b><small>quiere ser tu amigo</small></span>${relBtn(p.id)}</div>`).join('')+(l.length?'<span class="lbl">Tus amigos</span>':''):'';
    return reqs+(l.length?l.map(p=>`<button class="u-item" data-act="person" data-id="${esc(p.id)}" data-back="friends">${head(p.color)}<span class="u-nm"><b>${esc(p.name)}</b></span><i>›</i></button>`).join('')
      :req.length?'':'<p class="small">Todavía no tenés amigos. Buscá jugadores por su nombre acá arriba y mandales una solicitud: cuando la acepten, vas a ver sus récords junto a los tuyos en Récords › Amigos.</p>'); }
  if(!all) return '<p class="small o-wait">Cargando jugadores…</p>';
  const hits=all.filter(p=>p.id!==me&&fold(p.name).includes(f)).sort(byName).slice(0,30);
  return hits.length?hits.map(p=>`<div class="u-item o-invp">${head(p.color)}<span class="u-nm"><b>${esc(p.name)}</b></span>${relBtn(p.id)}</div>`).join('')
    :'<p class="small">No hay ningún jugador con ese nombre.</p>';
}
const redraw=()=>{ const el=OV.querySelector('#flist'); if(el){ el.innerHTML=rows(); paintOv(); const h=OV.querySelector('.g-card h2'), n=myFriends().length; if(h) h.textContent=n?`Amigos (${n})`:'Amigos'; } };
// send a request, accept or turn one down (from the list, or from their profile: after() redraws it there); take off
// a friend or take back a request (from their profile)
let busy=false;
async function act(b,fn,after){
  if(busy) return; busy=true; b.disabled=true; const was=b.textContent; b.textContent='…';
  try{ await fn(b.dataset.id); await loadFriends(true); (after||redraw)(); }
  catch(e){ b.disabled=false; b.textContent=was; if(!after) showFriends(e.message); }
  finally{ busy=false; }
}
export const onAddFriend=(b,after)=>act(b,addFriend,after);
export const onAcceptFriend=(b,after)=>act(b,acceptFriend,after);
export const onRejectFriend=(b,after)=>act(b,rejectFriend,after);
export async function onDelFriend(b,after){
  if(busy) return;
  if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent=relation(b.dataset.id)==='out'?'¿Cancelar? Tocá de nuevo':'¿Quitar? Tocá de nuevo'; return; }
  busy=true; b.disabled=true;
  try{ await delFriend(b.dataset.id); await loadFriends(true); }catch(e){ /* stays as it was */ }
  finally{ busy=false; } after();
}
