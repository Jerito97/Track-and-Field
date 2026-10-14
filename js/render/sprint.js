// Sprint track rendering
import {ctx,LW} from '../canvas.js';
import {HURDLES,INK} from '../config.js';
import {POSE,runPose} from '../poses.js';
import {animReady,animScale,drawAnim,drawAthlete,drawSprite} from '../rig.js';
import {ME,S} from '../state.js';
import {drawBoards,drawBottomAds,drawStands,hurdle,shadow} from './scenery.js';
import {txt} from './text.js';

const LANES=7;
// every runner is YO_H logical px tall (YO_K: scale for the optional sprites, 144 px tall standing)
const YO_H=60, YO_K=YO_H/144, RIV_K=YO_H/(2.09*24); // 2.09: drawChar height in units of s
// drawn animations (100 m): the run cycle figure is RUN_H px tall, one full cycle (two steps) every STRIDE metres
const STRIDE=4, RUN_H=YO_H*.97;
// frame of a drawn animation for a runner: start (marks/set) or run cycle at distance x; null = use the rig
function animFrame(C,ev,{blocks,setStage,running,cheer,dipT,tripT,standing,x,lane}){
  if(ev.hurdles) return null;
  if(blocks) return animReady(C,'start')?['start',setStage>=1?1:0]:null;
  // finish line dip: lean first, then chest forward
  if(dipT!=null) return animReady(C,'dip')?['dip',dipT<.12?0:1]:null;
  // rival trip (tripT counts down from .4): stumble, then recover
  if(tripT>0) return animReady(C,'trip')?['trip',tripT>.2?0:1]:null;
  // cheer frames: 0 front standing, 1-2 side jump, 3 front arm up (podium)
  if(cheer) return animReady(C,'cheer')?['cheer',1+(Math.floor(S.clock*3+lane*.5)%2)]:null;
  if(running&&animReady(C,'run')){ const n=C.anims.run.frames; return ['run',Math.floor((x/STRIDE+lane*.37)*n)]; }
  // standing still (after the gun, before the first tap): slow breathing between the two frames
  if(standing) return animReady(C,'stand')?['stand',Math.floor(S.clock*1.2+lane*.3)%2]:null;
  return null;
}
export function drawSprint(V){
  const ev=V.ev, s=V.ppm, X=m=>(m-V.cam)*s;
  const TT=176, TB=298, lh=(TB-TT)/LANES;
  ctx.fillStyle='#bcd3ea'; ctx.fillRect(0,0,LW,TT);
  drawStands(V.cam,20,140,S.phase==='run'?1:.3,S.clock);
  drawBoards(V.cam,140,14,s);
  ctx.fillStyle='#a6c94a'; ctx.fillRect(0,154,LW,TT-154);
  for(let i=Math.floor(V.cam/6)-1;i<V.cam/6+LW/(6*s)+2;i+=2){ ctx.fillStyle='#b4d457'; ctx.fillRect(X(i*6),154,6*s,TT-154); }
  const sbx=X(-2); if(sbx>-80&&sbx<LW+20){ ctx.fillStyle='#3a2a12'; ctx.fillRect(sbx,151,54,22); ctx.fillStyle='#ffcb3a'; ctx.fillRect(sbx+3,154,48,16); txt(ev.tag,sbx+27,162.5,INK,11,{stroke:null}); }
  ctx.fillStyle='#2f7fd6'; ctx.fillRect(0,TT,LW,TB-TT);
  ctx.fillStyle='rgba(255,255,255,.05)'; for(let y=TT+4;y<TB;y+=6) ctx.fillRect(0,y,LW,2);
  ctx.fillStyle='#fff'; for(let l=0;l<=LANES;l++) ctx.fillRect(0,Math.round(TT+lh*l)-1,LW,2);
  ctx.fillStyle='#e8262d'; ctx.fillRect(0,TB+1,LW,2);
  const sx=X(0); if(sx>-60&&sx<LW+60){ ctx.fillStyle='#fff'; ctx.fillRect(sx-1.5,TT,3,TB-TT);
    for(let l=0;l<LANES;l++){ const y=TT+lh*(l+.5); ctx.fillStyle='#ffcf1f'; ctx.strokeStyle=INK; ctx.lineWidth=1; ctx.fillRect(X(-1.1),y-3,10,7); ctx.strokeRect(X(-1.1),y-3,10,7); txt(String(l+1),X(1.1),y+1,'#fff',lh*.7,{stroke:null}); } }
  for(let m=10;m<ev.dist;m+=10){ const x=X(m); if(x>-30&&x<LW+30){ ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(x-1,TT,2,5); txt(String(m),x,TT+10,'rgba(255,255,255,.85)',10,{stroke:null}); } }
  const fx=X(ev.dist); if(fx>-20&&fx<LW+20){ ctx.fillStyle='#fff'; ctx.fillRect(fx-2,TT,4,TB-TT); for(let y=TT,j=0;y<TB;y+=5,j++){ ctx.fillStyle=j%2?INK:'#fff'; ctx.fillRect(fx+2,y,5,5); } txt('META',fx,TT-8,'#fff',12); }
  for(let l=0;l<LANES;l++){
    const feet=TT+lh*(l+.85);
    if(ev.hurdles){ const ref=l===S.plLane?S:S.rivals.find(r=>r.lane===l); HURDLES.forEach((h,i)=>{ const x=X(h); if(x>-40&&x<LW+40) hurdle(x,feet,s*.85,ref&&ref.knocked&&ref.knocked.has(i)); }); }
    if(l===S.plLane){ const px=X(V.x); shadow(px,feet,V.y/RIV_K,s*RIV_K);
      let drawn=false;
      if(ME().sprite){ let k;
        if(S.phase==='set'||(S.phase==='wait'&&!S.t)) k=S.setStage>=1?'set':'crouch';
        else if(S.stumble>0) k='stumble'; else if(S.air>0) k='hurdle'; else if(S.dip>0) k='dip';
        else if(V.v>.3) k='run'+(1+Math.floor(((S.legP/(Math.PI*2))*5%5+5)%5)); else k=S.finished?'cheer':'stand';
        drawn=k==='stumble'?drawSprite('run2',px+6,feet,.5,YO_K):drawSprite(k,px+6,feet-V.y*s,0,YO_K);
      }
      if(!drawn){ const blocks=S.phase==='set'||(S.phase==='wait'&&!S.t), f=animFrame(ME(),ev,{blocks,setStage:S.setStage,running:V.v>.3&&!(S.stumble>0)&&!(S.dip>0),cheer:S.finished&&V.v<=.3&&!(S.dip>0),dipT:S.dip>0?S.dipT:null,standing:!(S.stumble>0)&&!(S.air>0),x:V.x,lane:0});
        if(f){ drawAnim(ctx,ME(),f[0],f[1],px,feet-V.y*s,animScale(ME(),RUN_H)); drawn=true; } }
      if(!drawn) drawAthlete(ctx,s*RIV_K,px,feet,V.y/RIV_K,V.pose||POSE.stand,ME(),V.v>5);
      ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; const ty=feet-V.y*s-YO_H-4; ctx.beginPath(); ctx.moveTo(px-5,ty-7); ctx.lineTo(px+5,ty-7); ctx.lineTo(px,ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { const r=S.rivals.find(r=>r.lane===l); if(!r||r.vmax==null) continue; const x=X(r.x); if(x<-60||x>LW+60) continue; shadow(x,feet,r.y/RIV_K,s*RIV_K);
      let J; if(r.t<=r.react) J=S.setStage>=1?POSE.set:POSE.crouch; else if(r.air>0) J=POSE.hurdle; else if(r.tripT>0) J=POSE.stumble; else if(r.final!=null&&r.v<.5) J=POSE.cheer; else J=r.v>.2?runPose(r.legP,Math.min(1,r.v/4)):POSE.stand;
      const f=animFrame(r.a.C,ev,{blocks:r.t<=r.react,setStage:S.setStage,running:r.t>r.react&&!(r.air>0)&&!(r.tripT>0)&&!(r.final!=null&&r.v<.5)&&r.v>.2,cheer:r.final!=null&&r.v<.5,tripT:r.tripT,standing:!(r.air>0),x:r.x,lane:l});
      if(f) drawAnim(ctx,r.a.C,f[0],f[1],x,feet-r.y*s,animScale(r.a.C,RUN_H));
      else drawAthlete(ctx,s*RIV_K,x,feet,r.y/RIV_K,J,r.a.C,r.v>5); }
  }
  drawStarter(X(5.5));
  drawBottomAds();
}
export function drawStarter(x){
  if(x<-120||x>LW+120) return;
  const s=34, base=330, P=(a,b)=>[x+a*s,base-b*s];
  ctx.lineCap='round'; ctx.lineJoin='round';
  const armTop=P(.42,1.95);
  ctx.strokeStyle=INK; ctx.lineWidth=s*.14+4; ctx.beginPath(); ctx.moveTo(...P(.22,1.3)); ctx.lineTo(...armTop); ctx.stroke();
  ctx.strokeStyle='#fff'; ctx.lineWidth=s*.14; ctx.stroke();
  ctx.fillStyle=INK; ctx.fillRect(armTop[0]-3,armTop[1]-s*.18,s*.1,s*.22); ctx.fillRect(armTop[0]-3,armTop[1]-s*.2,s*.26,s*.08);
  if(S.smoke!=null&&S.smoke<1){ const k=S.smoke; ctx.fillStyle=`rgba(255,255,255,${1-k})`; ctx.strokeStyle=`rgba(22,22,29,${.7-k*.7})`; ctx.lineWidth=1.5;
    [[.6,2.1,.12],[.8,2.25,.16],[.55,2.35,.1]].forEach(([a,b,r])=>{ const p=P(a+k*.3,b+k*.4); ctx.beginPath(); ctx.arc(p[0],p[1],r*s*(1+k),0,Math.PI*2); ctx.fill(); ctx.stroke(); }); }
  ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=2.5; ctx.beginPath(); ctx.rect(x-.36*s,base-1.38*s,.72*s,1.2*s); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e8262d'; ctx.fillRect(x-.06*s,base-1.33*s,.12*s,1.1*s);
  ctx.fillStyle='#d9a07a'; ctx.beginPath(); ctx.arc(x,base-1.58*s,.24*s,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#5a5a5a'; ctx.beginPath(); ctx.arc(x,base-1.58*s,.24*s,Math.PI*.1,Math.PI*.9); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(x,base-1.75*s,.44*s,.08*s,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x-.2*s,base-2.02*s,.4*s,.28*s); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e8262d'; ctx.fillRect(x-.2*s,base-1.84*s,.4*s,.06*s);
}
