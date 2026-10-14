// Athlete art: cut-out rig (image parts on the drawChar skeleton) and optional full-body sprites
import {ANIMS,RIGS,SPR} from './assets.js';
import {ctx} from './canvas.js';
import {INK} from './config.js';
import {drawChar} from './draw/character.js';
import {POSE} from './poses.js';

export const RIG={head:.72,torso:.64,shorts:.4,uarm:.34,farm:.36,thigh:.38,shin:.46,T:.52,UA:.27,K:1.25,AW:1.6,LW:1.5};
// true once every part of C's rig has loaded (a missing or broken image keeps the vector fallback)
export function rigReady(C){ const R=C&&RIGS[C.id]; return !!R&&['head','torso','shorts','uarm','farm','thigh','shin'].every(k=>R[k]&&R[k].im.complete&&R[k].im.naturalWidth>0&&R[k].dark); }
// cartoon rig: image parts on the same skeleton as drawChar
export function drawRig(c,s,ox,oy,alt,J,C,rot){
  s*=RIG.K; oy-=alt*s/RIG.K;
  const hipS=[ox,oy-J.hip*.86*s];
  const rp=(x,y)=>{ let px=ox+x*s, py=oy-y*s; if(rot){ const dx=px-hipS[0], dy=py-hipS[1], co=Math.cos(rot), si=Math.sin(rot); px=hipS[0]+dx*co-dy*si; py=hipS[1]+dx*si+dy*co; } return [px,py]; };
  const sl=Math.sin(J.lean), cl=Math.cos(J.lean), hip=[0,J.hip*.86];
  const along=d=>[hip[0]+sl*d,hip[1]+cl*d];
  const shJ=along(RIG.T-.07), neck=along(RIG.T);
  const limb=(o,L1,L2,a,b,sg)=>{ const k=[o[0]+L1*Math.sin(a),o[1]-L1*Math.cos(a)], a2=a+sg*b; return {o,k,e:[k[0]+L2*Math.sin(a2),k[1]-L2*Math.cos(a2)],a,a2}; };
  const legs=J.legs.map(l=>limb(hip,.33,.35,l.a,l.b,-1)), arms=J.arms.map(l=>limb(shJ,RIG.UA,.27,l.a,l.b,1));
  const R0=rot||0;
  const R=RIGS[C.id];
  const part=(k,at,th,hW,dark,wm=1)=>{ const P=R[k], sc=hW*s/P.h, [x,y]=rp(...at); c.save(); c.translate(x,y); c.rotate(th+R0); c.drawImage(dark?P.dark:P.im,-P.px*sc*wm,-P.py*sc,P.w*sc*wm,P.h*sc); c.restore(); };
  const ow=Math.max(1.1,s*.04);
  const seg=(pts,col,w)=>{ const path=()=>{c.beginPath();c.moveTo(...rp(...pts[0]));for(let i=1;i<pts.length;i++)c.lineTo(...rp(...pts[i]));};
    c.lineCap='round'; c.lineJoin='round'; c.strokeStyle=INK; c.lineWidth=w*s+ow*2; path(); c.stroke(); c.strokeStyle=col; c.lineWidth=w*s; path(); c.stroke(); };
  const leg=(L,dark)=>{ part('shin',L.k,-L.a2,RIG.shin,dark,RIG.LW); part('thigh',L.o,-L.a,RIG.thigh,dark,RIG.LW); };
  // back arm, back leg
  part('uarm',arms[1].o,-arms[1].a,RIG.uarm,true,RIG.AW); part('farm',arms[1].k,-arms[1].a2,RIG.farm,true,RIG.AW);
  leg(legs[1],true);
  part('torso',hip,J.lean,RIG.torso,false);
  leg(legs[0],false);
  part('shorts',along(.1),J.lean*.4,RIG.shorts,false);
  part('head',neck,J.lean*.55,RIG.head,false);
  part('uarm',arms[0].o,-arms[0].a,RIG.uarm,false,RIG.AW); part('farm',arms[0].k,-arms[0].a2,RIG.farm,false,RIG.AW);
  return {hand:rp(...arms[0].e)};
}
export const SPK=64/140; // logical px per sprite px
export function drawSprite(k,x,feet,rot,K=SPK){ const sp=SPR[k]; if(!sp||!sp.im.complete) return false; const w=sp.w*K, h=sp.h*K;
  if(rot){ ctx.save(); ctx.translate(x,feet-h*.4); ctx.rotate(rot); ctx.drawImage(sp.im,-sp.hx*K,-h*.6,w,h); ctx.restore(); }
  else ctx.drawImage(sp.im,x-sp.hx*K,feet-h+2,w,h); return true; }
// rig drawn at scale s*RIG_FIT is as tall as drawChar at scale s
export const RIG_FIT=.86;
// any athlete, same call as drawChar: image parts when loaded, vector figure otherwise
export function drawAthlete(c,s,ox,oy,alt,J,C,effort,rot){
  if(rigReady(C)) return drawRig(c,s*RIG_FIT,ox,oy,alt/RIG_FIT,J===POSE.cheer?POSE.cheerRig:J,C,rot||0);
  return drawChar(c,s,ox,oy,alt,J,C,effort,rot);
}
// animation frames (run cycle, start, ...): true once all of C's frames for that animation loaded
export function animReady(C,name){ const A=C&&ANIMS[C.id]&&ANIMS[C.id][name]; return !!A&&A.frames.every(im=>im.complete&&im.naturalWidth>0); }
// frame i of C's animation, hip at x, lowest point at feet; K = logical px per image px (same for every animation)
export function drawAnim(c,C,name,i,x,feet,K){ const A=ANIMS[C.id][name], n=A.frames.length;
  c.drawImage(A.frames[((i%n)+n)%n],x-A.hx*K,feet-A.feet*K,A.w*K,A.h*K); }
// K that makes the run cycle figure H logical px tall
export function animScale(C,H){ const R=ANIMS[C.id].run; return H/(R.feet-2.4); }
