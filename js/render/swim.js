// Swimming rendering: the pool (pool.js), the swimmer in our lane (cut open in front) and the rivals in the lanes behind
import {ctx,LW} from '../canvas.js';
import {INK} from '../config.js';
import {drawAthlete} from '../rig.js';
import {BLOCK_H,DIVE_T,isBack,poolX} from '../game/swim.js';
import {ME,S} from '../state.js';
import {swimPose} from '../stick.js';
import {drawPauseBtn} from './scenery.js';
import {drawPool} from './pool.js';

// the swimmer's size: logical px per metre of the figure (bigger than the pool's scale, so the strokes read)
const BODY=1.45;
// depth of each rival lane between the far lane ropes (0 = right behind ours, 1 = the far deck), and their size
const RIV_LANES=[.15,.42,.635,.805,.94];
// a swimmer drawn at x (logical px), surface at y, size s, mirrored on the way back (flip: about its own x). o.feet: the
// feet that far over the surface (px: on the block); o.hy: the hip that far over it (px; just under the surface if not
// given). The stickman is drawn 1.15 times the poses' size, hip at .8
function swimmer(x,y,s,o,C,back){
  const P=swimPose(o), alt=o.feet!=null?o.feet/s:(o.hy??-.12*s)/s-.8*1.15;
  if(back){ ctx.save(); ctx.translate(x,0); ctx.scale(-1,1); ctx.translate(-x,0); }
  drawAthlete(ctx,s,x,y,alt,{...P,flip:back},C,false,P.rot);
  if(back) ctx.restore();
}
export function drawSwim(V){
  const ev=V.ev, {GY,X,deck}=drawPool({cam:V.cam,ppm:V.ppm,camY:V.camY,len:ev.pool,clock:S.clock,lane:S.plLane+1});
  // rivals: smaller the further back, on the surface of their lane (on the deck by the wall before they dive in)
  S.rivals.forEach((r,i)=>{ if(r.vmax==null) return; const k=RIV_LANES[i%RIV_LANES.length], y=GY+(deck-GY)*k, sc=V.ppm*BODY*(.55-.3*k);
    const d=r.x, x=X(poolX(ev,d)); if(x<-60||x>LW+60) return;
    const o=r.t<=r.react?{st:'block',feet:.2*V.ppm}:r.final!=null&&r.v<.5?{st:'done',t:S.clock+i}:{st:'swim',ph:d/2.2*Math.PI*2+i};
    swimmer(x,y,sc,o,r.a.C,isBack(ev,d)); });
  // ours: on the block, diving, swimming, turning at the wall, at the end
  const sc=V.ppm*BODY, a=S.turning;
  let px=X(poolX(ev,V.x)), o, back=isBack(ev,V.x);
  // on the block (it stands just behind the wall), then the dive: from there to where it lands, the hip high over the
  // water and down into it head first
  if(S.phase==='set'||(S.phase==='wait'&&!S.t&&S.dive==null)){ o={st:'block',set:S.setStage>=1,feet:BLOCK_H*V.ppm}; px=X(-.45); }
  else if(S.dive!=null&&S.dive<DIVE_T){ const u=S.dive/DIVE_T; o={st:'dive',u,hy:((BLOCK_H+.75)*(1-u)+1.6*u*(1-u)-.35*u)*V.ppm}; px=X(-.45+V.x*(1+.45/3.4)); }
  else if(a){ const u=Math.min(1,a.t/a.T); o={st:'turn',u,crash:a.crash,hy:-.35*sc*Math.sin(Math.PI*u)}; back=u>=.5; }
  else if(S.finished) o={st:'done',t:S.clock,hy:-.55*sc};
  else o={st:'swim',ph:V.x/2.2*Math.PI*2,dip:S.dip>0?S.dipT:null};
  swimmer(px,GY,sc,o,ME(),back);
  // the marker over our swimmer
  if(!(S.phase==='set')){ const ty=GY-1.1*sc; ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px-5,ty-7); ctx.lineTo(px+5,ty-7); ctx.lineTo(px,ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  drawPauseBtn();
}
