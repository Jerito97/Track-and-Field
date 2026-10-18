// Frame composition
import {ctx,DPR,LH,LW,OX,OY,SC,SH,SW} from '../canvas.js';
import {snap} from '../game/replay.js';
import {S} from '../state.js';
import {drawField} from './field.js';
import {drawHud} from './hud.js';
import {drawPodium} from './podium.js';
import {drawBoards,drawStands} from './scenery.js';
import {drawSprint} from './sprint.js';

export function view(){
  if(S.replay){ const f=S.replay.frames[Math.min(S.replay.i,S.replay.frames.length-1)]; return {...f,ev:S.ev,replay:true}; }
  return {...snap(),ev:S.ev};
}
export function frame(){
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle='#0b1730'; ctx.fillRect(0,0,SW,SH);
  ctx.setTransform(SC*DPR,0,0,SC*DPR,OX*DPR,OY*DPR);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,LW,LH); ctx.clip();
  if(S&&S.phase==='podium') drawPodium();
  else if(S&&S.ev){ const Vw=view(); if(S.ev.type==='sprint') drawSprint(Vw); else drawField(Vw); drawHud(Vw); }
  else drawIdle();
  ctx.restore();
}
// menus: the stadium behind the panels, still (no panning, fans not moving)
export function drawIdle(){ const t=0, cam=0;
  const sky=ctx.createLinearGradient(0,0,0,LH*.55); sky.addColorStop(0,'#5aa8e6'); sky.addColorStop(1,'#cfe8f8'); ctx.fillStyle=sky; ctx.fillRect(0,0,LW,LH);
  drawStands(cam,26,176,.7,t); drawBoards(cam,176,14,24);
  ctx.fillStyle='#a6c94a'; ctx.fillRect(0,190,LW,10);
  ctx.fillStyle='#2f7fd6'; ctx.fillRect(0,200,LW,LH-200);
  ctx.fillStyle='rgba(255,255,255,.85)'; for(let l=0;l<5;l++) ctx.fillRect(0,200+l*30,LW,2);
}
