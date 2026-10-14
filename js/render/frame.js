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
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,LW,LH); ctx.clip();
  if(S&&S.phase==='podium') drawPodium();
  else if(S&&S.ev){ const Vw=view(); if(S.ev.type==='sprint') drawSprint(Vw); else drawField(Vw); drawHud(Vw); }
  else drawIdle();
  ctx.restore();
}
export function drawIdle(){ ctx.fillStyle='#14284f'; ctx.fillRect(0,0,LW,LH); }
