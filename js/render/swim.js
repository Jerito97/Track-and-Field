// Swimming rendering: the pool (pool.js), the swimmer in our lane (cut open in front) and the rivals in the lanes behind
import {ctx,LW} from '../canvas.js';
import {INK} from '../config.js';
import {drawAthlete} from '../rig.js';
import {BLOCK_H,DIVE_T,DIVE_X,FLY_REC,hipX,isBack,REACH} from '../game/swim.js';
import {ME,S} from '../state.js';
import {swimPose} from '../stick.js';
import {drawPauseBtn} from './scenery.js';
import {drawStar,target} from './hud.js';
import {drawPool} from './pool.js';
import {txt} from './text.js';

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
    const d=r.x, x=X(r.t<=r.react?-.45:hipX(ev,d)); if(x<-60||x>LW+60) return;
    const o=r.t<=r.react?{st:'block',feet:.2*V.ppm}:r.final!=null&&r.v<.5?{st:'done',t:S.clock+i}:rivalStroke(ev.stroke,d+i*.7);
    swimmer(x,y,sc,o,r.a.C,isBack(ev,d)); });
  // ours: on the block, diving, swimming, turning at the wall, at the end
  const sc=V.ppm*BODY, a=S.turning;
  let px=X(hipX(ev,V.x)), o, back=isBack(ev,V.x);
  // on the block (it stands just behind the wall), then the dive: from there to where it lands, the hip high over the
  // water and down into it head first
  if(S.dive==null&&!S.finished){ o={st:'block',set:S.setStage>=1,feet:BLOCK_H*V.ppm}; px=X(-.45); }
  else if(S.dive!=null&&S.dive<DIVE_T){ const u=S.dive/DIVE_T; o={st:'dive',u,hy:((BLOCK_H+.75)*(1-u)+1.6*u*(1-u)-.35*u)*V.ppm}; px=X(-.45+(DIVE_X-REACH+.45)*u); }
  else if(a){ const u=Math.min(1,a.t/a.T), open=ev.stroke!=='crawl'; o={st:'turn',u,open,crash:a.crash,hy:(open&&u<.5?-.05:-.35*Math.sin(Math.PI*u))*sc}; back=u>=.5; }
  else if(S.finished) o={st:'done',t:S.clock,hy:-.55*sc};
  else o={st:'swim',stroke:ev.stroke,ph:S.strokePh,dip:S.dip>0?S.dipT:null,...ownStroke(ev.stroke,sc)};
  swimmer(px,GY,sc,o,ME(),back);
  if(!S.finished&&!S.turning) strokeCue(px,GY,sc,back);
  // the marker over our swimmer
  if(!(S.phase==='set')){ const ty=GY-1.1*sc; ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px-5,ty-7); ctx.lineTo(px+5,ty-7); ctx.lineTo(px,ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  drawPauseBtn();
}

// our stroke's progress, from the game: breaststroke since the last stroke; butterfly holding (the star) or the arms
// coming back; the hip lower as it dives into a butterfly pull
function ownStroke(k,sc){
  if(k==='breast') return {u:S.strokeAt==null?1:Math.min(1,(S.clock-S.strokeAt)/.9)};
  if(k==='fly'){ const f=S.fly, m=S.meter;
    if(f&&f.st==='hold'&&m) return {fly:{st:'hold',p:Math.min(1,m.p)},hy:(-.12-.3*Math.min(1,m.p))*sc};
    if(f&&f.st==='rec') return {fly:{st:'rec',r:f.t/FLY_REC},hy:(-.42+.4*Math.min(1,f.t/.25))*sc};
    return {fly:{st:'glide'}}; }
  return {};
}
// the rivals' strokes from how far they've swum
function rivalStroke(k,d){
  if(k==='breast') return {st:'swim',stroke:k,u:(d/2.8)%1*1.3};
  if(k==='fly'){ const s=(d/3.2)%1; return {st:'swim',stroke:k,fly:s<.6?{st:'hold',p:s/.6}:{st:'rec',r:(s-.6)/.4}}; }
  return {st:'swim',stroke:k,ph:d/4.5*Math.PI*2};
}
// what to press, drawn by the swimmer: breaststroke, a ring closing on the head (press as it closes); butterfly, the
// bar over the swimmer with the star running to the circle while holding
function strokeCue(px,GY,sc,back){
  const c=S.cue, m=S.meter;
  if(c&&c.beat){ const hx=px+(back?-1:1)*.85*sc, hy=GY-.12*sc, k=1-c.t/c.T, r=Math.max(3,13+70*k);  // (late, it goes on closing past the circle)
    ctx.lineWidth=3; ctx.strokeStyle='rgba(47,209,102,.95)'; ctx.beginPath(); ctx.arc(hx,hy,13,0,Math.PI*2); ctx.stroke();
    ctx.lineWidth=4; ctx.strokeStyle=c.t>c.T?'rgba(255,90,60,.9)':'#fff'; ctx.beginPath(); ctx.arc(hx,hy,r,0,Math.PI*2); ctx.stroke(); }
  if(m&&m.k==='fly'){ const y=GY-1.7*sc, x0=px-60, x1=px+60, p=Math.min(m.hit??m.p,1.3);
    ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=11; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
    ctx.strokeStyle='#fff'; ctx.lineWidth=7; ctx.stroke(); ctx.strokeStyle='rgba(47,209,102,.9)'; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+(x1-x0)*Math.min(1,p),y); ctx.stroke();
    target(x1,y); drawStar(x0+(x1-x0)*p,y,10,p,true);
    if(m.hit==null) txt('SOLTÁ EN EL CÍRCULO',px,y-22,'#fff',16,{lw:4}); }
}
