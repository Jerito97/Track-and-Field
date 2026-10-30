// Frame composition
import {ctx,DPR,LH,LW,OX,OY,padArea,PORTRAIT,SC,SH,SIZED,SW} from '../canvas.js';
import {HURDLES} from '../config.js';
import {snap} from '../game/replay.js';
import {S} from '../state.js';
import {drawField} from './field.js';
import {drawHud,finger} from './hud.js';
import {drawLap} from './lap.js';
import {drawPodium} from './podium.js';
import {arrowBtn,drawSprint} from './sprint.js';
import {drawSwim} from './swim.js';
import {drawCycle} from './cycle.js';

export function view(){
  if(S.replay){ const f=S.replay.frames[Math.min(S.replay.i,S.replay.frames.length-1)]; return {...f,ev:S.ev,replay:true}; }
  return {...snap(),ev:S.ev};
}
// the menus' background doesn't move: drawn once for each screen size, then left as it is (saves the battery)
let idleFor=null;
export function frame(){
  const idle=!(S&&(S.phase==='podium'||S.ev)), key=SIZED;
  if(idle&&idleFor===key) return;
  idleFor=idle?key:null;
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle='#0b1730'; ctx.fillRect(0,0,SW,SH);
  // phone upright with no buttons below (the lap of honour, the podium): the game in the middle of the screen
  const oy=PORTRAIT&&S&&(S.phase==='podium'||S.phase==='lap')?OY+Math.max(0,(padArea().bot-OY-LH*SC)/2):OY;
  ctx.setTransform(SC*DPR,0,0,SC*DPR,OX*DPR,oy*DPR);
  // menus: the background fills the whole screen (also behind the camera island); the game stays in the safe area
  if(idle){ ctx.setTransform(DPR*SW/LW,0,0,DPR*SH/LH,0,0); drawIdle(); return; }
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,LW,LH); ctx.clip();
  if(S&&S.phase==='podium') drawPodium();
  else if(S&&S.phase==='lap') drawLap();
  else if(S&&S.ev){ const Vw=view(); if(S.ev.swim) drawSwim(Vw); else if(S.ev.cycle) drawCycle(Vw); else if(S.ev.type==='sprint') drawSprint(Vw); else drawField(Vw); drawHud(Vw); }
  else drawIdle();
  ctx.restore();
  if(PORTRAIT&&S&&S.ev&&S.phase!=='podium'&&S.phase!=='lap') drawPads();
}
// phone upright: below the game, two big buttons (left and right half of the screen, as when it's sideways); the side
// the game asks for lights up, both when it asks for both
function drawPads(){
  const {top,bot}=padArea(); if(bot-top<60) return;
  ctx.setTransform(DPR,0,0,DPR,0,0); pads(); if(S.demo&&!S.replay) padFingers(); padFx();
}
// a tap's ring, a wrong tap's red cross, on the button it was (the side of the game it was drawn at)
function padFx(){
  const {top,bot}=padArea(), cy=(top+bot)/2, h=bot-top;
  S.fx.forEach(f=>{ if(f.k!=='ring'&&f.k!=='x') return; const q=f.x/LW, cx=S.ev.hurdles?SW*(q<1/3?1/6:q<2/3?.5:5/6):q<.5?SW/4:SW*3/4, k=f.t/.45;
    if(f.k==='ring'){ ctx.strokeStyle=`rgba(255,255,255,${1-k})`; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,h*.2+k*h*.12,0,Math.PI*2); ctx.stroke(); return; }
    const r=h*.14; ctx.save(); ctx.globalAlpha=1-k; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(cx-r,cy-r); ctx.lineTo(cx+r,cy+r); ctx.moveTo(cx+r,cy-r); ctx.lineTo(cx-r,cy+r);
    ctx.strokeStyle='#0e1a34'; ctx.lineWidth=16; ctx.stroke(); ctx.strokeStyle='#e8262d'; ctx.lineWidth=9; ctx.stroke(); ctx.restore(); });
}
// the tutorial's finger on the button it taps (a tap in the middle of the game: both), and on both while it holds
function padFingers(){
  const {top,bot}=padArea(), y=(top+bot)/2-24, x={L:SW/4-12,C:SW/2-12,R:SW*3/4-12}, k=SC;
  if(S.shot&&S.cue&&S.cue.type==='shoot') return;
  S.fingers.forEach(f=>{ const a=1-f.t/.35, q=f.x/LW; (q<.3?['L']:q>.7?['R']:S.ev.hurdles?['C']:['L','R']).forEach(p=>fingerAt(x[p],y,a,k)); });
  if(S.held2) ['L','R'].forEach(p=>fingerAt(x[p],y,1,k));
}
const fingerAt=(x,y,a,k)=>{ ctx.save(); ctx.translate(x,y); ctx.scale(k,k); finger(0,0,a); ctx.restore(); };
function pads(){
  const {top,bot}=padArea(), h=bot-top;
  // laser run, shooting: the four arrows instead (a touch anywhere there goes to the arrow on its side)
  if(S.shot&&S.cue&&S.cue.type==='shoot'&&!S.replay){ const cx=SW/2, cy=(top+bot)/2, r=Math.min(h*.17,SW*.11), d=Math.min(h*.33,SW*.24), f=S.shot.flash&&S.shot.flash.t<.3?S.shot.flash:null;
    [['U',0,-1],['D',0,1],['L',-1,0],['R',1,0]].forEach(([k,dx,dy])=>arrowBtn(cx+dx*d,cy+dy*d,r,dx,dy,f&&f.dir===k?(f.hit?'#2fd166':'#ff5a3c'):null));
    return; }
  // hurdles: three buttons, a column each (the screen's thirds, as above), with the number still to tap in each
  // (between hurdles too, dark: the same three buttons the whole race, up to the last hurdle)
  const nc=S.cue&&S.cue.type==='num'?S.cue:null;
  if(S.ev.hurdles&&!S.replay&&(nc||!S.cue&&S.phase==='run'&&!S.finished&&S.hk<HURDLES.length)){ const g=10, w=(SW-g*4)/3;
    ['L','C','R'].forEach((p,i)=>{ const x=g+i*(w+g), n=nc?nc.order.indexOf(p):-1, lit=!!nc&&n>=nc.next;
      ctx.fillStyle=lit?'#2f6fe0':'rgba(255,255,255,.07)'; ctx.strokeStyle=lit?'#fff':'rgba(255,255,255,.18)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.roundRect(x,top,w,h,20); ctx.fill(); ctx.stroke();
      ctx.fillStyle=lit?'#fff':'rgba(255,255,255,.3)'; ctx.font=`${Math.round(Math.min(w,h)*.42)}px Bangers, Impact, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      if(nc) ctx.fillText(String(n+1),x+w/2,top+h/2); });
    return; }
  const c=S.cue, on=side=>!!c&&!S.replay&&((c.type==='side'||c.type==='foot'||c.type==='pedal')&&c.side===side||c.type==='both'||c.type==='hold'||c.type==='hamhold'||c.type==='rush');
  const gap=12, w=(SW-gap*3)/2;
  ['L','R'].forEach((side,i)=>{ const x=gap+i*(w+gap), lit=on(side), col=c&&(c.type==='both'||c.type==='rush')?'#ff4d2e':c&&c.type==='num'?'#2f6fe0':c&&(c.type==='foot'||c.type==='hamhold'||c.type==='pedal')?'#ff8a1e':'#27c26a';
    ctx.fillStyle=lit?col:'rgba(255,255,255,.07)'; ctx.strokeStyle=lit?'#fff':'rgba(255,255,255,.18)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.roundRect(x,top,w,h,22); ctx.fill(); ctx.stroke();
    ctx.fillStyle=lit?'#fff':'rgba(255,255,255,.35)'; ctx.font=`${Math.round(Math.min(w,h)*.28)}px Bangers, Impact, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(side==='L'?'◀':'▶',x+w/2,top+h/2); });
}
// menus: dark navy background with the curves of a running track (no stadium), in the menu's colours
export function drawIdle(){
  const g=ctx.createLinearGradient(0,0,LW,LH); g.addColorStop(0,'#0b1730'); g.addColorStop(.55,'#14284f'); g.addColorStop(1,'#1d3a72');
  ctx.fillStyle=g; ctx.fillRect(0,0,LW,LH);
  // track bend at the bottom right: lanes as concentric arcs, red-orange surface faded into the navy
  const cx=LW*.86, cy=LH*1.18, r0=LH*.55, lane=LH*.075;
  ctx.save(); ctx.globalAlpha=.32; ctx.fillStyle='#c4472c'; ctx.beginPath(); ctx.arc(cx,cy,r0+lane*6,0,Math.PI*2); ctx.arc(cx,cy,r0,0,Math.PI*2,true); ctx.fill(); ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=1.5;
  for(let k=0;k<=6;k++){ ctx.beginPath(); ctx.arc(cx,cy,r0+lane*k,Math.PI*.95,Math.PI*1.75); ctx.stroke(); }
  // a second, fainter bend at the top left
  ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1.2;
  for(let k=0;k<=6;k++){ ctx.beginPath(); ctx.arc(LW*.08,-LH*.35,LH*.5+lane*k,Math.PI*.05,Math.PI*.8); ctx.stroke(); }
  // diagonal speed stripes in the menu's red
  ctx.save(); ctx.globalAlpha=.10; ctx.fillStyle='#e8262d';
  [[.18,.06],[.32,.03],[.62,.05]].forEach(([x,w])=>{ ctx.beginPath(); ctx.moveTo(LW*x,0); ctx.lineTo(LW*(x+w),0); ctx.lineTo(LW*(x+w-.22),LH); ctx.lineTo(LW*(x-.22),LH); ctx.closePath(); ctx.fill(); });
  ctx.restore();
}
