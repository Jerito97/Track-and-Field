// Frame composition
import {ctx,DPR,LH,LW,OX,OY,SC,SH,SW} from '../canvas.js';
import {snap} from '../game/replay.js';
import {S} from '../state.js';
import {drawField} from './field.js';
import {drawHud} from './hud.js';
import {drawPodium} from './podium.js';
import {drawSprint} from './sprint.js';

export function view(){
  if(S.replay){ const f=S.replay.frames[Math.min(S.replay.i,S.replay.frames.length-1)]; return {...f,ev:S.ev,replay:true}; }
  return {...snap(),ev:S.ev};
}
export function frame(){
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle='#0b1730'; ctx.fillRect(0,0,SW,SH);
  ctx.setTransform(SC*DPR,0,0,SC*DPR,OX*DPR,OY*DPR);
  // menus: the background fills the whole screen (also behind the camera island); the game stays in the safe area
  if(!(S&&(S.phase==='podium'||S.ev))){ ctx.setTransform(DPR*SW/LW,0,0,DPR*SH/LH,0,0); drawIdle(); return; }
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,LW,LH); ctx.clip();
  if(S&&S.phase==='podium') drawPodium();
  else if(S&&S.ev){ const Vw=view(); if(S.ev.type==='sprint') drawSprint(Vw); else drawField(Vw); drawHud(Vw); }
  else drawIdle();
  ctx.restore();
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
