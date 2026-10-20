// Vector cartoon characters
import {INK} from '../config.js';
import {STYLE} from '../storage.js';

export const shadeHex=(hex,k)=>{ const n=parseInt(hex.slice(1),16); return `rgb(${Math.round((n>>16)*k)},${Math.round((n>>8&255)*k)},${Math.round((n&255)*k)})`; };
export function drawHead(c,s,hx,hy,C,effort,ow){
  const R=.35;
  c.save(); c.translate(hx,hy); c.scale(s,-s); c.lineWidth=ow*2/s; c.lineJoin='round'; c.lineCap='round';
  const fs=(fill)=>{ c.fillStyle=fill; c.fill(); c.strokeStyle=INK; c.stroke(); };
  if(C.hair==='braid'){ c.beginPath(); c.moveTo(-R*.7,R*.2); c.quadraticCurveTo(-R*1.6,-R*.1,-R*1.5,-R*.9); c.lineWidth=.11; c.strokeStyle=INK; c.stroke(); c.lineWidth=.07; c.strokeStyle=C.hc; c.stroke(); c.lineWidth=ow*2/s; c.beginPath(); c.arc(-R*1.5,-R*.95,.06,0,Math.PI*2); fs(C.hc); }
  if(C.hair==='curly'){ for(let a=.2;a<3.7;a+=.36){ c.beginPath(); c.arc(Math.cos(a)*R*1.0,Math.sin(a)*R*1.0,.1,0,Math.PI*2); fs(C.hc); } }
  if(C.hair==='buns'){ [[-.05,1.05],[-.75,.75]].forEach(([x,y])=>{ c.beginPath(); c.arc(x*R*1.2,y*R*1.1,.11,0,Math.PI*2); fs(C.hc); }); }
  c.beginPath(); c.arc(0,0,R,0,Math.PI*2); fs(C.skin);
  c.beginPath(); c.arc(-R*.12,-R*.05,.06,0,Math.PI*2); fs(C.skin);
  if(C.hair!=='bald'){ c.beginPath(); c.arc(0,0,R*1.03,.55,Math.PI+.35); c.quadraticCurveTo(-R*.2,R*.25,R*.6,R*.55); c.closePath(); fs(C.hc); }
  if(C.hair==='spiky'){ for(let k=0;k<5;k++){ const a=.75+k*.48; c.beginPath(); c.moveTo(Math.cos(a-.26)*R,Math.sin(a-.26)*R); c.lineTo(Math.cos(a)*R*1.55,Math.sin(a)*R*1.55); c.lineTo(Math.cos(a+.26)*R,Math.sin(a+.26)*R); c.closePath(); fs(C.hc); } }
  if(C.hair==='bald'){ c.beginPath(); c.moveTo(R*.95,-R*.15); c.quadraticCurveTo(R*.9,-R*1.25,-R*.1,-R*.95); c.quadraticCurveTo(-R*.4,-R*.6,-R*.55,-R*.25); c.quadraticCurveTo(R*.3,-R*.5,R*.95,-R*.15); fs(C.hc); }
  if(C.beard){ c.beginPath(); c.arc(R*.15,-R*.05,R*.95,-1.45,.15); c.lineTo(R*.55,-R*.2); c.quadraticCurveTo(R*.2,-R*.2,R*.05,R*.2); c.closePath(); c.fillStyle=C.hc; c.fill(); }
  if(C.band){ c.beginPath(); c.moveTo(-R*.9,R*.35); c.lineTo(R*.95,R*.42); c.lineWidth=.06; c.strokeStyle=C.band; c.stroke(); c.lineWidth=ow*2/s; }
  c.beginPath(); c.ellipse(R*.5,R*.12,.09,.115,0,0,Math.PI*2); fs('#fff');
  c.beginPath(); c.arc(R*.64,R*.1,.045,0,Math.PI*2); c.fillStyle=INK; c.fill();
  c.beginPath(); c.moveTo(R*.3,R*.52); c.lineTo(R*.78,effort?R*.42:R*.5); c.strokeStyle=INK; c.lineWidth=.035; c.stroke();
  c.beginPath(); c.arc(R*.98,-R*.05,.05,-1.2,1.2); c.fillStyle=C.skin; c.fill(); c.lineWidth=ow*1.6/s; c.stroke();
  if(effort){ c.beginPath(); c.ellipse(R*.62,-R*.5,.06,.045,0,0,Math.PI*2); fs('#7a1d22'); }
  else { c.beginPath(); c.arc(R*.55,-R*.35,.07,-1.9,-.6,false); c.lineWidth=.03; c.strokeStyle=INK; c.stroke(); }
  c.restore();
}
const STICK_K=1.15;
// smooth stickman: when the pose changes kind (run -> jump, jump -> landing...), blend from what was on screen to
// the new pose over BLEND_T s; continuous motion (the run cycle) passes straight through. One state per athlete
// and canvas.
const BLEND_T=.16, BLENDS=new WeakMap();
const flat=(J,rot)=>[J.hip,J.lean,...J.legs.flatMap(l=>[l.a,l.b]),...J.arms.flatMap(l=>[l.a,l.b]),rot||0];
const unflat=v=>({hip:v[0],lean:v[1],legs:[{a:v[2],b:v[3]},{a:v[4],b:v[5]}],arms:[{a:v[6],b:v[7]},{a:v[8],b:v[9]}],rot:v[10]});
function blendPose(c,C,J,rot){
  let m=BLENDS.get(c); if(!m){ m=new Map(); BLENDS.set(c,m); }
  // kind: the movement this pose belongs to (stick.js); untagged poses (the game's fixed ones) change when their values do
  // flip: drawn mirrored (high jump, pole vault over the bar); turning around is its own change, so no blending across it
  const now=performance.now()/1000, cur=flat(J,rot), e=m.get(C.id), kind=J.kind||(J.run?'run':null), flip=!!J.flip;
  if(!e||now-e.t>.5||e.flip!==flip){ m.set(C.id,{t:now,tgt:cur,kind,out:cur,from:null,t0:0,flip}); return {J,rot}; }
  const changed=kind!=null?kind!==e.kind:(e.kind!=null||cur.some((v,i)=>Math.abs(v-e.tgt[i])>.02));
  if(changed){ e.from=e.out.slice(); e.t0=now; const d=e.from[10]-cur[10]; e.from[10]-=Math.round(d/(2*Math.PI))*2*Math.PI; }  // turn the short way
  const w=e.from?Math.max(0,1-(now-e.t0)/BLEND_T):0, k=w*w*(3-2*w);  // smoothstep ease
  const out=k>0?cur.map((v,i)=>v+(e.from[i]-v)*k):cur;
  if(k<=0) e.from=null;
  Object.assign(e,{t:now,tgt:cur,kind,out});
  const P=unflat(out); return {J:P,rot:P.rot};
}
// stickman: thick round lines and a filled head, all in the athlete's colour (far limbs a bit darker);
// same skeleton, origin and return value as drawChar
export function drawStick(c,s,ox,oy,alt,J,C,rot){
  ({J,rot}=blendPose(c,C,J,rot));
  oy-=alt*s; s*=STICK_K;  // a bit bigger than the vector doll, as tall as the drawn characters
  const hip=[0,J.hip], sl=Math.sin(J.lean), cl=Math.cos(J.lean);
  const sh=[hip[0]+.44*sl,hip[1]+.44*cl], head=[sh[0]+.27*sl,sh[1]+.27*cl];
  const limb=(o,L1,L2,a,b,sg)=>{ const k=[o[0]+L1*Math.sin(a),o[1]-L1*Math.cos(a)], a2=a+sg*b; return [k,[k[0]+L2*Math.sin(a2),k[1]-L2*Math.cos(a2)]]; };
  const legs=J.legs.map(l=>limb(hip,.4,.4,l.a,l.b,-1)), arms=J.arms.map(l=>limb(sh,.27,.25,l.a,l.b,1));
  const hipS=[ox,oy-J.hip*s];
  const rp=(x,y)=>{ let px=ox+x*s, py=oy-y*s; if(rot){ const dx=px-hipS[0], dy=py-hipS[1], co=Math.cos(rot), si=Math.sin(rot); px=hipS[0]+dx*co-dy*si; py=hipS[1]+dx*si+dy*co; } return [px,py]; };
  const w=Math.max(2.6,s*.13), col=C.j, back=shadeHex(C.j,.72);
  c.lineCap='round'; c.lineJoin='round'; c.lineWidth=w;
  const seg=(pts,cl)=>{ c.strokeStyle=cl; c.beginPath(); c.moveTo(...rp(...pts[0])); for(let i=1;i<pts.length;i++) c.lineTo(...rp(...pts[i])); c.stroke(); };
  seg([sh,arms[1][0],arms[1][1]],back); seg([hip,legs[1][0],legs[1][1]],back);
  seg([hip,sh,head],col);
  const hp=rp(...head); c.fillStyle=col; c.beginPath(); c.arc(hp[0],hp[1],s*.21,0,Math.PI*2); c.fill();
  seg([hip,legs[0][0],legs[0][1]],col); seg([sh,arms[0][0],arms[0][1]],col);
  return {hand:rp(...arms[0][1])};
}
// figure with feet origin at (ox,oy); alt in meters; rot rotates around the hip
export function drawChar(c,s,ox,oy,alt,J,C,effort,rot){
  if(STYLE.stick) return drawStick(c,s,ox,oy,alt,J,C,rot);
  oy-=alt*s;
  const hip=[0,J.hip], sl=Math.sin(J.lean), cl=Math.cos(J.lean);
  const sh=[hip[0]+.42*sl,hip[1]+.42*cl], head=[sh[0]+.36*sl,sh[1]+.36*cl];
  const limb=(o,L1,L2,a,b,sg)=>{ const k=[o[0]+L1*Math.sin(a),o[1]-L1*Math.cos(a)], a2=a+sg*b; return [k,[k[0]+L2*Math.sin(a2),k[1]-L2*Math.cos(a2)]]; };
  const legs=J.legs.map(l=>limb(hip,.4,.4,l.a,l.b,-1)), arms=J.arms.map(l=>limb(sh,.26,.24,l.a,l.b,1));
  const hipS=[ox,oy-J.hip*s];
  const rp=(x,y)=>{ let px=ox+x*s, py=oy-y*s; if(rot){ const dx=px-hipS[0], dy=py-hipS[1], co=Math.cos(rot), si=Math.sin(rot); px=hipS[0]+dx*co-dy*si; py=hipS[1]+dx*si+dy*co; } return [px,py]; };
  c.lineCap='round'; c.lineJoin='round';
  const ow=Math.max(1.1,s*.045);
  const seg=(pts,col,w)=>{ const path=()=>{c.beginPath();c.moveTo(...rp(...pts[0]));for(let i=1;i<pts.length;i++)c.lineTo(...rp(...pts[i]));};
    c.strokeStyle=INK; c.lineWidth=w*s+ow*2; path(); c.stroke(); c.strokeStyle=col; c.lineWidth=w*s; path(); c.stroke(); };
  const shoe=(lg,col)=>seg([lg[1],[lg[1][0]+.12,lg[1][1]-.01]],col,.1);
  seg([hip,legs[1][0],legs[1][1]],shadeHex(C.skin,.82),.13); shoe(legs[1],shadeHex(C.shoe,.8));
  seg([sh,arms[1][0],arms[1][1]],shadeHex(C.skin,.82),.11);
  seg([[hip[0],hip[1]+.05],sh],C.j,.38);
  c.strokeStyle=C.j2; c.lineWidth=s*.06; c.beginPath(); c.moveTo(...rp(hip[0]+.06*sl,hip[1]+.12*cl)); c.lineTo(...rp(sh[0]-.02*sl,sh[1]-.05*cl)); c.stroke();
  seg([[hip[0]-.02,hip[1]+.04*cl],[hip[0]+.02,hip[1]-.06*cl]],C.sh,.3);
  const hp=rp(...head);
  c.save(); if(rot){ c.translate(hp[0],hp[1]); c.rotate(rot); c.translate(-hp[0],-hp[1]); }
  drawHead(c,s,hp[0],hp[1],C,effort,ow); c.restore();
  seg([hip,legs[0][0],legs[0][1]],C.skin,.13); shoe(legs[0],C.shoe);
  seg([sh,arms[0][0],arms[0][1]],C.skin,.11);
  return {hand:rp(...arms[0][1])};
}
