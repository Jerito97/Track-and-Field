// Sprint track rendering
import {ctx,LW} from '../canvas.js';
import {HURDLES,INK} from '../config.js';
import {POSE,runPose} from '../poses.js';
import {animReady,animScale,drawAnim,drawAthlete,drawSprite} from '../rig.js';
import {SPRINT_PPM} from '../game/core.js';
import {G,ME,S} from '../state.js';
import {sprintPose} from '../stick.js';
import {STYLE} from '../storage.js';
import {SCENE} from '../assets.js';
import {drawBackdrop,drawBoards,drawBottomAds,drawPauseBtn,drawStands,GRASS,GRASS_L,hurdle,LINE,setTheme,shadow,TARTAN,TARTAN_D} from './scenery.js';
import {txt} from './text.js';
import {BACK,CH_OK,CH_W,changes,MATE} from '../game/relay.js';
import {D,DIRS,laserAim,laserArrow,scope} from '../game/laser.js';

const LANES=6;
// every runner is YO_H logical px tall (YO_K: scale for the optional sprites, 144 px tall standing)
const YO_H=72, YO_K=YO_H/144, RIV_K=YO_H/(2.09*SPRINT_PPM); // 2.09: drawChar height in units of s
// drawn animations (100 m): the run cycle figure is RUN_H px tall, one full cycle (two steps) every STRIDE metres
const STRIDE=4, RUN_H=YO_H*.97;
// frame of a drawn animation for a runner: start (marks/set) or run cycle at distance x; null = use the rig
function animFrame(C,ev,{blocks,setStage,running,cheer,dipT,tripT,airU,standing,x,lane}){
  if(blocks) return animReady(C,'start')?['start',setStage>=1?1:0]:null;
  // clearing a hurdle (airU 0..1 through the jump; the game lifts the figure): take-off, over, landing
  if(airU!=null) return animReady(C,'hurdle')?['hurdle',airU<.3?0:airU<.72?1:2]:null;
  // finish line dip: lean first, then chest forward
  if(dipT!=null) return animReady(C,'dip')?['dip',dipT<.12?0:1]:null;
  // trip or knocked hurdle (tripT counts down from ~.4): stumble, then recover
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
  setTheme(G.mode==='surv');
  ctx.fillStyle='#bcd3ea'; ctx.fillRect(0,0,LW,TT);
  // grandstand picture (slower than the track: further away); without it, the stands drawn in code
  if(!drawBackdrop(V.cam*s*.45,0,154)){ drawStands(V.cam,20,140,S.phase==='run'?1:.3,S.clock); drawBoards(V.cam,140,14,s); }
  ctx.fillStyle=GRASS; ctx.fillRect(0,154,LW,TT-154);
  for(let i=Math.floor(V.cam/6)-1;i<V.cam/6+LW/(6*s)+2;i+=2){ ctx.fillStyle=GRASS_L; ctx.fillRect(X(i*6),154,6*s,TT-154); }
  const sbx=X(-2); if(sbx>-80&&sbx<LW+20){ ctx.fillStyle='#3a2a12'; ctx.fillRect(sbx,151,54,22); ctx.fillStyle='#ffcb3a'; ctx.fillRect(sbx+3,154,48,16); txt(ev.tag,sbx+27,162.5,INK,11,{stroke:null}); }
  ctx.fillStyle=TARTAN; ctx.fillRect(0,TT,LW,TB-TT);
  ctx.fillStyle=TARTAN_D; for(let l=0;l<LANES;l++) ctx.fillRect(0,TT+lh*l+lh*.55,LW,lh*.45);
  ctx.fillStyle=LINE; for(let l=0;l<=LANES;l++) ctx.fillRect(0,Math.round(TT+lh*l)-1,LW,2);
  ctx.fillStyle=TARTAN; ctx.fillRect(0,TB+1,LW,301-TB);
  const sx=X(0); if(sx>-60&&sx<LW+60){ ctx.fillStyle='#fff'; ctx.fillRect(sx-1.5,TT,3,TB-TT);
    for(let l=0;l<LANES;l++){ const y=TT+lh*(l+.5); ctx.fillStyle='#ffcf1f'; ctx.strokeStyle=INK; ctx.lineWidth=1; ctx.fillRect(X(-1.1),y-3,10,7); ctx.strokeRect(X(-1.1),y-3,10,7); txt(String(l+1),X(1.1),y+1,'#fff',lh*.7,{stroke:null}); } }
  for(let m=10;m<ev.dist;m+=10){ const x=X(m); if(x>-30&&x<LW+30){ ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(x-1,TT,2,5); txt(String(m),x,TT+10,'rgba(255,255,255,.85)',10,{stroke:null}); } }
  const fx=X(ev.dist); if(fx>-20&&fx<LW+20){ ctx.fillStyle='#fff'; ctx.fillRect(fx-2,TT,4,TB-TT); for(let y=TT,j=0;y<TB;y+=5,j++){ ctx.fillStyle=j%2?INK:'#fff'; ctx.fillRect(fx+2,y,5,5); } txt('META',fx,TT-8,'#fff',12); }
  for(let l=0;l<LANES;l++){
    const feet=TT+lh*(l+.85);
    if(ev.hurdles){ const ref=l===S.plLane?S:S.rivals.find(r=>r.lane===l); HURDLES.forEach((h,i)=>{ const x=X(h); if(x>-40&&x<LW+40) hurdle(x,feet,s*.85,ref&&ref.knocked&&ref.knocked.has(i)); }); }
    if(l===S.plLane&&ev.relay) relayLane(ev,X,TT+lh*l,lh,feet,s);
    if(l===S.plLane){ const px=X(V.x); shadow(px,feet,V.y/RIV_K,s*RIV_K);
      let drawn=false;
      if(ME().sprite){ let k;
        if(S.phase==='set'||(S.phase==='wait'&&!S.t)) k=S.setStage>=1?'set':'crouch';
        else if(S.stumble>0) k='stumble'; else if(S.air>0) k='hurdle'; else if(S.dip>0) k='dip';
        else if(V.v>.3) k='run'+(1+Math.floor(((S.legP/(Math.PI*2))*5%5+5)%5)); else k=S.finished?'cheer':'stand';
        drawn=k==='stumble'?drawSprite('run2',px+6,feet,.5,YO_K):drawSprite(k,px+6,feet-V.y*s,0,YO_K);
      }
      if(!drawn){ const blocks=S.phase==='set'||(S.phase==='wait'&&!S.t), f=animFrame(ME(),ev,{blocks,setStage:S.setStage,running:V.v>.3&&!(S.stumble>0)&&!(S.dip>0),cheer:S.finished&&V.v<=.3&&!(S.dip>0),dipT:S.dip>0?S.dipT:null,tripT:S.stumble>0?S.stumble+.05:0,airU:S.air>0?1-S.air/S.airT:null,standing:!(S.stumble>0)&&!(S.air>0),x:V.x,lane:0});
        if(f){ drawAnim(ctx,ME(),f[0],f[1],px,feet-V.y*s,animScale(ME(),RUN_H)); drawn=true; } }
      let fig=null;
      if(!drawn) fig=drawAthlete(ctx,s*RIV_K,px,feet,V.y/RIV_K,STYLE.stick?sprintPose({blocks:S.phase==='set'||(S.phase==='wait'&&!S.t),setStage:S.setStage,airU:S.air>0?1-S.air/S.airT:null,dipT:S.dip>0?S.dipT:null,tripT:S.stumble>0?S.stumble:0,cheer:S.finished&&V.v<=.3&&!(S.dip>0),running:V.v>.3,legP:S.legP,v:V.v,clock:S.clock,lane:0}):V.pose||POSE.stand,ME(),V.v>5);
      if(ev.relay&&!S.finished) baton(fig&&fig.hand?fig.hand:[px+10,feet-YO_H*.4]);
      ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; const ty=feet-V.y*s-YO_H-4; ctx.beginPath(); ctx.moveTo(px-5,ty-7); ctx.lineTo(px+5,ty-7); ctx.lineTo(px,ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { const r=S.rivals.find(r=>r.lane===l); if(!r||r.vmax==null) continue; const x=X(r.x); if(x<-60||x>LW+60) continue; shadow(x,feet,r.y/RIV_K,s*RIV_K);
      let J; if(r.t<=r.react) J=S.setStage>=1?POSE.set:POSE.crouch; else if(r.air>0) J=POSE.hurdle; else if(r.tripT>0) J=POSE.stumble; else if(r.final!=null&&r.v<.5) J=POSE.cheer; else J=r.v>.2?runPose(r.legP,Math.min(1,r.v/4)):POSE.stand;
      const f=animFrame(r.a.C,ev,{blocks:r.t<=r.react,setStage:S.setStage,running:r.t>r.react&&!(r.air>0)&&!(r.tripT>0)&&!(r.final!=null&&r.v<.5)&&r.v>.2,cheer:r.final!=null&&r.v<.5,tripT:r.tripT,airU:r.air>0?1-r.air/r.airT:null,standing:!(r.air>0),x:r.x,lane:l});
      if(f) drawAnim(ctx,r.a.C,f[0],f[1],x,feet-r.y*s,animScale(r.a.C,RUN_H));
      else drawAthlete(ctx,s*RIV_K,x,feet,r.y/RIV_K,STYLE.stick?sprintPose({blocks:r.t<=r.react,setStage:S.setStage,airU:r.air>0?1-r.air/r.airT:null,tripT:r.tripT,cheer:r.final!=null&&r.v<.5,running:r.v>.2,legP:r.legP,v:r.v,clock:S.clock,lane:l}):J,r.a.C,r.v>5); }
  }
  if(ev.laser) ev.ranges.forEach(m=>rangeLine(X(m),TT,TB));
  drawBottomAds(); drawStarter(X(5.5));
  if(ev.laser&&S.shot) drawScope();
  drawPauseBtn();
}
// the race starter, standing on the grass below the lanes (or where told: feet at base, h tall): arm up with the
// pistol, then firing (smoke) at the gun
const ST_H=84, ST_FEET=.315;  // figure height (logical px) and where the feet are across the picture
export function drawStarter(x,base=319,h=ST_H){
  if(x<-120||x>LW+120) return;
  const im=SCENE.starter[S.smoke!=null&&S.smoke<1?1:0];
  if(im.naturalWidth){ const w=h*im.naturalWidth/im.naturalHeight; ctx.drawImage(im,x-w*ST_FEET,base-h,w,h); return; }
  drawStarterVector(x,base+11*h/ST_H,34*h/ST_H);
}
function drawStarterVector(x,base=330,s=34){
  if(x<-120||x>LW+120) return;
  const P=(a,b)=>[x+a*s,base-b*s];
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

// 4x100: in our lane, before each change mark the board (orange, yellow, green in the middle, its middle in white),
// where each baton was handed over, the next runner waiting just past the board, and the one who handed it over
// slowing down behind
function relayLane(ev,X,top,lh,feet,s){
  const half=CH_OK+CH_W;
  changes(ev).forEach((mk,i)=>{ const m=mk-BACK, a=X(m-half), b=X(m+half); if(b<-10||a>LW+10) return;
    ctx.fillStyle='#fff'; ctx.fillRect(a-2,top,b-a+4,lh);
    [[half,'#ff8a1e'],[half*.5,'#ffd23a'],[CH_OK,'#2fd166']].forEach(([d,c])=>{ ctx.fillStyle=c; ctx.fillRect(X(m-d),top+1,X(m+d)-X(m-d),lh-2); });
    ctx.fillStyle='#fff'; ctx.fillRect(X(m)-1,top,2,lh);
    if(i>=S.leg) txt('PASE',X(m),top-6,'#fff',10); });
  (S.prints||[]).forEach(x=>{ const px=X(x); if(px<-10||px>LW+10) return; ctx.fillStyle=INK; ctx.beginPath(); ctx.moveTo(px-4,top+lh+5); ctx.lineTo(px+4,top+lh+5); ctx.lineTo(px,top+lh-1); ctx.closePath(); ctx.fill(); });
  const C=ME(), sk=s*RIV_K, next=changes(ev)[S.leg];
  if(next!=null){ const x=X(next-BACK+MATE); if(x>-60&&x<LW+60) drawAthlete(ctx,sk,x,feet,0,STYLE.stick?sprintPose({running:false,clock:S.clock,lane:1}):POSE.stand,C,false); }
  const p=S.prev; if(p&&p.t<3){ const x=X(p.x); if(x>-60&&x<LW+60) drawAthlete(ctx,sk,x,feet,0,STYLE.stick?sprintPose({running:p.v>.3,legP:p.legP||0,v:p.v,clock:S.clock,lane:2}):p.v>.3?runPose(p.legP||0,Math.min(1,p.v/4)):POSE.stand,C,p.v>5); }
}
// the baton in the runner's (near) hand, sticking out both sides of the fist
function baton([hx,hy]){ ctx.save(); ctx.translate(hx,hy); ctx.rotate(-.35); ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.roundRect(-5,-2.2,14,4.4,2); ctx.fill(); ctx.stroke(); ctx.restore(); }

// laser run: the firing line across the lanes (yellow and black) with its sign
function rangeLine(x,TT,TB){ if(x<-40||x>LW+40) return;
  for(let y=TT,j=0;y<TB;y+=6,j++){ ctx.fillStyle=j%2?INK:'#ffd23a'; ctx.fillRect(x-2,y,4,Math.min(6,TB-y)); }
  ctx.fillStyle=INK; ctx.fillRect(x-1,TT-22,2,22); ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(x-20,TT-34,40,14,3); ctx.fill(); ctx.stroke();
  txt('TIRO',x,TT-27,INK,10,{stroke:null}); }
// laser run, shooting: everything dark but a round sight with the four arrow buttons around it; in it the range (sky, a
// far stand, grass) and the board with the five targets, swaying (the board moves, the cross stays in the middle), the
// one to shoot ringed in yellow, with the arrow on it when there is one; hits white, misses marked; below, the five
// shots so far
function drawScope(){
  const s=S.shot, {cx,cy,R,u}=scope(), [px,py]=laserAim();
  ctx.save();
  ctx.fillStyle='rgba(4,8,18,.92)'; ctx.beginPath(); ctx.rect(0,0,LW,320); ctx.arc(cx,cy,R,0,Math.PI*2,true); ctx.fill('evenodd');
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
  // the range, moving with the sight (further things a little less)
  const bx=cx+(px-s.k*D)*u, by=cy+py*u;
  const hz=by+3.4*u, sky=ctx.createLinearGradient(0,hz-2*R,0,hz); sky.addColorStop(0,'#6fc0f0'); sky.addColorStop(1,'#d8f0fb');
  ctx.fillStyle=sky; ctx.fillRect(cx-R,cy-R,2*R,2*R);
  const gr=ctx.createLinearGradient(0,hz,0,hz+2*R); gr.addColorStop(0,'#8acf55'); gr.addColorStop(1,'#4f9a33');
  ctx.fillStyle=gr; ctx.fillRect(cx-R,hz,2*R,Math.max(0,cy+R-hz));
  ctx.fillStyle='#b7c2d3'; ctx.fillRect(cx-R,by-u*5.2,2*R,u*1.6); ctx.fillStyle='#8e9bb0'; ctx.fillRect(cx-R,by-u*3.6,2*R,u*.25);
  for(let i=-40;i<40;i++){ const x=cx+px*u*.6+i*u*.55; if(x<cx-R-5||x>cx+R+5) continue; ctx.fillStyle=['#e8262d','#2f6fd6','#ffd23a','#1f9e54','#ff8a1f'][(i+80)%5]; ctx.beginPath(); ctx.arc(x,by-u*4.5,u*.18,0,Math.PI*2); ctx.fill(); }
  // a hedge along the far end of the range
  ctx.fillStyle='#3f8a3a'; ctx.fillRect(cx-R,hz-u*.9,2*R,u*.9);
  for(let i=-30;i<30;i++){ const x=cx+px*u*.85+i*u*.9; if(x<cx-R-u||x>cx+R+u) continue; ctx.beginPath(); ctx.arc(x,hz-u*.9,u*.55,Math.PI,0); ctx.fill(); }
  // the board: white with a light blue frame, a red banner on the right, the lane number on the left
  const w=(4*D+3)*u, h=3*u, x0=bx-1.5*u, y0=by-h/2;
  ctx.fillStyle='#16161d'; [.25,.75].forEach(f=>ctx.fillRect(x0+w*f-.3*u,y0+h,.6*u,u*3));
  ctx.fillStyle='#fff'; ctx.strokeStyle='#5fa7d9'; ctx.lineWidth=u*.35; ctx.beginPath(); ctx.roundRect(x0,y0,w,h,u*.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e8262d'; ctx.fillRect(x0+w+u*.2,y0-u*.2,u*2.4,h+u*.4); ctx.fillStyle='#fff'; ctx.save(); ctx.translate(x0+w+u*1.4,by); ctx.rotate(-Math.PI/2); ctx.font=`italic ${Math.round(u*.9)}px Bangers, Impact, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('LASER',0,0); ctx.restore();
  ctx.fillStyle='#14284f'; ctx.fillRect(x0-u*2.6,by-u*1.1,u*2.2,u*2.2); txt(String((S.ri||0)+1).padStart(2,'0'),x0-u*1.5,by,'#fff',Math.round(u*1.2),{stroke:null});
  for(let i=0;i<5;i++){ const tx=bx+i*D*u, r=s.res[i];
    ctx.fillStyle=r&&r.hit?'#fff':INK; ctx.strokeStyle=r&&r.hit?'#9aa5b8':INK; ctx.lineWidth=u*.15; ctx.beginPath(); ctx.arc(tx,by,u,0,Math.PI*2); ctx.fill(); ctx.stroke();
    if(r&&!r.hit){ ctx.fillStyle='#ff5a3c'; ctx.beginPath(); ctx.arc(tx+r.x*u,by+r.y*u,u*.2,0,Math.PI*2); ctx.fill(); }
    if(i===s.k){ ctx.strokeStyle='#ffd23a'; ctx.lineWidth=u*.3; ctx.beginPath(); ctx.arc(tx,by,u*1.4,0,Math.PI*2); ctx.stroke();
      const d=laserArrow(); if(d) arrowGlyph(tx,by,u*(.1+.55*d.k),...DIRS[d.dir]); } }
  // the edge of the lens, dark
  const vg=ctx.createRadialGradient(cx,cy,R*.55,cx,cy,R); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.75)'); ctx.fillStyle=vg; ctx.fillRect(cx-R,cy-R,2*R,2*R);
  ctx.restore();
  // the cross, and the lens ring
  ctx.strokeStyle='rgba(20,20,30,.85)'; ctx.lineWidth=1.5; const g=u*.5;
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([a,b])=>{ ctx.beginPath(); ctx.moveTo(cx+a*g,cy+b*g); ctx.lineTo(cx+a*R*.8,cy+b*R*.8); ctx.stroke(); });
  ctx.fillStyle='#ff3b30'; ctx.beginPath(); ctx.arc(cx,cy,2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#2b3a55'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
  // the arrows on the ring (the one just pressed lit green for a hit, red for a miss)
  const f=s.flash&&s.flash.t<.3?s.flash:null;
  Object.entries(DIRS).forEach(([d,[dx,dy]])=>arrowBtn(cx+dx*R,cy+dy*R,15,dx,dy,f&&f.dir===d?(f.hit?'#2fd166':'#ff5a3c'):null));
  // the five shots so far, under the sight
  for(let i=0;i<5;i++){ const r=s.res[i], x=cx+(i-2)*18, y=cy+R+30;
    ctx.fillStyle=!r?'rgba(255,255,255,.18)':r.hit?'#2fd166':'#ff5a3c'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
  if(s.k<5&&!S.demo) txt('TOCÁ LA FLECHA QUE APARECE EN EL BLANCO',cx,cy-R-22,'#fff',13,{lw:3});
}
// a round arrow button (blue, white arrow; lit: that colour) pointing dx,dy
export function arrowBtn(x,y,r,dx,dy,lit,c=ctx){
  c.fillStyle=lit||'#2f6fd6'; c.strokeStyle='#fff'; c.lineWidth=Math.max(2,r*.16); c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); c.stroke();
  arrowGlyph(x,y,r*.5,dx,dy,'#fff',c);
}
// a white arrow of half-length a at x,y pointing dx,dy
function arrowGlyph(x,y,a,dx,dy,col='#fff',c=ctx){
  c.save(); c.translate(x,y); c.rotate(Math.atan2(dy,dx)); c.fillStyle=col;
  c.beginPath(); c.moveTo(a,0); c.lineTo(-a*.2,-a*.85); c.lineTo(-a*.2,-a*.32); c.lineTo(-a*.8,-a*.32); c.lineTo(-a*.8,a*.32); c.lineTo(-a*.2,a*.32); c.lineTo(-a*.2,a*.85); c.closePath(); c.fill(); c.restore();
}
