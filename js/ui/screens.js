// HTML overlay screens (menus and tables)
import {ANIMS,RIGS,SPR} from '../assets.js';
import {soundOn,toggleSound,unlockAudio} from '../audio.js';
import {$,OV} from '../canvas.js';
import {CHARS,EVENTS,INK} from '../config.js';
import {drawHead} from '../draw/character.js';
import {newEvent,startPlay} from '../game/core.js';
import {startPodium} from '../game/podium.js';
import {bestOf,fmt,pts,sortRows} from '../game/scoring.js';
import {cachedTop,loadTop,showBoard,syncMarks} from './board.js';
import {onColor,onLocal,onLogin,onNext,onRegister,onSkip,showAccount,skipProtect} from './account.js';
import {updateRemote} from '../online.js';
import {finishOnline,onCreate,onJoin,onShare,playOnline,showOnline,shownCode,showTournament} from './online.js';
import {POSE,runPose} from '../poses.js';
import {animReady,drawAthlete,rigReady} from '../rig.js';
import {ATH,buildAthletes,G,ME,S,setS,setScreen} from '../state.js';
import {COLORS,player,players,rec,recordEvent,recordTour,store,STYLE,switchPlayer,updatePlayer,worldRec} from '../storage.js';

export function hideOv(){ OV.hidden=true; OV.innerHTML=''; }
export function showOv(html,clear){ setScreen('menu'); OV.className=clear===true?'clear':(clear||''); OV.innerHTML=html; OV.hidden=false; OV.scrollTop=0; paintOv();
  const f=OV.querySelector('[data-focus]'); if(f) try{f.focus({preventScroll:true});}catch(e){} }
// data-face="yo" is you (your colour); data-color paints a stickman head in that colour (player lists, colour preview)
export function paintOv(){ OV.querySelectorAll('canvas[data-face]').forEach(c=>paintFace(c,c.dataset.face==='yo'?ME():CHARS.find(x=>x.id===c.dataset.face))); OV.querySelectorAll('canvas[data-color]').forEach(c=>paintFace(c,{j:c.dataset.color})); OV.querySelectorAll('canvas[data-pict]').forEach(c=>paintPict(c,+c.dataset.pict)); }
export function paintFace(c,C){ const px=c.clientWidth||34, d=2; c.width=px*d; c.height=px*d; const g=c.getContext('2d');
  if(STYLE.stick){ g.fillStyle=C.j; g.beginPath(); g.arc(c.width/2,c.height*.42,c.width*.26,0,Math.PI*2); g.fill(); g.strokeStyle=C.j; g.lineWidth=c.width*.12; g.lineCap='round'; g.beginPath(); g.moveTo(c.width/2,c.height*.6); g.lineTo(c.width/2,c.height); g.stroke(); return; } if(C.sprite&&SPR.face){ const draw=()=>{ g.clearRect(0,0,c.width,c.height); g.drawImage(SPR.face.im,0,0,c.width,c.height); }; if(SPR.face.im.complete) draw(); else SPR.face.im.onload=draw; return; } const head=rigReady(C)&&RIGS[C.id].head;
  if(head){ const sh=head.h*.9, sc=Math.min(c.width/head.w,c.height/sh); g.drawImage(head.im,0,0,head.w,sh,(c.width-head.w*sc)/2,(c.height-sh*sc)/2,head.w*sc,sh*sc); return; }
  g.scale(d,d); drawHead(g,px*1.25,px*.5,px*.56,C,false,Math.max(1,px*.04)); }
export function paintPict(c,i){ const px=c.clientWidth||64, d=2; c.width=c.height=px*d; const g=c.getContext('2d'); g.scale(d,d);
  const C=ME(), s=px*.36, ox=px*.46, oy=px*.86, k=i<EVENTS.length?EVENTS[i].id:'tour';
  if(k==='tour'){ g.fillStyle='#ffd23a'; g.strokeStyle=INK; g.lineWidth=2; g.beginPath(); g.moveTo(px*.3,px*.2); g.lineTo(px*.7,px*.2); g.quadraticCurveTo(px*.7,px*.6,px*.5,px*.62); g.quadraticCurveTo(px*.3,px*.6,px*.3,px*.2); g.fill(); g.stroke(); g.fillRect(px*.44,px*.62,px*.12,px*.14); g.strokeRect(px*.44,px*.62,px*.12,px*.14); g.fillRect(px*.32,px*.76,px*.36,px*.08); g.strokeRect(px*.32,px*.76,px*.36,px*.08); return; }
  if(k==='pv'&&!STYLE.stick){ g.strokeStyle=INK; g.lineWidth=3; g.beginPath(); g.moveTo(px*.15,px*.95); g.lineTo(px*.55,px*.12); g.stroke(); g.strokeStyle='#7ccf3a'; g.lineWidth=1.6; g.stroke(); }
  if(C.sprite&&(k==='100'||k==='110h')){ const sp=SPR[k==='100'?'run1':'hurdle']; const draw=()=>{ const sc=Math.min(px*.9/sp.w,px*.9/sp.h); g.drawImage(sp.im,(px-sp.w*sc)/2,(px-sp.h*sc)/2,sp.w*sc,sp.h*sc); }; if(sp.im.complete) draw(); else sp.im.addEventListener('load',draw); return; }
  // a drawn frame (run cycle knee up, hurdle clearance, long jump flight, javelin drawn back), fitted to the canvas
  const PICT={'100':['run',3],'110h':['hurdle',1],'lj':['ljflight',1],'jav':['javpull',1]}[k];
  if(PICT&&animReady(C,PICT[0])){ const A=ANIMS[C.id][PICT[0]], sc=Math.min(px*.92/A.w,px*.92/A.h); g.drawImage(A.im,PICT[1]*A.w,0,A.w,A.h,(px-A.w*sc)/2,(px-A.h*sc)/2,A.w*sc,A.h*sc); return; }
  // pole vault (stickman): planting the pole, arms up, pole down to the box
  if(k==='pv'&&STYLE.stick){ const h=drawAthlete(g,s*.82,px*.4,oy,0,POSE.pvPlant,C,true).hand; g.save(); g.lineCap='round'; g.strokeStyle=INK; g.lineWidth=3.4; g.beginPath(); g.moveTo(h[0],h[1]); g.lineTo(px*.95,oy); g.stroke(); g.strokeStyle='#ffd23a'; g.lineWidth=1.8; g.stroke(); g.restore(); return; }
  const J=k==='100'?runPose(.8,1):k==='lj'?POSE.ljAir:k==='110h'?POSE.hurdle:k==='pv'?POSE.pvSwing:POSE.javBack;
  drawAthlete(g,s,ox,oy-(k==='lj'?s*.35:0)-(k==='pv'?s*.9:0),0,J,C,true,k==='pv'?-2.4:0);
  if(k==='jav'){ g.save(); g.lineCap='round'; g.strokeStyle=INK; g.lineWidth=4; g.beginPath(); g.moveTo(px*.04,px*.36); g.lineTo(px*.92,px*.1); g.stroke(); g.strokeStyle='#fff'; g.lineWidth=2; g.stroke(); g.restore(); }
}
// illustrated thumbnails (assets/thumbs/<id>.jpg, small <id>-sm.jpg for the cards), with where the athlete is so a crop
// keeps them in view; an event without one (a new invented event) gets the stickman drawn in code
const THUMBS={'100':'34% 30%','lj':'44% 30%','110h':'50% 34%','pv':'36% 30%','jav':'52% 32%','tour':'52% 30%'};
const thumbKey=i=>i<EVENTS.length?EVENTS[i].id:'tour';
const art=(i,sm)=>{ const k=thumbKey(i), pos=THUMBS[k]; return pos?`<img class="m-th" src="assets/thumbs/${k}${sm?'-sm':''}.jpg" alt="" style="object-position:${pos}" decoding="async">`:`<canvas data-pict="${i}"></canvas>`; };
let preloaded=false;
const preload=()=>{ if(preloaded) return; preloaded=true; Object.keys(THUMBS).forEach(k=>{ new Image().src=`assets/thumbs/${k}.jpg`; }); };
// main menu: selected event (0-4) or tournament (5), remembered between visits
// the tournament card comes after the events (index TOUR)
const TOUR=EVENTS.length;
let menuSel=(()=>{ const v=store.get('odb-menusel',0); return v>=0&&v<=TOUR?v:0; })();
const ICON={
  medal:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l1 5-3 2zM17 2h-4l-1 5 3 2z" fill="#e8262d"/><circle cx="12" cy="15" r="6.5" fill="#ffd23a" stroke="#a8740c" stroke-width="1.5"/><path d="M12 11.6l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="#a8740c"/></svg>',
  cup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4a5 5 0 0 1-10 0zM5 4h2v3a2 2 0 0 1-2-2zM19 4h-2v3a2 2 0 0 0 2-2zM11 12h2v4h-2zM8 17h8v3H8z" fill="currentColor"/></svg>',
  globe:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  snd:on=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on?'<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>':'<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`
};
// world record: first of the world top 10 (server); until it's loaded, or without connection, the best on this device
const wrText=ev=>{ const t=cachedTop(ev.id), w=t?(t[0]&&{v:t[0].mark,name:t[0].name}):worldRec(ev); return w?`${fmt(ev,w.v)} <small>${esc(w.name)}</small>`:'—'; };
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function showMenu(){
  if(!player()){ showAccount('first'); return; }
  if(!player().token&&!skipProtect){ showAccount('protect'); return; }
  setS(null); setScreen('menu');
  const tour=menuSel===TOUR, ev=EVENTS[menuSel];
  const stats=tour
    ?`<div><span class="m-ic">${ICON.medal}</span><span>Mejor torneo</span><b>${rec.tour?rec.tour+' pts':'—'}</b></div><div><span class="m-ic">${ICON.cup}</span><span>Pruebas</span><b>${EVENTS.length}</b></div>`
    :`<div><span class="m-ic">${ICON.medal}</span><span>Récord personal</span><b>${rec[ev.id]==null?'—':fmt(ev,rec[ev.id])}</b></div><div><span class="m-ic">${ICON.globe}</span><span>Récord mundial</span><b id="wr">${wrText(ev)}</b></div>`;
  // events marked nueva:true in config.js (invented ones) get a small NUEVA tag
  const cards=EVENTS.map((e,i)=>`<button class="m-ev${i===menuSel?' on':''}${e.nueva?' new':''}" data-act="sel" data-i="${i}" aria-pressed="${i===menuSel}">${art(i,true)}<b>${e.tag}</b>${e.nueva?'<i>Nueva</i>':''}</button>`).join('')
    +`<button class="m-ev tour${tour?' on':''}" data-act="sel" data-i="${TOUR}" aria-pressed="${tour}">${art(TOUR,true)}<b>TORNEO</b></button>`;
  showOv(`<div class="mm">
  <header class="m-top"><div class="m-logo"><img class="m-app" src="assets/icons/icon-192.png" alt="">TRACK &amp; FIELD</div><div class="m-title">Elegí tu prueba <span class="m-ic">${ICON.cup}</span></div></header>
  <section class="m-hero">
    <div class="m-art${THUMBS[thumbKey(menuSel)]?' img':''}">${art(menuSel)}</div>
    <div class="m-info"><h1>${tour?'Torneo':ev.name}</h1>
      <div class="m-acts">${tour?'<button class="m-play" data-act="online" data-focus>Con amigos <span aria-hidden="true">›</span></button><button class="m-play alt" data-act="go">Contra la máquina</button>':'<button class="m-play" data-act="go" data-focus>Jugar ahora <span aria-hidden="true">›</span></button><button class="m-rec" data-act="board" data-i="${menuSel}"><span class="m-ic">${ICON.cup}</span>Récords</button>'}</div></div>
    <div class="m-stats">${stats}</div>
  </section>
  <div class="m-evw"><button class="m-arr l" data-act="scroll" data-d="-1" aria-label="Ver pruebas anteriores" hidden>‹</button><nav class="m-evs" aria-label="Pruebas">${cards}</nav><button class="m-arr r" data-act="scroll" data-d="1" aria-label="Ver más pruebas" hidden>›</button></div>
  <footer class="m-bot">
    <div class="m-ath"><span class="m-lbl">Jugador</span><button class="m-me" data-act="profile"><span class="m-av"><canvas data-face="yo"></canvas></span><span class="m-nm"><b>${esc(player().name)}</b><i>Ver perfil ›</i></span></button></div>
    <button class="m-snd" data-act="sound" aria-label="Sonido ${soundOn?'activado':'apagado'}">${ICON.snd(soundOn)}</button>
  </footer></div>`,'menu');
  initCarousel(); preload();
  if(!tour) syncMarks().then(()=>loadTop(ev.id)).then(()=>{ const el=$('wr'); if(el&&EVENTS[menuSel]===ev) el.innerHTML=wrText(ev); },()=>{});
}
// carousel: keeps its scroll between menu redraws, keeps the chosen card in view, arrows when there's more to see
let evScroll=0;
function initCarousel(){
  const row=OV.querySelector('.m-evs'); if(!row) return;
  const [l,r]=OV.querySelectorAll('.m-arr');
  const arrows=()=>{ evScroll=row.scrollLeft; l.hidden=row.scrollLeft<4; r.hidden=row.scrollLeft+row.clientWidth>=row.scrollWidth-4; };
  row.scrollLeft=evScroll;
  const on=row.querySelector('.m-ev.on');
  if(on){ const a=on.offsetLeft-row.offsetLeft, b=a+on.offsetWidth; if(a<row.scrollLeft) row.scrollLeft=a; else if(b>row.scrollLeft+row.clientWidth) row.scrollLeft=b-row.clientWidth; }
  row.addEventListener('scroll',arrows,{passive:true}); arrows();
}

// ---- players ----
const swatches=sel=>`<div class="p-colors">${COLORS.map(c=>`<button class="p-sw${c===sel?' on':''}" data-act="color" data-c="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${c===sel}"></button>`).join('')}</div>`;
// picking a colour on the profile changes yours right away (and on the server, for tournaments)
function pickColor(c){ OV.querySelectorAll('.p-sw').forEach(b=>{ b.classList.toggle('on',b.dataset.c===c); b.setAttribute('aria-pressed',b.dataset.c===c); });
  updatePlayer({color:c}); OV.querySelectorAll('canvas[data-face="yo"]').forEach(cv=>paintFace(cv,ME()));
  if(player().token) updateRemote({color:c}).catch(()=>{}); }
// rename: names are unique on the server, so it has to accept it first
async function onRename(){ const name=$('pname').value.replace(/\s+/g,' ').trim().slice(0,14); if(name.length<2) return;
  if(player().token){ try{ await updateRemote({name}); }catch(e){ showProfile(e.message); return; } }
  updatePlayer({name}); showProfile(); }
export function showProfile(msg){
  const p=player(); if(!p){ showAccount('first'); return; } setS(null); setScreen('menu');
  // best mark of each event
  const bests=EVENTS.map(ev=>`<div><b>${p.rec[ev.id]==null?'—':fmt(ev,p.rec[ev.id])}</b><span>${ev.name}</span></div>`).join('');
  showOv(`<div class="card p-prof"><div class="head"><div class="logo">PERFIL</div><h2>${esc(p.name)}</h2></div><div class="body">
    ${msg?`<p class="o-err" role="alert">${esc(msg)}</p>`:''}
    ${p.token?'':p.expired?'<div class="o-code"><p class="small">Se cerró tu sesión: tus récords no se suben al Top 10 hasta que vuelvas a entrar.</p><button class="btn" data-act="protect">Entrar</button></div>':'<div class="o-code"><p class="small">Tu jugador todavía no tiene código: cualquiera podría usar tu nombre.</p><button class="btn" data-act="protect">Poner código</button></div>'}
    <div class="p-row"><span class="p-av"><canvas data-face="yo"></canvas></span>
      <label class="p-name"><span class="lbl">Nombre</span><span class="p-edit"><input id="pname" maxlength="14" value="${esc(p.name)}" autocomplete="off"><button class="btn alt" data-act="rename">Guardar</button></span></label></div>
    <span class="lbl">Color del stickman</span>${swatches(p.color)}
    <div class="p-stats"><div><b>${p.history.length}</b><span>pruebas jugadas</span></div><div><b>${p.tours.length}</b><span>torneos</span></div><div><b>${p.rec.tour||'—'}</b><span>mejor torneo</span></div><div><b>${p.tours.filter(t=>t.place===1).length}</b><span>torneos ganados</span></div></div>
    <span class="lbl">Tus récords</span><div class="p-stats p-recs">${bests}</div>
    <div class="btns"><button class="btn" data-act="menu" data-focus>Volver</button><button class="btn alt" data-act="players">Cambiar de jugador</button></div>
  </div></div>`);
  $('pname').addEventListener('keydown',e=>{ if(e.key==='Enter') OV.querySelector('[data-act="rename"]').click(); });
}
export function showPlayers(){
  setS(null); setScreen('menu'); const cur=player();
  showOv(`<div class="card"><div class="head"><div class="logo">JUGADORES</div><h2>¿Quién juega?</h2></div><div class="body">
    <div class="p-list">${players().map(p=>`<button class="p-pl${cur&&p.id===cur.id?' on':''}" data-act="switch" data-id="${p.id}"><span class="p-av sm"><canvas data-color="${p.color}"></canvas></span><b>${esc(p.name)}</b><small>${p.history.length} pruebas</small></button>`).join('')}</div>
    <div class="btns"><button class="btn" data-act="newplayer">+ Nuevo jugador</button>${cur?'<button class="btn alt" data-act="profile">Volver</button>':''}</div>
  </div></div>`);
}
export const rivalsFaces=()=>`<div class="faces">${ATH.filter(a=>!a.me).map(a=>`<canvas data-face="${a.C.id}"></canvas>`).join('')}</div>`;
export function showEventCard(){
  const ev=EVENTS[G.evIdx]; setS(null); setScreen('menu');
  const tour=G.mode==='tour';
  showOv(`<div class="card"><div class="head"><div class="logo">${tour?'TORNEO':ev.tag}</div><h2>${ev.name}${tour?` · ${G.evIdx+1}/${EVENTS.length}`:''}</h2></div><div class="body">
    <div class="row2"><canvas class="pict" data-pict="${G.evIdx}"></canvas>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div class="wr"><span>Récord mundial</span><b id="wr">${wrText(ev)}</b><span>Tu récord: ${rec[ev.id]==null?'—':fmt(ev,rec[ev.id])}</span></div>
        <div class="menu"><button class="mi play" data-act="play" data-focus>Jugar</button><button class="mi" data-act="help">Instrucciones</button>${tour?'':'<button class="mi" data-act="menu">Otra prueba</button>'}</div>
      </div></div>
    <p class="help" id="help" hidden>${ev.help}</p>
    <p class="lbl" style="text-align:center">Rivales</p>${rivalsFaces()}
    ${tour?'<button class="link" data-act="menu">Abandonar torneo</button>':''}
  </div></div>`);
}
// place shown in a table: equal values share it (1, 2, 2, 4)
export const place=(rows,i,valFmt)=>{ let j=i; while(j>0&&valFmt(rows[j-1])===valFmt(rows[i])) j--; return j+1; };
export function table(tag,title,rows,valFmt,subFmt,btn){
  return `<div class="card"><div class="head"><div class="logo">${tag}</div><h2>${title}</h2></div><div class="body">
    <table><tbody>${rows.map((r,i)=>`<tr class="${r.a.me?'me':''}"><td>${place(rows,i,valFmt)}.</td><td class="nm"><canvas data-face="${r.a.C.id}"></canvas>${esc(r.a.name)}</td>${subFmt?`<td class="sub">${subFmt(r)}</td>`:''}<td>${valFmt(r)}</td></tr>`).join('')}</tbody></table>
    <button class="ok" data-act="${btn}" data-focus>OK</button></div></div>`;
}
export function showRoundStandings(){
  const ev=S.ev, last=S.round>=3;
  showOv(table(ev.tag,`Clasificación · ronda ${S.round}`,sortRows(ev,S.marks.map(bestOf)),r=>fmt(ev,r.v),r=>{ const m=S.marks[r.i][S.round-1]; return m==null?'nulo':m.toFixed(2); },last?'evdone':'nextround'),true);
}
export function endEvent(vals){
  const ev=S.ev; G.res[ev.id]=vals;
  // your result goes to your player's history, top 5 and records
  const mine=vals[0], rows=sortRows(ev,vals), mi=rows.findIndex(r=>r.a.me);
  const newRec=recordEvent(ev,mine,mine==null?null:place(rows,mi,r=>fmt(ev,r.v)),ATH.length,G.mode);
  const p=ATH.map((a,i)=>pts(ev,vals[i])); G.pts[ev.id]=p;
  if(G.mode==='tour') ATH.forEach((a,i)=>G.total[i]=(G.total[i]||0)+p[i]);
  if(G.mode==='online') finishOnline(mine);
  if(newRec) syncMarks();
  showOv(table(ev.tag,newRec?'¡Nuevo récord!':'Resultados',sortRows(ev,vals),r=>fmt(ev,r.v),null,'afterres'));
}
export function afterResults(){
  const ev=S.ev;
  if(G.mode==='online'){ showTournament(G.code); return; }
  if(G.mode!=='tour'){ showEventCard(); return; }
  const p=G.pts[ev.id];
  showOv(table(ev.tag,'Puntos',ATH.map((a,i)=>({a,i,v:p[i]})).sort((x,y)=>y.v-x.v),r=>String(r.v),null,'standings'));
}
export function showStandings(){
  const last=G.evIdx>=EVENTS.length-1;
  showOv(table('TORNEO','Clasificación general',ATH.map((a,i)=>({a,i,v:G.total[i]||0})).sort((x,y)=>y.v-x.v),r=>String(r.v),null,last?'podium':'nextevent'));
}
export function showFinalTable(){
  const rows=ATH.map((a,i)=>({a,i,v:G.total[i]||0})).sort((x,y)=>y.v-x.v);
  const mi=rows.findIndex(r=>r.a.me), me=place(rows,mi,q=>String(q.v)), myPts=rows[mi].v;
  recordTour(myPts,me);
  setS(null);
  showOv(`<div class="card"><div class="head"><div class="logo">TORNEO</div><h2>Resultado final</h2></div><div class="body">
    <table><tbody>${rows.map((r,i)=>{ const pl=place(rows,i,q=>String(q.v)); return `<tr class="${r.a.me?'me':''}"><td>${pl}.</td><td class="nm"><canvas data-face="${r.a.C.id}"></canvas>${esc(r.a.name)}${pl<=3?' · '+['oro','plata','bronce'][pl-1]:''}</td><td>${r.v}</td></tr>`; }).join('')}</tbody></table>
    <p class="small" style="text-align:center">${me===1?'¡Ganaste el torneo!':`Terminaste en el puesto ${me}.`} Tu mejor torneo: ${rec.tour||0} puntos.</p>
    <div class="btns"><button class="btn" data-act="tour" data-focus>Jugar otro torneo</button><button class="btn alt" data-act="menu">Menú</button></div></div></div>`);
}
export function initScreens(){
OV.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return; unlockAudio(); const a=b.dataset.act;
  if(a==='event'){ G.mode='single'; G.evIdx=+b.dataset.i; buildAthletes(); showEventCard(); }
  else if(a==='tour'){ G.mode='tour'; G.evIdx=0; G.res={}; G.pts={}; G.total={}; buildAthletes(); showEventCard(); }
  else if(a==='online'){ if(player().token) showOnline(); else showAccount('protect'); }
  else if(a==='ocreate') onCreate();
  else if(a==='ojoin') onJoin();
  else if(a==='oopen'||a==='orefresh') showTournament(b.dataset.code);
  else if(a==='oshare') onShare(b.dataset.code);
  else if(a==='oplay') playOnline(shownCode(),b.dataset.ev);
  else if(a==='board') showBoard(+b.dataset.i);
  else if(a==='profile') showProfile();
  else if(a==='players') showPlayers();
  else if(a==='newplayer') showAccount('add');
  else if(a==='protect') showAccount('protect');
  else if(a==='anext') onNext();
  else if(a==='alogin') onLogin();
  else if(a==='aregister') onRegister();
  else if(a==='acolor') onColor(b.dataset.c);
  else if(a==='alocal') onLocal();
  else if(a==='askip') onSkip();
  else if(a==='aname') showAccount('keep');
  else if(a==='switch'){ switchPlayer(b.dataset.id); showMenu(); }
  else if(a==='color'){ pickColor(b.dataset.c); }
  else if(a==='rename') onRename();
  else if(a==='scroll'){ const row=OV.querySelector('.m-evs'); row.scrollBy({left:+b.dataset.d*row.clientWidth*.8,behavior:'smooth'}); }
  else if(a==='sel'){ menuSel=+b.dataset.i; store.set('odb-menusel',menuSel); showMenu(); }
  else if(a==='go'){ if(menuSel===TOUR){ G.mode='tour'; G.evIdx=0; G.res={}; G.pts={}; G.total={}; buildAthletes(); showEventCard(); }
    else { G.mode='single'; G.evIdx=menuSel; buildAthletes(); newEvent(G.evIdx); startPlay(); } }
  else if(a==='play'){ newEvent(G.evIdx); startPlay(); }
  else if(a==='help'){ const h=$('help'); h.hidden=!h.hidden; }
  else if(a==='menu') showMenu();
  else if(a==='sound'){ const on=toggleSound(); if(b.classList.contains('m-snd')) showMenu(); else b.textContent='Sonido: '+(on?'activado':'apagado'); }
  else if(a==='nextround'){ S.round++; startPlay(); }
  else if(a==='evdone') endEvent(S.marks.map(bestOf));
  else if(a==='afterres') afterResults();
  else if(a==='standings') showStandings();
  else if(a==='nextevent'){ G.evIdx++; showEventCard(); }
  else if(a==='podium') startPodium(ATH.map((a,i)=>({a,v:G.total[i]||0})).sort((x,y)=>y.v-x.v).map(r=>r.a));
});
}
