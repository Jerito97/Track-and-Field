// Friends: your list of players (adding someone doesn't need their yes). Records has a board of you and your friends
// next to the world's; the main menu shows a few of them. Here: your friends, a search box to add anyone registered,
// and the list of everyone. A friend is taken off from their profile.
import {$,OV} from '../canvas.js';
import {addFriend,delFriend,getFriends} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player} from '../storage.js';
import {loadPlayers} from './people.js';
import {esc,paintOv,showOv} from './screens.js';

let friends=[], fPid=null, fAt=0;  // your friends as the server sent them last, whose they are, when
export const myFriends=()=>fPid===player()?.id?friends:[];
export const isFriend=id=>myFriends().some(f=>f.id===id);
export async function loadFriends(force){
  const pid=player()?.id; if(!player()?.token) return [];
  if(!force&&fPid===pid&&Date.now()-fAt<60000) return friends;
  const l=await getFriends(); if(player()?.id===pid){ friends=l; fPid=pid; fAt=Date.now(); } return myFriends();
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
      <input id="fsearch" class="u-search" type="search" placeholder="Buscá un jugador para agregarlo…" autocomplete="off" value="${esc(query)}">
      <div class="u-list scroll" id="flist">${wait?'<p class="small o-wait">Cargando…</p>':rows()}</div>`,
      `<button class="btn" data-act="board" data-group="friends">Récords de amigos</button>${people}${back}`));
    paintOv();
    const inp=$('fsearch'); inp.addEventListener('input',()=>{ query=inp.value; $('flist').innerHTML=rows(); paintOv(); }); };
  draw(!myFriends().length&&fPid!==player().id);
  try{ await loadFriends(true); if(OV.querySelector('#flist')) draw(); }catch(e){ if(OV.querySelector('#flist')){ msg=e.message; draw(); } }
  loadPlayers().then(l=>{ all=l; if(query.trim()&&OV.querySelector('#flist')){ $('flist').innerHTML=rows(); paintOv(); } },()=>{});
}
function rows(){
  const me=player()?.id, f=fold(query.trim());
  if(!f){ const l=myFriends().slice().sort(byName);
    return l.length?l.map(p=>`<button class="u-item" data-act="person" data-id="${esc(p.id)}" data-back="friends">${head(p.color)}<span class="u-nm"><b>${esc(p.name)}</b></span><i>›</i></button>`).join('')
      :'<p class="small">Todavía no agregaste amigos. Buscalos por su nombre acá arriba: después vas a ver sus récords junto a los tuyos en Récords › Amigos.</p>'; }
  if(!all) return '<p class="small o-wait">Cargando jugadores…</p>';
  const hits=all.filter(p=>p.id!==me&&fold(p.name).includes(f)).sort(byName).slice(0,30);
  return hits.length?hits.map(p=>`<div class="u-item o-invp">${head(p.color)}<span class="u-nm"><b>${esc(p.name)}</b></span>${isFriend(p.id)?'<span class="o-in">Amigo ✓</span>':`<button class="btn" data-act="fadd" data-id="${esc(p.id)}">Agregar</button>`}</div>`).join('')
    :'<p class="small">No hay ningún jugador con ese nombre.</p>';
}
// add one (from the search, or from their profile); take one off (from their profile)
let busy=false;
export async function onAddFriend(b,after){
  if(busy) return; busy=true; b.disabled=true; b.textContent='…';
  try{ await addFriend(b.dataset.id); await loadFriends(true); if(after) after(); else { b.outerHTML='<span class="o-in">Amigo ✓</span>'; } }
  catch(e){ b.disabled=false; b.textContent='Agregar'; if(!after) showFriends(e.message); }
  finally{ busy=false; }
}
export async function onDelFriend(b,after){
  if(busy) return;
  if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Quitar? Tocá de nuevo'; return; }
  busy=true; b.disabled=true;
  try{ await delFriend(b.dataset.id); await loadFriends(true); }catch(e){ /* stays as it was */ }
  finally{ busy=false; } after();
}
