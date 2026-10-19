// Entering the game as a player: unique names on the server, each with a 4-6 digit code.
//   first: no player on this device yet · add: another player on this device · protect: a local player without code
// Type a name -> if it's free, pick a colour and create a code; if it's taken, type its code to enter as that player.
// Without connection a player can still be made for this device only (protected later, from the menu).
import {$,OV} from '../canvas.js';
import {EVENTS} from '../config.js';
import {loginPlayer,nameExists,registerPlayer} from '../online.js';
import {COLORS,createPlayer,linkPlayer,mergeMarks,player,players} from '../storage.js';
import {setS,setScreen} from '../state.js';
import {clearInvite,inviteFromUrl,onJoin} from './online.js';
import {esc,paintOv,showMenu,showOv} from './screens.js';

let mode='first', name='', color=COLORS[0], busy=false;
export let skipProtect=false;  // "Ahora no" on the protect screen: don't ask again until the game is reopened
const swatches=sel=>`<div class="p-colors">${COLORS.map(c=>`<button class="p-sw${c===sel?' on':''}" data-act="acolor" data-c="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${c===sel}"></button>`).join('')}</div>`;
const pinInput=(id,ph)=>`<input id="${id}" class="p-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="${ph}">`;
const err=msg=>msg?`<p class="o-err" role="alert">${esc(msg)}</p>`:'';
const title=()=>mode==='protect'?(player()?.expired?'Volvé a entrar':'Protegé tu jugador'):mode==='add'?'Otro jugador':'Tu jugador';
function screen(body,focus){
  setS(null); setScreen('menu');
  showOv(`<div class="card p-create"><div class="head"><div class="logo">TRACK &amp; FIELD</div><h2>${title()}</h2></div><div class="body">${body}</div></div>`);
  const el=focus&&$(focus); if(el){ try{ el.focus({preventScroll:true}); }catch(e){ /* ignore */ }
    el.addEventListener('keydown',e=>{ if(e.key==='Enter') OV.querySelector('.btn[data-act^="a"]').click(); }); }
}
const back=()=>mode==='first'?'':`<button class="btn alt" data-act="${mode==='protect'?'askip':'players'}">${mode==='protect'?'Ahora no':'Cancelar'}</button>`;

// step 1: the name
export function showAccount(m,msg){
  // m: a mode to start in, 'keep' to go back to the name step as it was
  const p=player();
  if(m&&m!=='keep'){ mode=m; name='';
    if(mode==='protect'&&p){ name=p.name; color=p.color; }
    else { const used=players().map(q=>q.color); color=COLORS.find(c=>!used.includes(c))||COLORS[0]; } }
  screen(`${mode==='protect'&&p?.expired?'<p class="small">Se cerró tu sesión en este celular. Poné tu nombre y tu código para volver a entrar; tus récords siguen acá.</p>':
      mode==='protect'?'<p class="small">Para que nadie use tu nombre, ponele un <b>código de 4 a 6 números</b>. Con tu nombre y tu código podés entrar desde cualquier celular.</p>':
      '<p class="small">Escribí tu nombre. Si ya tenés jugador, después te pide tu código; si es nuevo, creás uno.</p>'}
    ${err(msg)}
    <label class="p-name"><span class="lbl">Nombre</span><input id="aname" maxlength="14" autocomplete="off" placeholder="Tu nombre" value="${esc(name)}"></label>
    <div class="btns"><button class="btn" data-act="anext">Continuar</button>${back()}</div>`,'aname');
}
async function guard(fn){ if(busy) return; busy=true; try{ await fn(); } finally{ busy=false; } }
export const onNext=()=>guard(async()=>{
  name=$('aname').value.replace(/\s+/g,' ').trim().slice(0,14);
  if(name.length<2){ showAccount(null,'El nombre tiene que tener al menos 2 letras.'); return; }
  let exists;
  try{ exists=await nameExists(name); }
  catch(e){ offline(e.message); return; }
  if(exists) askCode(); else newPlayer();
});
// step 2a: the name is taken -> its code
function askCode(msg){
  screen(`<p class="small"><b>«${esc(name)}»</b> ya existe. Si sos vos, poné tu código.${mode==='protect'?' Si no, volvé y elegí otro nombre.':''}</p>${err(msg)}
    <label class="p-name"><span class="lbl">Código</span>${pinInput('apin','••••')}</label>
    <div class="btns"><button class="btn" data-act="alogin">Entrar</button><button class="btn alt" data-act="aname">Usar otro nombre</button></div>`,'apin');
}
export const onLogin=()=>guard(async()=>{
  const pin=$('apin').value;
  let r; try{ r=await loginPlayer(name,pin); }catch(e){ askCode(e.message); return; }
  done(r);
});
// step 2b: the name is free -> colour and a new code
function newPlayer(msg){
  screen(`<p class="small"><b>«${esc(name)}»</b> está libre. Elegí tu color y creá tu código.</p>${err(msg)}
    <div class="p-row"><span class="p-av"><canvas data-color="${color}"></canvas></span>
      <div class="p-name"><span class="lbl">Color del stickman</span>${swatches(color)}</div></div>
    <div class="p-pins"><label class="p-name"><span class="lbl">Código (4 a 6 números)</span>${pinInput('apin','••••')}</label>
      <label class="p-name"><span class="lbl">Repetilo</span>${pinInput('apin2','••••')}</label></div>
    <div class="btns"><button class="btn" data-act="aregister">Crear</button><button class="btn alt" data-act="aname">Cambiar nombre</button></div>`,'apin');
  paintOv();
}
export function onColor(c){ color=c; OV.querySelectorAll('.p-sw').forEach(b=>{ b.classList.toggle('on',b.dataset.c===c); b.setAttribute('aria-pressed',b.dataset.c===c); });
  const cv=OV.querySelector('canvas[data-color]'); if(cv){ cv.dataset.color=c; paintOv(); } }
export const onRegister=()=>guard(async()=>{
  const pin=$('apin').value, pin2=$('apin2').value;
  if(!/^\d{4,6}$/.test(pin)){ newPlayer('El código tiene que ser de 4 a 6 números.'); return; }
  if(pin!==pin2){ newPlayer('Los dos códigos no coinciden.'); return; }
  let r; try{ r=await registerPlayer(name,pin,color); }catch(e){ if(/ya está usado/.test(e.message)) askCode(); else newPlayer(e.message); return; }
  done(r);
});
// no server: a player for this device only (not in protect mode)
function offline(msg){
  if(mode==='protect'){ showAccount(null,`No se pudo conectar (${msg}). Probá más tarde.`); return; }
  screen(`${err('No hay conexión con el servidor de jugadores.')}
    <p class="small">Podés crear <b>«${esc(name)}»</b> solo para este celular y ponerle código más tarde, desde el menú.</p>
    <div class="p-row"><span class="p-av"><canvas data-color="${color}"></canvas></span>
      <div class="p-name"><span class="lbl">Color del stickman</span>${swatches(color)}</div></div>
    <div class="btns"><button class="btn" data-act="alocal">Crear sin conexión</button><button class="btn alt" data-act="aname">Volver</button></div>`);
  paintOv();
}
export function onLocal(){ createPlayer(name,color); skipProtect=true; after(); }
function done(r){
  const remote={id:r.player.id,token:r.token};
  if(mode==='protect') linkPlayer({...r.player,token:r.token}); else createPlayer(r.player.name,r.player.color,remote);
  mergeMarks(r.marks,EVENTS);  // your records follow you to any phone
  after();
}
// a pending invite joins once there's a session (a player made offline keeps it for after entering with a code)
function after(){ const inv=inviteFromUrl(); if(inv&&player()?.token){ clearInvite(); onJoin(inv); } else showMenu(); }
export function onSkip(){ skipProtect=true; showMenu(); }
