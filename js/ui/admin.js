// Admin screen: only for the admin player (the server decides; see api/t.js). Reached from the profile, where the
// button only shows once the server said yes. Numbers of the game, and per player: new code (forgot it), unlock,
// close their sessions, rename, delete a record, delete the player.
import {$,OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {fmt} from '../game/scoring.js';
import {adminOp} from '../online.js';
import {setS,setScreen} from '../state.js';
import {player,store} from '../storage.js';
import {esc,paintOv,showOv} from './screens.js';

// player id the server said yes for (kept on the phone, so it also works without connection)
let allowed=store.get('odb-admin',null);
export const isAdmin=()=>allowed!=null&&allowed===player()?.id;
// asked once per player (quietly): shows the admin things (profile button, events in testing) when it answers yes
let asked=null;
export function checkAdmin(then){ const p=player(); if(!p?.token||allowed===p.id||asked===p.id) return; asked=p.id;
  adminOp('check').then(r=>{ if(r&&r.admin===false) return; if(player()?.id===p.id){ allowed=p.id; store.set('odb-admin',allowed); then?.(); } },()=>{}); }

const card=(title,body,btns)=>`<div class="card a-card"><div class="head"><div class="logo">ADMIN</div><h2>${title}</h2></div><div class="body">${body}<div class="btns">${btns}</div></div></div>`;
const day=d=>new Date(d).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'});
const evName=id=>id==='surv'?'Supervivencia clásica':id==='survm'?'Supervivencia moderna':EVENTS.find(e=>e.id===id)?.name||id;
const mk=(id,v)=>id==='surv'||id==='survm'?v+' pts':fmt(EVENTS.find(e=>e.id===id),v);
let users=[], query='', open=null;

export async function showAdmin(msg){
  setS(null); setScreen('menu'); open=null;
  showOv(card('Administrador','<p class="small o-wait">Cargando…</p>','<button class="btn alt" data-act="profile">Volver</button>'));
  let st; try{ st=(await adminOp('stats')).stats; users=(await adminOp('users')).users; }catch(e){ showOv(card('Administrador',`<p class="o-err">${esc(e.message)}</p>`,'<button class="btn alt" data-act="profile">Volver</button>')); return; }
  if(!OV.querySelector('.a-card')) return;
  showOv(card('Administrador',`${msg?`<p class="o-ok" role="status">${esc(msg)}</p>`:''}
    <div class="p-stats a-stats"><div><b>${st.players}</b><span>jugadores</span></div><div><b>${st.new_week}</b><span>nuevos esta semana</span></div><div><b>${st.marks}</b><span>récords</span></div><div><b>${st.open_tournaments}/${st.tournaments}</b><span>torneos en juego</span></div><div><b>${st.groups}</b><span>grupos</span></div></div>
    <span class="lbl">Reiniciar los récords de una prueba (los de todos)</span>
    <div class="g-new"><select id="awipe" class="u-search"><option value="">Elegí la prueba…</option>${EVENTS.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}<option value="surv">Supervivencia clásica</option><option value="survm">Supervivencia moderna</option></select><button class="btn alt a-del" data-act="awipe">Reiniciar</button></div>
    <span class="lbl">Jugadores</span>
    <input id="asearch" class="u-search" type="search" placeholder="Buscar jugador…" autocomplete="off" value="${esc(query)}">
    <div class="u-list scroll" id="alist"></div>`,'<button class="btn alt" data-act="profile" data-focus>Volver</button>'));
  const inp=$('asearch'); inp.addEventListener('input',()=>{ query=inp.value; list(); }); list();
}
const fold=t=>String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function list(){
  const f=fold(query.trim()), shown=users.filter(u=>!f||fold(u.name).includes(f));
  $('alist').innerHTML=shown.map(u=>`<button class="u-item" data-act="auser" data-id="${esc(u.id)}"><span class="p-av sm"><canvas data-color="${esc(u.color)}"></canvas></span><span class="u-nm"><b>${esc(u.name)}</b><small>${u.admin?'Admin · ':''}${u.locked?'🔒 Bloqueado · ':''}desde ${day(u.created_at)} · ${u.marks.length} récords</small></span><i>›</i></button>`).join('')||'<p class="small">No hay nadie con ese nombre.</p>';
  paintOv();
}
// one player: their records and the tools
export function showAdminUser(id,msg,isErr){
  const u=users.find(x=>x.id===id); if(!u) return showAdmin(); open=id;
  showOv(card(esc(u.name),`${msg?`<p class="${isErr?'o-err':'o-ok'}" role="status">${esc(msg)}</p>`:''}
    <p class="small">Desde el ${day(u.created_at)} · ${u.sessions} ${u.sessions===1?'sesión abierta':'sesiones abiertas'}${u.locked?' · <b>bloqueado</b> por códigos incorrectos':''}</p>
    <span class="lbl">Código nuevo (si se lo olvidó)</span>
    <div class="g-new"><input id="apin" class="p-pin" type="text" inputmode="numeric" maxlength="6" placeholder="4 a 6 números" autocomplete="off"><button class="btn" data-act="asetpin">Cambiar código</button></div>
    <span class="lbl">Nombre</span>
    <div class="g-new"><input id="aname2" maxlength="14" value="${esc(u.name)}" autocomplete="off"><button class="btn alt" data-act="arename">Renombrar</button></div>
    <span class="lbl">Récords</span>
    <div class="u-list scroll">${u.marks.length?u.marks.map(m=>`<div class="u-item g-mem"><span class="u-nm"><b>${evName(m.ev)}</b><small>${mk(m.ev,m.mark)}</small></span><button class="btn alt g-x" data-act="adelmark" data-ev="${esc(m.ev)}">Borrar</button></div>`).join(''):'<p class="small">Sin récords.</p>'}</div>`,
    `${u.locked?'<button class="btn alt" data-act="aunlock">Desbloquear</button>':''}<button class="btn alt" data-act="alogout">Cerrar sus sesiones</button>${u.admin?'':'<button class="btn alt a-del" data-act="adeluser">Borrar jugador</button>'}<button class="btn" data-act="admin">Volver</button>`));
}
async function run(op,extra,ok,sure,b){
  if(sure&&b&&!b.dataset.sure){ b.dataset.sure='1'; b.textContent=sure; return; }
  const id=open;
  try{ await adminOp(op,{player:id,...extra}); users=(await adminOp('users')).users; }
  catch(e){ return showAdminUser(id,e.message,true); }
  if(op==='deluser') return showAdmin(ok);
  showAdminUser(id,ok);
}
export function onAdmin(a,b){
  if(a==='asetpin'){ const pin=$('apin').value.trim(); if(!/^\d{4,6}$/.test(pin)) return showAdminUser(open,'El código tiene que ser de 4 a 6 números.',true);
    return run('setpin',{pin},`Listo: el código nuevo es ${pin}. Pasáselo.`); }
  if(a==='arename') return run('rename',{name:$('aname2').value},'Nombre cambiado.');
  if(a==='aunlock') return run('unlock',{},'Desbloqueado.');
  if(a==='alogout') return run('logout',{},'Se cerraron sus sesiones: tiene que entrar de nuevo con su código.','¿Cerrar todas? Tocá de nuevo',b);
  if(a==='adelmark') return run('delmark',{ev:b.dataset.ev},'Récord borrado.','¿Borrar? Tocá de nuevo',b);
  if(a==='awipe'){ const ev=$('awipe').value; if(!ev) return;
    if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent=`¿Borrar todos los récords de ${evName(ev)}? Tocá de nuevo`; return; }
    b.disabled=true; return adminOp('wipeev',{ev}).then(()=>showAdmin(`Récords de ${evName(ev)} reiniciados: en cada celular se borran la próxima vez que abra el juego.`),e=>showAdmin(e.message)); }
  if(a==='adeluser') return run('deluser',{},'Jugador borrado.','¿Borrar el jugador y todo lo suyo? Tocá de nuevo',b);
}
