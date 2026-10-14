// HTML overlay screens (menus and tables)
import {ANIMS,RIGS,SPR} from '../assets.js';
import {soundOn,toggleSound,unlockAudio} from '../audio.js';
import {$,OV} from '../canvas.js';
import {CHARS,EVENTS,INK} from '../config.js';
import {drawHead} from '../draw/character.js';
import {newEvent,startPlay} from '../game/core.js';
import {startPodium} from '../game/podium.js';
import {bestOf,fmt,pts,sortRows} from '../game/scoring.js';
import {POSE,runPose} from '../poses.js';
import {animReady,drawAthlete,rigReady} from '../rig.js';
import {ATH,buildAthletes,G,ME,myChar,S,setMyChar,setS,setScreen} from '../state.js';
import {rec,saveRec} from '../storage.js';

export function hideOv(){ OV.hidden=true; OV.innerHTML=''; }
export function showOv(html,clear){ setScreen('menu'); OV.className=clear?'clear':''; OV.innerHTML=html; OV.hidden=false; OV.scrollTop=0; paintOv();
  const f=OV.querySelector('[data-focus]'); if(f) try{f.focus({preventScroll:true});}catch(e){} }
export function paintOv(){ OV.querySelectorAll('canvas[data-face]').forEach(c=>paintFace(c,CHARS.find(x=>x.id===c.dataset.face))); OV.querySelectorAll('canvas[data-pict]').forEach(c=>paintPict(c,+c.dataset.pict)); }
export function paintFace(c,C){ const px=c.clientWidth||34, d=2; c.width=px*d; c.height=px*d; const g=c.getContext('2d'); if(C.sprite&&SPR.face){ const draw=()=>{ g.clearRect(0,0,c.width,c.height); g.drawImage(SPR.face.im,0,0,c.width,c.height); }; if(SPR.face.im.complete) draw(); else SPR.face.im.onload=draw; return; } const head=rigReady(C)&&RIGS[C.id].head;
  if(head){ const sh=head.h*.9, sc=Math.min(c.width/head.w,c.height/sh); g.drawImage(head.im,0,0,head.w,sh,(c.width-head.w*sc)/2,(c.height-sh*sc)/2,head.w*sc,sh*sc); return; }
  g.scale(d,d); drawHead(g,px*1.25,px*.5,px*.56,C,false,Math.max(1,px*.04)); }
export function paintPict(c,i){ const px=c.clientWidth||64, d=2; c.width=c.height=px*d; const g=c.getContext('2d'); g.scale(d,d);
  const C=ME(), s=px*.36, ox=px*.46, oy=px*.86, k=i<5?EVENTS[i].id:'tour';
  if(k==='tour'){ g.fillStyle='#ffd23a'; g.strokeStyle=INK; g.lineWidth=2; g.beginPath(); g.moveTo(px*.3,px*.2); g.lineTo(px*.7,px*.2); g.quadraticCurveTo(px*.7,px*.6,px*.5,px*.62); g.quadraticCurveTo(px*.3,px*.6,px*.3,px*.2); g.fill(); g.stroke(); g.fillRect(px*.44,px*.62,px*.12,px*.14); g.strokeRect(px*.44,px*.62,px*.12,px*.14); g.fillRect(px*.32,px*.76,px*.36,px*.08); g.strokeRect(px*.32,px*.76,px*.36,px*.08); return; }
  if(k==='pv'){ g.strokeStyle=INK; g.lineWidth=3; g.beginPath(); g.moveTo(px*.15,px*.95); g.lineTo(px*.55,px*.12); g.stroke(); g.strokeStyle='#7ccf3a'; g.lineWidth=1.6; g.stroke(); }
  if(C.sprite&&(k==='100'||k==='110h')){ const sp=SPR[k==='100'?'run1':'hurdle']; const draw=()=>{ const sc=Math.min(px*.9/sp.w,px*.9/sp.h); g.drawImage(sp.im,(px-sp.w*sc)/2,(px-sp.h*sc)/2,sp.w*sc,sp.h*sc); }; if(sp.im.complete) draw(); else sp.im.addEventListener('load',draw); return; }
  // 100 m: a frame of the drawn run cycle (knee up), fitted to the canvas
  if(k==='100'&&animReady(C,'run')){ const A=ANIMS[C.id].run, im=A.frames[3], sc=Math.min(px*.92/A.w,px*.92/A.h); g.drawImage(im,(px-A.w*sc)/2,(px-A.h*sc)/2,A.w*sc,A.h*sc); return; }
  const J=k==='100'?runPose(.8,1):k==='lj'?POSE.ljAir:k==='110h'?POSE.hurdle:k==='pv'?POSE.pvSwing:POSE.javBack;
  drawAthlete(g,s,ox,oy-(k==='lj'?s*.35:0)-(k==='pv'?s*.9:0),0,J,C,true,k==='pv'?-2.4:0);
  if(k==='jav'){ g.save(); g.lineCap='round'; g.strokeStyle=INK; g.lineWidth=4; g.beginPath(); g.moveTo(px*.04,px*.36); g.lineTo(px*.92,px*.1); g.stroke(); g.strokeStyle='#fff'; g.lineWidth=2; g.stroke(); g.restore(); }
}
export function showMenu(){
  setS(null); setScreen('menu');
  showOv(`<div class="card"><div class="head"><div class="logo">OLIMPIADA</div><h2>Elegí la prueba</h2></div><div class="body">
    <div class="events">${EVENTS.map((e,i)=>`<button class="ev" data-act="event" data-i="${i}"><canvas data-pict="${i}"></canvas><b>${e.tag}</b></button>`).join('')}
      <button class="ev tour" data-act="tour" data-focus><canvas data-pict="5"></canvas><b>TORNEO</b></button></div>
    <p class="lbl">Tu atleta</p>
    <div class="chars">${CHARS.map(c=>`<button class="ch" data-act="pick" data-id="${c.id}" aria-pressed="${c.id===myChar}"><canvas data-face="${c.id}"></canvas><b>${c.name}</b></button>`).join('')}</div>
    <p class="small">En el celu jugá en horizontal y tocá la mitad izquierda o derecha de la pantalla (en las vallas: izquierda, centro o derecha). En la compu: <kbd>←</kbd> <kbd>→</kbd>, <kbd>↓</kbd> para el botón del centro y <kbd>Espacio</kbd> para los dos rojos.</p>
    ${rec.tour?`<p class="small">Mejor torneo: <b>${rec.tour} puntos</b></p>`:''}
    <button class="link" data-act="sound">Sonido: ${soundOn?'activado':'apagado'}</button>
  </div></div>`);
}
export const rivalsFaces=()=>`<div class="faces">${ATH.filter(a=>!a.me).map(a=>`<canvas data-face="${a.C.id}"></canvas>`).join('')}</div>`;
export function showEventCard(){
  const ev=EVENTS[G.evIdx]; setS(null); setScreen('menu');
  const tour=G.mode==='tour';
  showOv(`<div class="card"><div class="head"><div class="logo">${tour?'TORNEO':ev.tag}</div><h2>${ev.name}${tour?` · ${G.evIdx+1}/5`:''}</h2></div><div class="body">
    <div class="row2"><canvas class="pict" data-pict="${G.evIdx}"></canvas>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div class="wr"><span>Récord mundial</span><b>${fmt(ev,ev.wr)}</b><span>Tu récord: ${rec[ev.id]==null?'—':fmt(ev,rec[ev.id])}</span></div>
        <div class="menu"><button class="mi play" data-act="play" data-focus>Jugar</button><button class="mi" data-act="help">Instrucciones</button>${tour?'':'<button class="mi" data-act="menu">Otra prueba</button>'}</div>
      </div></div>
    <p class="help" id="help" hidden>${ev.help}</p>
    <p class="lbl" style="text-align:center">Rivales</p>${rivalsFaces()}
    ${tour?'<button class="link" data-act="menu">Abandonar torneo</button>':''}
  </div></div>`);
}
export function table(tag,title,rows,valFmt,subFmt,btn){
  return `<div class="card"><div class="head"><div class="logo">${tag}</div><h2>${title}</h2></div><div class="body">
    <table><tbody>${rows.map((r,i)=>`<tr class="${r.a.me?'me':''}"><td>${i+1}.</td><td class="nm"><canvas data-face="${r.a.C.id}"></canvas>${r.a.me?'Vos':r.a.name}</td>${subFmt?`<td class="sub">${subFmt(r)}</td>`:''}<td>${valFmt(r)}</td></tr>`).join('')}</tbody></table>
    <button class="ok" data-act="${btn}" data-focus>OK</button></div></div>`;
}
export function showRoundStandings(){
  const ev=S.ev, last=S.round>=3;
  showOv(table(ev.tag,`Clasificación · ronda ${S.round}`,sortRows(ev,S.marks.map(bestOf)),r=>fmt(ev,r.v),r=>{ const m=S.marks[r.i][S.round-1]; return m==null?'nulo':m.toFixed(2); },last?'evdone':'nextround'),true);
}
export function endEvent(vals){
  const ev=S.ev; G.res[ev.id]=vals;
  const mine=vals[0]; let newRec=false;
  if(mine!=null&&(rec[ev.id]==null||(ev.type==='sprint'?mine<rec[ev.id]:mine>rec[ev.id]))){ rec[ev.id]=mine; newRec=true; saveRec(); }
  const p=ATH.map((a,i)=>pts(ev,vals[i])); G.pts[ev.id]=p;
  if(G.mode==='tour') ATH.forEach((a,i)=>G.total[i]=(G.total[i]||0)+p[i]);
  showOv(table(ev.tag,newRec?'¡Nuevo récord!':'Resultados',sortRows(ev,vals),r=>fmt(ev,r.v),null,'afterres'));
}
export function afterResults(){
  const ev=S.ev;
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
  const me=rows.findIndex(r=>r.a.me)+1, myPts=rows[me-1].v;
  if(myPts>(rec.tour||0)){ rec.tour=myPts; saveRec(); }
  setS(null);
  showOv(`<div class="card"><div class="head"><div class="logo">TORNEO</div><h2>Resultado final</h2></div><div class="body">
    <table><tbody>${rows.map((r,i)=>`<tr class="${r.a.me?'me':''}"><td>${i+1}.</td><td class="nm"><canvas data-face="${r.a.C.id}"></canvas>${r.a.me?'Vos':r.a.name}${i<3?' · '+['oro','plata','bronce'][i]:''}</td><td>${r.v}</td></tr>`).join('')}</tbody></table>
    <p class="small" style="text-align:center">${me===1?'¡Ganaste el torneo!':`Terminaste en el puesto ${me}.`} Tu mejor torneo: ${rec.tour} puntos.</p>
    <div class="btns"><button class="btn" data-act="tour" data-focus>Jugar otro torneo</button><button class="btn alt" data-act="menu">Menú</button></div></div></div>`);
}
export function initScreens(){
OV.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return; unlockAudio(); const a=b.dataset.act;
  if(a==='event'){ G.mode='single'; G.evIdx=+b.dataset.i; buildAthletes(); showEventCard(); }
  else if(a==='tour'){ G.mode='tour'; G.evIdx=0; G.res={}; G.pts={}; G.total={}; buildAthletes(); showEventCard(); }
  else if(a==='pick'){ setMyChar(b.dataset.id); buildAthletes(); showMenu(); }
  else if(a==='play'){ newEvent(G.evIdx); startPlay(); }
  else if(a==='help'){ const h=$('help'); h.hidden=!h.hidden; }
  else if(a==='menu') showMenu();
  else if(a==='sound'){ b.textContent='Sonido: '+(toggleSound()?'activado':'apagado'); }
  else if(a==='nextround'){ S.round++; startPlay(); }
  else if(a==='evdone') endEvent(S.marks.map(bestOf));
  else if(a==='afterres') afterResults();
  else if(a==='standings') showStandings();
  else if(a==='nextevent'){ G.evIdx++; showEventCard(); }
  else if(a==='podium') startPodium(ATH.map((a,i)=>({a,v:G.total[i]||0})).sort((x,y)=>y.v-x.v).map(r=>r.a));
});
}
