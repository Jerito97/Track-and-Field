// Field event rendering
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {drawChar} from '../draw/character.js';
import {POSE} from '../poses.js';
import {animReady,animScale,drawAnim,drawRig,rigReady} from '../rig.js';
import {POLE_ART} from '../assets.js';
import {ATH,G,ME,S} from '../state.js';
import {TJ_PIT,TJ_SAND} from '../game/field.js';
import {HAM_CAGE,HAM_CIRCLE,hamBall,hamHands} from '../game/hammer.js';
import {SP_BEST,SP_GREEN,SP_MAX,SP_ORANGE} from '../game/shot.js';
import {fieldPose} from '../stick.js';
import {rec,STYLE} from '../storage.js';
import {clamp,hash} from '../utils.js';
import {drawStar,target} from './hud.js';
import {drawBackdrop,drawBoards,drawPauseBtn,drawStands,setTheme,flag,GRASS,GRASS_L,javelin,LINE,shadow,TARTAN,TARTAN_D,upright} from './scenery.js';
import {txt} from './text.js';

export function drawField(V){
  const ev=V.ev, s=V.ppm, X=m=>(m-V.cam)*s, sh=V.camY*s;
  const GY=264+sh;
  const excite=(S.phase==='act'||S.phase==='post'||V.replay)?1:.35;
  setTheme(G.mode==='surv');
  // plain sky (only seen without the stadium pictures)
  const sky=ctx.createLinearGradient(0,sh-260,0,sh); sky.addColorStop(0,'#4aa6e8'); sky.addColorStop(1,'#ade9f6'); ctx.fillStyle=sky; ctx.fillRect(0,0,LW,LH);
  const stTop=24+sh, stBot=170+sh;
  // grandstands and sky, slower than the field; without the pictures, the stands drawn in code
  if(!drawBackdrop(V.cam*s*.45,sh,stBot+14)){
    ctx.fillStyle='#e6e9ef'; ctx.fillRect(0,stTop-8,LW,8); ctx.fillStyle='#a9b0bd'; ctx.fillRect(0,stTop-2,LW,2);
    drawStands(V.cam*(s/34),stTop,stBot,excite,S.clock); drawBoards(V.cam,stBot,14,s); }
  const apTop=stBot+14;
  ctx.fillStyle=GRASS; ctx.fillRect(0,apTop,LW,LH-apTop);
  ctx.fillStyle=GRASS_L; for(let m=Math.floor(V.cam/12)*12;X(m)<LW;m+=12) ctx.fillRect(X(m),apTop,6*s,LH-apTop);
  // the runway (red, like the track) up to the line; the javelin field beyond it is grass
  const rw=ev.kind==='ham'||ev.kind==='sp'?0:ev.kind==='jav'?Math.max(0,Math.min(LW,X(ev.line))):LW;
  ctx.fillStyle=TARTAN; ctx.fillRect(0,GY-26,rw,44); ctx.fillStyle=TARTAN_D; ctx.fillRect(0,GY-4,rw,22);
  if(ev.kind==='ham'||ev.kind==='sp') hamField(V,X,GY,apTop,ev.kind==='ham');
  else if(ev.kind==='jav'){
    const lx=X(ev.line);
    ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(lx,apTop); ctx.quadraticCurveTo(lx+14,(apTop+LH)/2,lx,LH); ctx.stroke();
    for(let m=10;m<=120;m+=10){ const x=X(ev.line+m); if(x<-40||x>LW+40) continue; ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(x-1,apTop,2,LH-apTop); txt(m+' m',x,apTop+12,'#fff',13); }
    if(lx>0){ ctx.fillStyle='#fff'; ctx.fillRect(0,GY+16,lx,2); ctx.fillRect(0,GY-26,lx,2); }
  } else {
    ctx.fillStyle=LINE; ctx.fillRect(0,GY-26,LW,2); ctx.fillRect(0,GY+16,LW,2);
    for(let m=0;m<ev.line;m+=5){ const x=X(m); if(x>-20&&x<LW+20){ ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(x-1,GY+12,2,4); } }
  }
  if(ev.kind==='lj'||ev.kind==='tj'){
    // the sand: right past the board in the long jump, TJ_SAND m on in the triple jump (metres counted from the board)
    const [a0,a1]=ev.kind==='tj'?[TJ_SAND,TJ_PIT]:[.5,13], p0=X(ev.line+a0), p1=X(ev.line+a1), sd=26;
    ctx.fillStyle='#ecd096'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(p0,GY-6,p1-p0,sd); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(170,120,50,.35)'; for(let k=0;k<110;k++) ctx.fillRect(X(ev.line+a0+.5+hash(k)*(a1-a0-1.2)),GY-3+hash(k+50)*(sd-4),2,1.5);
    // distance board along the pit: a mark every half metre, numbers every metre
    const nb=GY-48; ctx.fillStyle='#fff'; ctx.fillRect(p0,nb,p1-p0,18); ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.strokeRect(p0,nb,p1-p0,18);
    ctx.fillStyle='#e8262d'; ctx.fillRect(p0,nb+15,p1-p0,3);
    for(let m=Math.ceil(a0*2)/2;m<=a1-.5;m+=.5){ const x=X(ev.line+m); ctx.fillStyle=INK; const whole=m%1===0; ctx.fillRect(x-.5,nb+(whole?9:12),1,whole?6:3); if(whole) txt(m+' m',x,nb+6.5,'#e8262d',11,{stroke:null}); }
    rivalFlags(V,X,GY);
  }
  if(ev.kind==='jav'||ev.kind==='ham'||ev.kind==='sp') rivalFlags(V,X,GY);
  if(ev.kind==='pv'){
    const bx=X(ev.line), ux=X(ev.line+.6);
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.moveTo(bx-.5*s,GY); ctx.lineTo(bx,GY+4); ctx.lineTo(bx,GY); ctx.closePath(); ctx.fill();
    upright(ux-6,GY-10,s);
    const m0=X(ev.line+.3), m1=X(ev.line+5.5), mh=.85*s;
    ctx.fillStyle='#e8402d'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(m0,GY-mh,m1-m0,mh); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#f4f4f4'; ctx.fillRect(m0+2,GY-mh*.42,m1-m0-4,mh*.1); ctx.fillStyle='#2f5fc0'; ctx.fillRect(m0+2,GY-mh*.32,m1-m0-4,mh*.32-1);
    for(let h=2;h<=7;h++){ txt(h+' m',ux+16,GY-h*s,'#fff',11); }
    if(V.bar){ const by=GY-V.bar*s; ctx.strokeStyle=INK; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(ux-12,by); ctx.lineTo(ux+12,by); ctx.stroke(); ctx.strokeStyle='#ffcf1f'; ctx.lineWidth=3; ctx.stroke(); }
  }
  if(ev.bands&&!V.act) ljBands(V,X,GY);
  // long jump take-off board, on top of the coloured zones so it always stands out: a white board across the runway
  // with a dark outline, and the foul line (red-and-white plasticine) at its front edge; then this attempt's footprint
  if(ev.kind==='lj'||ev.kind==='tj'){ const bx=X(ev.line), bw=Math.max(10,.3*s);
    ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(bx-bw,GY-25,bw,41); ctx.fill(); ctx.stroke();
    for(let y=GY-25,k=0;y<GY+16;y+=5,k++){ ctx.fillStyle=k%2?'#fff':'#e8262d'; ctx.fillRect(bx,y,4,Math.min(5,GY+16-y)); }
    ctx.strokeStyle=INK; ctx.lineWidth=1; ctx.strokeRect(bx,GY-25,4,41);
    if(!V.act) txt('TABLA',bx-bw/2,GY-33,'#fff',11);
    // triple jump: the hop's and the step's footprints too
    (V.prints||[]).forEach(x=>footprint(X(x),GY,s,1));
    if(V.print!=null){ footprint(X(V.print),GY,s,1); const gap=Math.max(0,ev.line-V.print); txt(gap<.005?'¡JUSTO!':`a ${gap.toFixed(2)} m`,X(V.print),GY+22,'#fff',11); } }
  if(!ev.bands&&ev.kind!=='ham'&&ev.kind!=='sp'&&(V.zone||S.phase==='ready'||S.phase==='run')){ const z0=X(ev.line-ev.zone), z1=X(ev.line);
    if(z1>-10&&z0<LW+10){ ctx.fillStyle='rgba(255,210,58,.35)'; ctx.fillRect(z0,GY-25,z1-z0,40);
      ctx.strokeStyle='rgba(255,210,58,.9)'; ctx.lineWidth=3; for(let x=z0+6;x<z1-6;x+=18){ ctx.beginPath(); ctx.moveTo(x,GY-14); ctx.lineTo(x+7,GY-5); ctx.lineTo(x,GY+4); ctx.stroke(); }
      ctx.fillStyle='#ffd23a'; ctx.fillRect(z0-1,GY-25,3,40); } }
  const px=X(V.x);
  // hammer on the far side of the circle: behind the athlete
  const hb=ev.kind==='ham'?hamDraw(V,X,GY):null;
  if(hb&&hb.far) hb.draw();
  shadow(px,GY+2,Math.max(0,V.y-(ev.kind==='pv'&&V.x>ev.line?.85:0)),s);
  // long jump: drawn animations (stand, run cycle, take-off, flight, stretch, landing); rig pieces as fallback
  let fig=null;
  { const f=ev.kind==='lj'?ljFrame(ME(),V):ev.kind==='tj'?tjFrame(ME(),V):ev.kind==='jav'?javFrame(ME(),V):ev.kind==='pv'?pvFrame(ME(),V):null;
    if(f){ const K=animScale(ME(),s*FIELD_H), A0=ME().anims[f[0]], fi0=((f[1]%A0.frames)+A0.frames)%A0.frames;
      // frames placed by the hip (pole vault in the air: the body turns over) or by their lowest point
      const feet=f[2]&&A0.hipy?GY-f[2].hip*s+(A0.feet-A0.hipy[fi0])*K:GY-V.y*s; fig={hand:[px,feet-1.4*s],drawnJav:f[0].startsWith('jav')};
      // javelin in the frame: its tail and tip on screen (for the star); the whole javelin goes underneath, tip on the
      // drawn tip, so every frame shows it at full length (the sheets draw it shorter or cut off at the tail)
      const A=ME().anims[f[0]], fi=((f[1]%A.frames)+A.frames)%A.frames, j=A.jav&&A.jav[fi], hd=A.hands&&A.hands[fi];
      // hands drawn holding a pole the game draws: pole through the front hand, along the line of both hands
      if(hd){ fig.hands=[px+(hd[0]-A.hx)*K,feet+(hd[1]-A.feet)*K,px+(hd[2]-A.hx)*K,feet+(hd[3]-A.feet)*K]; fig.hand=[fig.hands[2],fig.hands[3]]; }
      if(j){ fig.jav=[px+(j[0]-A.hx)*K,feet+(j[1]-A.feet)*K,px+(j[2]-A.hx)*K,feet+(j[3]-A.feet)*K];
        const [tx,ty,hx,hy]=fig.jav, a=Math.atan2(ty-hy,hx-tx), L=JAV_L*s; javelin(hx-Math.cos(a)*L/2,hy+Math.sin(a)*L/2,a,L); }
      drawAnim(ctx,ME(),f[0],f[1],px,feet,K); } }
  if(!fig) fig=rigReady(ME())?drawRig(ctx,s,px,GY,V.y,V.pose||POSE.stand,ME(),V.rot||0):drawChar(ctx,s,px,GY,V.y,STYLE.stick?fieldPose({...V,clock:S.clock}):V.pose||POSE.stand,ME(),(V.v||0)>5,V.rot||0);
  if(hb&&!hb.far) hb.draw();
  if(hb&&hb.arc) hb.arc();
  if(ev.kind==='sp') spDraw(V,X,GY,fig);
  if(ev.kind==='pv'){ drawPole(V,X,GY,fig); upright(X(ev.line+.6)+6,GY,s); }
  if(ev.kind==='jav'){
    if(!V.jv&&V.meter&&V.meter.k==='jav'&&fig.jav){ if(!V.replay){ const [tx,ty,hx,hy]=fig.jav; target(hx,hy); const p=Math.min(V.meter.p,1.25); drawStar(tx+(hx-tx)*p,ty+(hy-ty)*p,8,p,true); } }
    else if(!V.jv&&V.meter&&V.meter.k==='jav'){ const a=.35, L=JAV_L*s, h=steadyHand(fig.hand), cx=h[0]+Math.cos(a)*.15*s, cy=h[1]-Math.sin(a)*.15*s; javelin(cx,cy,a,L);
      if(!V.replay){ const tx=cx-Math.cos(a)*L/2, ty=cy+Math.sin(a)*L/2, hx=cx+Math.cos(a)*L/2, hy=cy-Math.sin(a)*L/2; target(hx,hy); const p=Math.min(V.meter.p,1.25); drawStar(tx+(hx-tx)*p,ty+(hy-ty)*p,8,p,true); } }
    else if(!V.jv){ if(!fig.drawnJav) javelin(fig.hand[0]+6,fig.hand[1]-4,.25,JAV_L*s); }
    else if(V.jv.held){ if(!fig.drawnJav){ const a=.55; javelin(fig.hand[0]+Math.cos(a)*.5*s,fig.hand[1]-Math.sin(a)*.5*s,a,JAV_L*s); } }
    // flying, the point follows the path (jv.x, jv.y is the point); stuck, it goes into the grass right there, where the
    // mark and the flag are
    else { const a=V.jv.a, h=JAV_L*s/2; let cx=X(V.jv.x)-Math.cos(a)*h, cy=GY-V.jv.y*s+Math.sin(a)*h;
      if(V.jv.stuck){ cx=X(V.jv.x)-Math.cos(a)*.9*s; cy=GY+Math.sin(a)*.9*s; } javelin(cx,cy,a,JAV_L*s); }
  }
  if(V.landX!=null&&ev.kind!=='pv') flag(X(V.landX),GY+4,'#e8262d','');
  S.fx.forEach(f=>{ if(f.k!=='sand') return; const t=f.t, x=X(f.wx+f.vx*t), y=GY-(f.wy+f.vy*t-4.9*t*t)*s; ctx.fillStyle=f.dust?'rgba(235,215,200,.8)':'#e9d9a8'; ctx.beginPath(); ctx.arc(x,y,f.dust?1.8:2.2,0,Math.PI*2); ctx.fill(); });
  drawPauseBtn();
}
// the javelin drawn back while running: it follows the hand smoothed (not every bob of the stride), so the star along
// it moves steadily
const held={};
function steadyHand(h,k='jav'){ const o=held[k]; held[k]=o&&Math.abs(o[0]-h[0])<60?[o[0]+(h[0]-o[0])*.2,o[1]+(h[1]-o[1])*.2]:h; return held[k]; }
export function rivalFlags(V,X,GY){
  ATH.forEach((a,i)=>{ if(a.me) return; const b=S.marks[i].filter(m=>m!=null); if(!b.length) return; flag(X(V.ev.line+Math.max(...b)),GY+14,a.C.j,a.name[0]); });
  if(rec[V.ev.id]!=null){ const x=X(V.ev.line+rec[V.ev.id]); ctx.setLineDash([4,4]); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,GY-30); ctx.lineTo(x,GY+16); ctx.stroke(); ctx.setLineDash([]); txt('RÉCORD',x,GY-36,'#fff',11); }
}
export function drawPole(V,X,GY,fig){
  // lowering the pole (the star running along it): the grip follows the hand smoothed, so the star moves steadily
  const ev=V.ev, s=V.ppm, a=V.act, L=4.6*s, [hx,hy]=!a&&V.meter&&V.meter.k==='pole'&&V.meter.p>0?steadyHand(fig.hand,'pole'):fig.hand;
  // pole from (x1,y1) to (x2,y2), bent through (cx,cy): the drawn pole in short straight slices along the curve
  // (grip end at x2,y2 when gripEnd), or a plain line until it loads
  const line=(x1,y1,x2,y2,cx,cy,gripEnd)=>{
    if(POLE_ART.complete&&POLE_ART.naturalWidth){ const N=cx!=null?16:1, P=u=>cx!=null?[(1-u)*(1-u)*x1+2*u*(1-u)*cx+u*u*x2,(1-u)*(1-u)*y1+2*u*(1-u)*cy+u*u*y2]:[x1+(x2-x1)*u,y1+(y2-y1)*u];
      const W=POLE_ART.naturalWidth, Hh=POLE_ART.naturalHeight, h=L*.03;
      for(let k=0;k<N;k++){ const [ax,ay]=P(k/N), [bx,by]=P((k+1)/N), len=Math.hypot(bx-ax,by-ay), sx0=gripEnd?(1-(k+1)/N)*W:k/N*W;
        ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.atan2(by-ay,bx-ax)); if(gripEnd) ctx.scale(-1,1);
        ctx.drawImage(POLE_ART,sx0,0,W/N,Hh,gripEnd?-len-.5:0,-h/2,len+.5,h); ctx.restore(); }
      return; }
    ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(x1,y1); if(cx!=null) ctx.quadraticCurveTo(cx,cy,x2,y2); else ctx.lineTo(x2,y2); ctx.stroke(); ctx.strokeStyle='#7ccf3a'; ctx.lineWidth=2.6; ctx.stroke(); };
  const tipX=X(ev.line)-2, tipY=GY+2;
  if(!a||a.k==='pvfoul'){ const d=ev.line-V.x; let ang=a?.1:.15+.75*clamp(d/14,0,1);
    if(fig.hands&&!a&&(V.v||0)<=.2) ang=Math.atan2(fig.hands[1]-fig.hands[3],fig.hands[2]-fig.hands[0]);
    // grip: 1.1 m from the back end; running with the drawn frames (fists in front of the chest) only 0.5 m sticks out behind
    const back=fig.hands&&(V.v||0)>.2?.5*s:1.1*s;
    // lowering: the tip comes down with the star and touches the track just as the star reaches it (p = 1)
    if(V.meter&&V.meter.k==='pole'&&V.meter.p>0){ const ground=-Math.asin(clamp((GY-hy)/(L-back),0,1)), p=Math.min(1,V.meter.p); ang=ang+(ground-ang)*p*p*(3-2*p); }
    const fx=hx+Math.cos(ang)*(L-back), fy=hy-Math.sin(ang)*(L-back);
    line(hx-Math.cos(ang)*back,hy+Math.sin(ang)*back,fx,fy);
    if(!V.replay&&V.meter&&V.meter.k==='pole'&&V.meter.p>0){ target(fx,fy); drawStar(hx+(fx-hx)*V.meter.p,hy+(fy-hy)*V.meter.p,8,V.meter.p); }
    return; }
  // planted and loaded: the pole bows forward and up, away from the vaulter (the athlete hangs below the curve)
  if(a.stage==='plant'||a.stage==='rise'){ const mx=(hx+tipX)/2, my=(hy+tipY)/2, dx=hx-tipX, dy=hy-tipY, dl=Math.hypot(dx,dy)||1,
      // most bent as the rise starts, straightening as it lifts the vaulter
      bend=dl*(a.stage==='plant'?.22:.36*clamp(1-(V.y||0)/6,0,1)), cx=mx-dy/dl*bend, cy=my+dx/dl*bend; line(tipX,tipY,hx,hy,cx,cy,true);
    if(!V.replay&&V.meter&&V.meter.k==='rise'){ const p=Math.min(V.meter.hit!=null?V.meter.hit:V.meter.p,1.25), q=Math.min(p,1), u=1-q;
      // late: the star goes on past the end of the pole (along it), so being late shows
      const bx=u*u*tipX+2*u*q*cx+q*q*hx, by=u*u*tipY+2*u*q*cy+q*q*hy, tx=hx-cx, ty=hy-cy, tl=Math.hypot(tx,ty)||1, over=p>1?(p-1)*Math.hypot(hx-tipX,hy-tipY):0;
      target(hx,hy); drawStar(bx+tx/tl*over,by+ty/tl*over,9,p); }
    return; }
  line(tipX,tipY,tipX-Math.cos(1.2)*L,tipY-Math.sin(1.2)*L,null,null,true);
}
// hammer: grass all over, distance lines every 10 m from the circle's front edge, the concrete circle and the cage's
// net behind it
function hamField(V,X,GY,top,cage){
  const s=V.ppm, ev=V.ev, step=cage?10:5;
  for(let m=step;m<=120;m+=step){ const x=X(ev.line+m); if(x<-40||x>LW+40) continue; ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(x-1,top,2,LH-top); txt(m+' m',x,top+12,'#fff',13); }
  const cx=X(0), back=X(-HAM_CAGE), front=X(HAM_CIRCLE+.5), nt=GY-5*s;
  if(front<-20||back>LW+20) return;
  if(!cage){ circle(cx,s,GY);
    // shot put: the toe board, a white curved block at the front edge
    const bx=X(HAM_CIRCLE); ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(bx-3,GY-6,8,14,3); ctx.fill(); ctx.stroke(); return; }
  // the net: poles and a fine mesh, behind the circle and along its far side
  ctx.fillStyle='rgba(30,40,60,.12)'; ctx.fillRect(back,nt,front-back,GY-nt-6);
  ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1;
  for(let x=back;x<=front;x+=6){ ctx.beginPath(); ctx.moveTo(x,nt); ctx.lineTo(x,GY-6); ctx.stroke(); }
  for(let y=nt;y<=GY-6;y+=6){ ctx.beginPath(); ctx.moveTo(back,y); ctx.lineTo(front,y); ctx.stroke(); }
  ctx.fillStyle='#d5dbe4'; ctx.strokeStyle=INK; ctx.lineWidth=1.5;
  [back,X(-HAM_CAGE*.4),front].forEach(x=>{ ctx.beginPath(); ctx.rect(x-2.5,nt-4,5,GY-nt-2); ctx.fill(); ctx.stroke(); });
  circle(cx,s,GY);
}
// the throwing circle: concrete, white rim, seen from a little above
function circle(cx,s,GY){
  const r=HAM_CIRCLE*s;
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(cx,GY+3,r+3,13,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#9aa0aa'; ctx.beginPath(); ctx.ellipse(cx,GY+3,r,10.5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx-r*.25,GY+1,r*.5,4,0,0,Math.PI*2); ctx.fill();
}
// the hammer: ball and cable (in the hands while turning, on the ground before); holding both, the star running along
// the cable to the ball. Returns whether it's on the far side, and how to draw it
function hamDraw(V,X,GY){
  const s=V.ppm, a=V.act, P=(x,y)=>[X(x),GY-y*s];
  const ball=(x,y)=>{ ctx.fillStyle='#262a33'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,Math.max(4,.13*s),0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x-1.5,y-1.5,Math.max(1.2,.04*s),0,Math.PI*2); ctx.fill(); };
  const cable=(h,b)=>{ ctx.strokeStyle='#cfd5de'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(...h); ctx.lineTo(...b); ctx.stroke();
    ctx.fillStyle=INK; ctx.fillRect(h[0]-2.5,h[1]-2.5,5,5); };
  // flying / landed: just the ball (and its marks in the grass)
  if(V.jv&&V.jv.ham) return {far:false,draw:()=>{ const [x,y]=P(V.jv.x,V.jv.y); if(V.jv.stuck){ ctx.fillStyle='rgba(90,60,30,.45)'; ctx.beginPath(); ctx.ellipse(x,GY+3,9,3,0,0,Math.PI*2); ctx.fill(); } ball(x,y); }};
  if(!a||a.k!=='ham'){ const b=[V.x-.95,.13]; return {far:true,draw:()=>{ cable(P(...hamHands(V.x,b)),P(...b)); ball(...P(...b)); }}; }
  const b=hamBall(V.x,a.phi), h=hamHands(V.x,b);
  return {far:b[2]>0,draw:()=>{ cable(P(...h),P(b[0],b[1])); ball(...P(b[0],b[1])); },arc:()=>{
    // a still bar over the athlete (the cable spins too fast to follow): the star runs from the left end to the circle
    const m=V.meter; if(V.replay||!m||m.k!=='ham') return;
    const cx=X(V.x), y=GY-3.4*s, x0=cx-64, x1=cx+64, p=Math.min(m.hit??m.p,1.25);
    ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=11; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
    ctx.strokeStyle='#fff'; ctx.lineWidth=7; ctx.stroke(); ctx.strokeStyle='rgba(47,209,102,.9)'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+(x1-x0)*Math.min(1,p),y); ctx.stroke();
    target(x1,y); drawStar(x0+(x1-x0)*p,y,10,p,true);
    if(!m.hit) txt('SOLTÁ EN EL CÍRCULO',cx,y-22,'#fff',16,{lw:4}); }};
}
// shot put: the shot in the hand (or flying, or landed); holding both, the angle gauge beside the athlete with its
// green zone and the needle
function spDraw(V,X,GY,fig){
  const s=V.ppm, R=Math.max(4,.11*s);
  const ball=(x,y)=>{ ctx.fillStyle='#3a3f4a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x-R*.35,y-R*.35,R*.3,0,Math.PI*2); ctx.fill(); };
  if(V.jv&&V.jv.ham){ const x=X(V.jv.x), y=GY-V.jv.y*s; if(V.jv.stuck){ ctx.fillStyle='rgba(90,60,30,.5)'; ctx.beginPath(); ctx.ellipse(x,GY+3,10,3.5,0,0,Math.PI*2); ctx.fill(); } ball(x,y); }
  else if(fig&&fig.hand) ball(fig.hand[0]+2,fig.hand[1]-2);
  // the angle gauge: the needle rising (spang), then fixed where it was caught (sp), a moment after letting go too
  const m=V.meter; if(V.replay||!m||(m.k!=='sp'&&m.k!=='spang')||V.jv&&V.jv.t>.3) return;
  const ox=X(V.x)+.9*s, oy=GY-.9*s, rr=Math.min(72,LW*.19), deg=d=>d*Math.PI/180, at=d=>[ox+Math.cos(deg(d))*rr,oy-Math.sin(deg(d))*rr];
  ctx.save(); ctx.lineCap='round';
  const arc=(d0,d1,col,w)=>{ ctx.strokeStyle=col; ctx.lineWidth=w; ctx.beginPath(); ctx.arc(ox,oy,rr,-deg(d1),-deg(d0)); ctx.stroke(); };
  ctx.lineCap='butt'; arc(0,SP_MAX,INK,18); arc(0,SP_MAX,'#fff',12); arc(SP_BEST-SP_ORANGE-.5,SP_BEST+SP_ORANGE+.5,'#ff8a1e',12); arc(SP_BEST-SP_GREEN-.5,SP_BEST+SP_GREEN+.5,'#2fd166',12); arc(SP_MAX-4,SP_MAX,'#e8262d',12);
  [0,20,40,60,80].forEach(d=>{ const [x,y]=at(d); txt(d+'°',ox+(x-ox)*1.32,oy+(y-oy)*1.32,'#fff',11); });
  const d=m.k==='sp'?m.ang:Math.min(m.hit??m.p,SP_MAX), [nx,ny]=at(d);
  ctx.strokeStyle=INK; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(nx,ny); ctx.stroke(); ctx.strokeStyle='#ffd23a'; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle=INK; ctx.beginPath(); ctx.arc(ox,oy,5,0,Math.PI*2); ctx.fill(); ctx.restore();
  // then the release, as in the hammer: a still bar over the athlete, the star running to the circle at its end
  if(m.k==='sp'){ const cx=X(V.x), y=GY-3.8*s, x0=cx-64, x1=cx+64, p=Math.min(m.hit??m.p,1.25);
    ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=11; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
    ctx.strokeStyle='#fff'; ctx.lineWidth=7; ctx.stroke(); ctx.strokeStyle='rgba(47,209,102,.9)'; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+(x1-x0)*Math.min(1,p),y); ctx.stroke();
    target(x1,y); drawStar(x0+(x1-x0)*p,y,10,p,true);
    if(m.hit==null) txt('SOLTÁ EN EL CÍRCULO',cx,y-22,'#fff',16,{lw:4}); }
}
// long jump run-up: green / yellow / red bands before the board. No tapping from the green on (you keep your
// speed and get ready); red = the last metres, where the red take-off buttons appear. The band you're in lights up.
const LJ_COLORS=['31,190,90','255,205,40','240,60,50'];
function ljBands(V,X,GY){ const ev=V.ev, d=ev.line-V.x, b=ev.bands;
  [[b[0],b[1],LJ_COLORS[0]],[b[1],b[2],LJ_COLORS[1]],[b[2],0,LJ_COLORS[2]]].forEach(([from,to,rgb])=>{ const x0=X(ev.line-from), x1=X(ev.line-to); if(x1<-10||x0>LW+10) return;
    const on=d<=from&&d>to;
    // a white base first, so the colours read on the red runway
    ctx.fillStyle=`rgba(255,255,255,${on?.55:.4})`; ctx.fillRect(x0,GY-25,x1-x0,40);
    ctx.fillStyle=`rgba(${rgb},${on?.6:.35})`; ctx.fillRect(x0,GY-25,x1-x0,40);
    ctx.strokeStyle=`rgba(${rgb},${on?1:.75})`; ctx.lineWidth=3;
    for(let x=x0+6;x<x1-6;x+=18){ ctx.beginPath(); ctx.moveTo(x,GY-14); ctx.lineTo(x+7,GY-5); ctx.lineTo(x,GY+4); ctx.stroke(); }
    ctx.fillStyle=`rgb(${rgb})`; ctx.fillRect(x0-1,GY-25,3,40); });
}
// a shoe print on the track (toe to the right), at alpha a
function footprint(x,y,s,a){ ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='rgba(20,20,40,.55)';
  ctx.beginPath(); ctx.ellipse(x-.06*s,y+4,.1*s,.045*s,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x-.2*s,y+4,.055*s,.04*s,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
// field athletes are drawn FIELD_H*ppm logical px tall (same height as the rig pieces at that scale)
const FIELD_H=2.37;
// javelin length in metres (as long as the sheets draw it when it's whole)
const JAV_L=2.75;
function ljFrame(C,V){
  const a=V.act;
  if(a&&a.k==='lj'&&a.u!=null){
    // take-off (first 30% of the jump), then the flight: arms up at the top, coming down, knees up for the landing
    // (flight frame 1 repeats the last take-off pose, so it is skipped); landing stays on rig pieces
    if(a.u<.3) return animReady(C,'ljtakeoff')?['ljtakeoff',a.u<.05?0:a.u<.12?1:a.u<.2?2:3]:null;
    // stretch pressed: legs coming up for an instant, then the full stretch until the sand (frame 3 unused)
    if(a.tapU!=null&&a.u<1) return animReady(C,'ljstretch')?['ljstretch',a.u-a.tapU<.04?0:1]:null;
    if(a.u<1) return animReady(C,'ljflight')?['ljflight',a.u<.5?1:a.u<.68?2:3]:null;
    // in the sand: heels touch, slide in, sit
    const pt=a.pt||0; return animReady(C,'ljland')?['ljland',pt<.08?0:pt<.2?1:2]:null; }
  if(a) return null;
  if((V.v||0)>.2) return animReady(C,'run')?['run',Math.floor(V.x/4*C.anims.run.frames)]:null;
  return animReady(C,'stand')?['stand',Math.floor(S.clock*1.2)%2]:null;
}
// triple jump: the bounds on the take-off frames (the push off) and a running stride in the air; contacts on the run
// cycle; the last jump as a long jump
function tjFrame(C,V){
  const a=V.act;
  if(a&&a.k==='tj'&&a.stage==='jump') return ljFrame(C,{...V,act:{...a,k:'lj'}});
  if(a&&a.k==='tj'&&(a.stage==='hop'||a.stage==='step')&&a.u!=null){
    if(a.u<.25) return animReady(C,'ljtakeoff')?['ljtakeoff',a.u<.1?1:2]:null;
    return animReady(C,'run')?['run',a.u<.75?TJ_BOUND_F:TJ_BOUND_F+1]:null; }
  if(a&&a.k==='tj'&&a.stage==='contact') return animReady(C,'run')?['run',Math.floor(V.x/4*C.anims.run.frames)]:null;
  return ljFrame(C,V);
}
// run frame with the legs split widest (the bound in the air)
const TJ_BOUND_F=1;
// pole vault: drawn frames for the whole jump (standing, running, lowering the pole, planting, in the air, on the mat);
// rig pieces for the foul
function pvFrame(C,V){
  const a=V.act;
  // planting the pole: last step, arms up, take-off, hanging from the pole as the rise starts
  if(a&&a.k==='pv'&&(a.stage==='plant'||a.stage==='rise'&&(a.t||0)<.12)){ const t=a.stage==='plant'?a.t||0:1;
    return animReady(C,'pvplant')?['pvplant',t<.05?0:t<.11?1:t<.17?2:3]:null; }
  // in the air, placed by the hip (about 1 m above V.y, like the rig): swinging up the pole, over the bar, falling
  // back (the hip drops toward the mat), then on the mat: lying, legs down, sitting up with a fist up
  if(a&&a.k==='pv'&&a.stage==='rise'){ const r=a.r??0; return animReady(C,'pvswing')?['pvswing',r<.35?0:r<.6?1:r<.85?2:3,{hip:(V.y||0)+1}]:null; }
  if(a&&a.k==='pv'&&a.stage==='over') return animReady(C,'pvover')?['pvover',0,{hip:(V.y||0)+1}]:null;
  if(a&&a.k==='pv'&&a.stage==='fall'&&a.pt==null){ const y=V.y||0; return animReady(C,'pvover')?['pvover',2,{hip:y+.4+.6*clamp((y-.85)/2,0,1)}]:null; }
  if(a&&a.k==='pv'&&a.stage==='fall'){ const pt=a.pt; return animReady(C,'pvland')?['pvland',pt<.25?0:pt<.7?1:2]:null; }
  if(a) return null;
  if((V.v||0)>.2) return animReady(C,'pvrun')?['pvrun',Math.floor(V.x/4*C.anims.pvrun.frames)]:null;
  return animReady(C,'pvstand')?['pvstand',Math.floor(S.clock*1.2)%2]:null;
}
// javelin: drawn frames for the whole attempt (standing, running, drawing the javelin back, throwing, after the throw);
// rig pieces for the foul
function javFrame(C,V){
  // the throw: arm back, javelin overhead, then the follow-through once it's gone (sheet frame 1, front view, unused)
  if(V.act&&V.act.k==='jav'&&V.jv){
    if(V.jv.held||(V.jv.t||0)<.25) return animReady(C,'javthrow')?['javthrow',!V.jv.held?3:(V.act.t||0)<.22?1:2]:null;
    // after the throw: recovery step while slowing down, watching the flight, a fist up once it sticks
    const f=V.jv.stuck&&V.landX!=null?2:(V.v||0)>.6?0:1;
    return animReady(C,'javafter')?['javafter',f]:null; }
  if(V.act||V.jv) return null;
  // holding the button: drawing the javelin back over the last steps
  if(V.meter&&V.meter.k==='jav'){ const p=V.meter.p; return animReady(C,'javpull')?['javpull',p<.15?0:p<.35?1:p<.6?2:3]:null; }
  if((V.v||0)>.2) return animReady(C,'javrun')?['javrun',Math.floor(V.x/4*C.anims.javrun.frames)]:null;
  return animReady(C,'javstand')?['javstand',Math.floor(S.clock*1.2)%2]:null;
}
