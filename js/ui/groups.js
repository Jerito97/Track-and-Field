// Groups of friends: compare records only among them. Create one, add players already registered (searching by
// name), leave it; who created it can remove people. The groups' boards are in Récords (one tab per group).
import {$,OV} from '../canvas.js';
import {addToGroup,createGroup,getGroups,leaveGroup,removeFromGroup} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player} from '../storage.js';
import {loadPlayers} from './people.js';
import {esc,paintOv,showOv} from './screens.js';

let groups=[], gPid=null;  // your groups (with members) as the server sent them last, and whose they are
export const myGroups=()=>gPid===player()?.id?groups:[];
export const groupName=id=>myGroups().find(g=>g.id===id)?.name||'Grupo';
export async function loadGroups(){ const pid=player()?.id; const g=await getGroups(); if(player()?.id===pid){ groups=g; gPid=pid; } return myGroups(); }

const card=(title,body,btns)=>`<div class="card g-card"><div class="head"><div class="logo">GRUPOS</div><h2>${title}</h2></div><div class="body">${body}<div class="btns">${btns}</div></div></div>`;
const err=m=>m?`<p class="o-err" role="alert">${esc(m)}</p>`:'';
const head=c=>`<span class="p-av sm"><canvas data-color="${esc(c)}"></canvas></span>`;

// your groups and a box to create one
export async function showGroups(msg){
  setS(null); setScreen('menu');
  if(!player()?.token){ showOv(card('Tus grupos','<p class="small">Para tener grupos necesitás tu jugador con código.</p>','<button class="btn" data-act="protect">Poner código</button><button class="btn alt" data-act="menu">Volver</button>')); return; }
  const draw=(m,wait)=>{ showOv(card('Tus grupos',`${err(m)}
    <div class="g-new"><input id="gname" maxlength="24" placeholder="Nombre del grupo nuevo" autocomplete="off"><button class="btn" data-act="gcreate">Crear</button></div>
    ${wait?'<p class="small o-wait">Cargando…</p>':myGroups().length?`<div class="u-list scroll">${myGroups().map(g=>`<button class="u-item" data-act="group" data-id="${esc(g.id)}"><span class="g-heads">${g.members.slice(0,4).map(x=>head(x.color)).join('')}</span><span class="u-nm"><b>${esc(g.name)}</b><small>${g.members.length} ${g.members.length===1?'jugador':'jugadores'}</small></span><i>›</i></button>`).join('')}</div>`
      :'<p class="small">Todavía no estás en ningún grupo. Creá uno y sumá a tus amigos para comparar récords entre ustedes.</p>'}`,
    '<button class="btn alt" data-act="board" data-focus>Récords</button><button class="btn alt" data-act="menu">Menú</button>'));
    paintOv(); $('gname').addEventListener('keydown',e=>{ if(e.key==='Enter') OV.querySelector('[data-act="gcreate"]').click(); }); };
  draw(msg,!myGroups().length);
  try{ await loadGroups(); if(OV.querySelector('.g-card #gname')) draw(msg); }catch(e){ if(OV.querySelector('.g-card #gname')) draw(e.message); }
}
let busy=false;
const guard=async fn=>{ if(busy) return; busy=true; try{ await fn(); }finally{ busy=false; } };
export const onCreateGroup=()=>guard(async()=>{
  const name=$('gname').value.trim(); if(name.length<2) return showGroups('El nombre del grupo tiene que tener al menos 2 letras.');
  try{ const id=await createGroup(name); await loadGroups(); showGroup(id); }catch(e){ showGroups(e.message); }
});

// one group: its members, add someone, see its records, leave
let shownG=null, query='';
export async function showGroup(id,msg){
  shownG=id; setS(null); setScreen('menu');
  const g=myGroups().find(x=>x.id===id); if(!g) return showGroups();
  const me=player().id, owner=g.owner_id===me;
  showOv(card(esc(g.name),`${err(msg)}
    <span class="lbl">Integrantes (${g.members.length})</span>
    <div class="u-list scroll">${g.members.map(m=>`<div class="u-item g-mem${m.id===me?' me':''}">${head(m.color)}<span class="u-nm"><b>${esc(m.name)}</b><small>${m.id===g.owner_id?'Creó el grupo':''}${m.id===me?(m.id===g.owner_id?' · ':'')+'Vos':''}</small></span>${owner&&m.id!==me?`<button class="btn alt g-x" data-act="gremove" data-id="${esc(m.id)}" aria-label="Sacar a ${esc(m.name)}">Sacar</button>`:''}</div>`).join('')}</div>
    <span class="lbl">Sumar jugadores</span>
    <input id="gsearch" class="u-search" type="search" placeholder="Buscá por nombre…" autocomplete="off" value="${esc(query)}">
    <div class="u-list scroll" id="gfound"></div>`,
    `<button class="btn" data-act="board" data-i="0" data-group="${esc(g.id)}" data-focus>Ver récords</button><button class="btn alt" data-act="groups">Volver</button><button class="btn alt g-leave" data-act="gleave">Salir del grupo</button>`));
  paintOv();
  const inp=$('gsearch'), found=$('gfound');
  const fold=t=>String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const list=all=>{ const f=fold(query.trim()); if(!f){ found.innerHTML=''; return; }
    const ids=new Set(g.members.map(m=>m.id)), hits=all.filter(p=>!ids.has(p.id)&&fold(p.name).includes(f)).slice(0,8);
    found.innerHTML=hits.length?hits.map(p=>`<button class="u-item" data-act="gadd" data-id="${esc(p.id)}">${head(p.color)}<span class="u-nm"><b>${esc(p.name)}</b></span><i>+</i></button>`).join(''):'<p class="small">No hay nadie con ese nombre (o ya está en el grupo).</p>';
    paintOv(); };
  let all=[]; loadPlayers().then(l=>{ all=l; if(shownG===id) list(all); },()=>{ found.innerHTML='<p class="small">No se pudo cargar la lista de jugadores.</p>'; });
  inp.addEventListener('input',()=>{ query=inp.value; list(all); });
}
export const onAdd=pid=>guard(async()=>{ const id=shownG; try{ await addToGroup(id,pid); query=''; await loadGroups(); showGroup(id); }catch(e){ showGroup(id,e.message); } });
export const onRemove=b=>guard(async()=>{ const id=shownG;
  if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Seguro?'; return; }
  try{ await removeFromGroup(id,b.dataset.id); await loadGroups(); showGroup(id); }catch(e){ showGroup(id,e.message); } });
export const onLeave=b=>guard(async()=>{ const id=shownG;
  if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='¿Salir? Tocá de nuevo'; return; }
  try{ await leaveGroup(id); await loadGroups(); showGroups(); }catch(e){ showGroup(id,e.message); } });
