// "Yo" art: cut-out rig (image parts on the drawChar skeleton) and full-body sprites
import {PARTS,SPR} from './assets.js';
import {ctx} from './canvas.js';
import {INK} from './config.js';

export const RIG={head:.72,torso:.64,shorts:.4,uarm:.34,farm:.36,thigh:.38,shin:.46,T:.52,UA:.27,K:1.25,AW:1.6,LW:1.5};
export function rigReady(){ return ['head','torso','shorts','uarm','farm','thigh','shin'].every(k=>PARTS[k]&&PARTS[k].im.complete&&PARTS[k].dark); }
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
  const part=(k,at,th,hW,dark,wm=1)=>{ const P=PARTS[k], sc=hW*s/P.h, [x,y]=rp(...at); c.save(); c.translate(x,y); c.rotate(th+R0); c.drawImage(dark?P.dark:P.im,-P.px*sc*wm,-P.py*sc,P.w*sc*wm,P.h*sc); c.restore(); };
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
export function drawSprite(k,x,feet,rot){ const sp=SPR[k]; if(!sp||!sp.im.complete) return false; const w=sp.w*SPK, h=sp.h*SPK;
  if(rot){ ctx.save(); ctx.translate(x,feet-h*.4); ctx.rotate(rot); ctx.drawImage(sp.im,-sp.hx*SPK,-h*.6,w,h); ctx.restore(); }
  else ctx.drawImage(sp.im,x-sp.hx*SPK,feet-h+2,w,h); return true; }
