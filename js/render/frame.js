// Frame composition
import {ctx,DPR,LH,LW,OX,OY,PORTRAIT,SC,SH,SIZED,SW} from '../canvas.js';
import {snap} from '../game/replay.js';
import {S} from '../state.js';
import {drawField} from './field.js';
import {drawHud} from './hud.js';
import {drawLap} from './lap.js';
import {drawPodium} from './podium.js';
import {arrowBtn,drawSprint} from './sprint.js';
import {drawSwim} from './swim.js';

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
  ctx.setTransform(SC*DPR,0,0,SC*DPR,OX*DPR,OY*DPR);
  // menus: the background fills the whole screen (also behind the camera island); the game stays in the safe area
  if(idle){ ctx.setTransform(DPR*SW/LW,0,0,DPR*SH/LH,0,0); drawIdle(); return; }
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,LW,LH); ctx.clip();
  if(S&&S.phase==='podium') drawPodium();
  else if(S&&S.phase==='lap') drawLap();
  else if(S&&S.ev){ const Vw=view(); if(S.ev.swim) drawSwim(Vw); else if(S.ev.type==='sprint') drawSprint(Vw); else drawField(Vw); drawHud(Vw); }
  else drawIdle();
  ctx.restore();
  if(PORTRAIT&&S&&S.ev&&S.phase!=='podium'&&S.phase!=='lap') drawPads();
}
// phone upright: below the game, two big buttons (left and right half of the screen, as when it's sideways); the side
// the game asks for lights up, both when it asks for both
function drawPads(){
  const top=OY+LH*SC+14, bot=SH-18, h=bot-top; if(h<60) return;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // laser run, shooting: the four arrows instead (a touch anywhere there goes to the arrow on its side)
  if(S.shot&&S.cue&&S.cue.type==='shoot'&&!S.replay){ const cx=SW/2, cy=(top+bot)/2, r=Math.min(h*.17,SW*.11), d=Math.min(h*.33,SW*.24), f=S.shot.flash&&S.shot.flash.t<.3?S.shot.flash:null;
    [['U',0,-1],['D',0,1],['L',-1,0],['R',1,0]].forEach(([k,dx,dy])=>arrowBtn(cx+dx*d,cy+dy*d,r,dx,dy,f&&f.dir===k?(f.hit?'#2fd166':'#ff5a3c'):null));
    return; }
  const c=S.cue, on=side=>!!c&&!S.replay&&((c.type==='side'||c.type==='foot')&&c.side===side||c.type==='both'||c.type==='hold'||c.type==='hamhold'||c.type==='rush');
  const gap=12, w=(SW-gap*3)/2;
  ['L','R'].forEach((side,i)=>{ const x=gap+i*(w+gap), lit=on(side), col=c&&(c.type==='both'||c.type==='rush')?'#ff4d2e':c&&c.type==='num'?'#2f6fe0':c&&(c.type==='foot'||c.type==='hamhold')?'#ff8a1e':'#27c26a';
    ctx.fillStyle=lit?col:'rgba(255,255,255,.07)'; ctx.strokeStyle=lit?'#fff':'rgba(255,255,255,.18)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.roundRect(x,top,w,h,22); ctx.fill(); ctx.stroke();
    ctx.fillStyle=lit?'#fff':'rgba(255,255,255,.35)'; ctx.font=`${Math.round(Math.min(w,h)*.28)}px Bangers, Impact, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(side==='L'?'◀':'▶',x+w/2,top+h/2); });
  if(c&&c.type==='num'){ ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='bold 13px Barlow, sans-serif'; ctx.textAlign='center'; ctx.fillText('Vallas: tocá los números arriba, en la pista',SW/2,top-5); }
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
