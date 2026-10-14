// Field event rendering
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {drawChar} from '../draw/character.js';
import {POSE} from '../poses.js';
import {animReady,animScale,drawAnim,drawRig,rigReady} from '../rig.js';
import {ATH,ME,S} from '../state.js';
import {rec} from '../storage.js';
import {clamp,hash} from '../utils.js';
import {drawStar,target} from './hud.js';
import {drawBoards,drawBottomAds,drawStands,flag,javelin,shadow,upright} from './scenery.js';
import {txt} from './text.js';

export function drawField(V){
  const ev=V.ev, s=V.ppm, X=m=>(m-V.cam)*s, sh=V.camY*s;
  const GY=264+sh;
  const excite=(S.phase==='act'||S.phase==='post'||V.replay)?1:.35;
  const sky=ctx.createLinearGradient(0,0,0,LH); sky.addColorStop(0,'#7fc4f0'); sky.addColorStop(1,'#d5ecfa'); ctx.fillStyle=sky; ctx.fillRect(0,0,LW,LH);
  if(sh>2){ ctx.fillStyle='#fff'; for(let i=0;i<5;i++){ const W2=LW+200, cx=((i*173-V.cam*2)%W2+W2)%W2-100, cy=50+i*26-sh*.15; ctx.beginPath(); ctx.ellipse(cx,cy,34,10,0,0,Math.PI*2); ctx.ellipse(cx+18,cy-6,20,10,0,0,Math.PI*2); ctx.fill(); } }
  const stTop=24+sh, stBot=170+sh;
  ctx.fillStyle='#e6e9ef'; ctx.fillRect(0,stTop-8,LW,8); ctx.fillStyle='#a9b0bd'; ctx.fillRect(0,stTop-2,LW,2);
  drawStands(V.cam*(s/34),stTop,stBot,excite,S.clock);
  drawBoards(V.cam,stBot,14,s);
  const apTop=stBot+14;
  ctx.fillStyle='#3d9be0'; ctx.fillRect(0,apTop,LW,LH-apTop);
  ctx.fillStyle='rgba(255,255,255,.06)'; for(let y=apTop+4;y<LH;y+=6) ctx.fillRect(0,y,LW,2);
  if(ev.kind==='jav'){
    const lx=X(ev.line);
    ctx.fillStyle='#8cc63f'; ctx.fillRect(Math.max(0,lx),apTop,LW,LH-apTop);
    for(let m=0;m<130;m+=10){ const a=X(ev.line+m), b=X(ev.line+m+5); if(b<0||a>LW) continue; ctx.fillStyle='#99d04a'; ctx.fillRect(Math.max(a,lx),apTop,b-Math.max(a,lx),LH-apTop); }
    ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(lx,apTop); ctx.quadraticCurveTo(lx+14,(apTop+LH)/2,lx,LH); ctx.stroke();
    for(let m=10;m<=120;m+=10){ const x=X(ev.line+m); if(x<-40||x>LW+40) continue; ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(x-1,apTop,2,LH-apTop); txt(m+' m',x,apTop+12,'#fff',13); }
    if(lx>0){ ctx.fillStyle='#fff'; ctx.fillRect(0,GY+16,lx,2); ctx.fillRect(0,GY-26,lx,2); }
  } else {
    ctx.fillStyle='#fff'; ctx.fillRect(0,GY-26,LW,2); ctx.fillRect(0,GY+16,LW,2);
    ctx.fillStyle='#e8262d'; ctx.fillRect(0,GY+19,LW,3);
    ctx.fillStyle='#e6e9ef'; ctx.fillRect(0,GY+22,LW,LH);
    for(let m=0;m<ev.line;m+=5){ const x=X(m); if(x>-20&&x<LW+20){ ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(x-1,GY+12,2,4); } }
  }
  if(ev.kind==='lj'){
    const p0=X(ev.line+.5), p1=X(ev.line+11), sd=26;
    ctx.fillStyle='#f3ead2'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(p0,GY-6,p1-p0,sd); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(160,130,70,.25)'; for(let k=0;k<110;k++) ctx.fillRect(X(ev.line+1+hash(k)*9.8),GY-3+hash(k+50)*(sd-4),2,1.5);
    // distance board along the pit: a mark every half metre, numbers every metre
    const nb=GY-48; ctx.fillStyle='#fff'; ctx.fillRect(p0,nb,p1-p0,18); ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.strokeRect(p0,nb,p1-p0,18);
    ctx.fillStyle='#e8262d'; ctx.fillRect(p0,nb+15,p1-p0,3);
    for(let m=1;m<=10.5;m+=.5){ const x=X(ev.line+m); ctx.fillStyle=INK; const whole=m%1===0; ctx.fillRect(x-.5,nb+(whole?9:12),1,whole?6:3); if(whole) txt(m+' m',x,nb+6.5,'#e8262d',11,{stroke:null}); }
    const bx=X(ev.line); ctx.fillStyle='#fff'; ctx.fillRect(bx-.25*s,GY-4,.25*s,14); ctx.fillStyle='#e8262d'; ctx.fillRect(bx-1,GY-4,3,14);
    rivalFlags(V,X,GY);
  }
  if(ev.kind==='jav') rivalFlags(V,X,GY);
  if(ev.kind==='pv'){
    const bx=X(ev.line), ux=X(ev.line+.6);
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.moveTo(bx-.5*s,GY); ctx.lineTo(bx,GY+4); ctx.lineTo(bx,GY); ctx.closePath(); ctx.fill();
    upright(ux-6,GY-10,s);
    const m0=X(ev.line+.3), m1=X(ev.line+5.5), mh=.85*s;
    ctx.fillStyle='#ffcf1f'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(m0,GY-mh,m1-m0,mh); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2f6fd6'; ctx.fillRect(m0+2,GY-mh+2,m1-m0-4,mh*.35);
    for(let h=2;h<=7;h++){ txt(h+' m',ux+16,GY-h*s,'#fff',11); }
    if(V.bar){ const by=GY-V.bar*s; ctx.strokeStyle=INK; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(ux-12,by); ctx.lineTo(ux+12,by); ctx.stroke(); ctx.strokeStyle='#ffcf1f'; ctx.lineWidth=3; ctx.stroke(); }
  }
  if(ev.kind==='lj'&&!V.act) ljBands(V,X,GY);
  if(ev.kind!=='lj'&&(V.zone||S.phase==='ready'||S.phase==='run')){ const z0=X(ev.line-ev.zone), z1=X(ev.line);
    if(z1>-10&&z0<LW+10){ ctx.fillStyle='rgba(255,210,58,.35)'; ctx.fillRect(z0,GY-25,z1-z0,40);
      ctx.strokeStyle='rgba(255,210,58,.9)'; ctx.lineWidth=3; for(let x=z0+6;x<z1-6;x+=18){ ctx.beginPath(); ctx.moveTo(x,GY-14); ctx.lineTo(x+7,GY-5); ctx.lineTo(x,GY+4); ctx.stroke(); }
      ctx.fillStyle='#ffd23a'; ctx.fillRect(z0-1,GY-25,3,40); } }
  const px=X(V.x);
  shadow(px,GY+2,Math.max(0,V.y-(ev.kind==='pv'&&V.x>ev.line?.85:0)),s);
  // long jump: drawn animations (stand, run cycle, take-off, flight, stretch, landing); rig pieces as fallback
  let fig=null;
  if(ev.kind==='lj'){ const f=ljFrame(ME(),V); if(f){ drawAnim(ctx,ME(),f[0],f[1],px,GY-V.y*s,animScale(ME(),s*FIELD_H)); fig={hand:[px,GY-V.y*s-1.4*s]}; } }
  if(!fig) fig=rigReady(ME())?drawRig(ctx,s,px,GY,V.y,V.pose||POSE.stand,ME(),V.rot||0):drawChar(ctx,s,px,GY,V.y,V.pose||POSE.stand,ME(),(V.v||0)>5,V.rot||0);
  if(ev.kind==='pv'){ drawPole(V,X,GY,fig); upright(X(ev.line+.6)+6,GY,s); }
  if(ev.kind==='jav'){
    if(!V.jv&&V.meter&&V.meter.k==='jav'){ const a=.35, L=2.6*s, cx=fig.hand[0]+Math.cos(a)*.15*s, cy=fig.hand[1]-Math.sin(a)*.15*s; javelin(cx,cy,a,L);
      if(!V.replay){ const tx=cx-Math.cos(a)*L/2, ty=cy+Math.sin(a)*L/2, hx=cx+Math.cos(a)*L/2, hy=cy-Math.sin(a)*L/2; target(hx,hy); const p=Math.min(V.meter.p,1.25); drawStar(tx+(hx-tx)*p,ty+(hy-ty)*p,8,p,true); } }
    else if(!V.jv){ javelin(fig.hand[0]+6,fig.hand[1]-4,.25,2.6*s); }
    else if(V.jv.held){ const a=.55; javelin(fig.hand[0]+Math.cos(a)*.5*s,fig.hand[1]-Math.sin(a)*.5*s,a,2.6*s); }
    else { let cx=X(V.jv.x), cy=GY-V.jv.y*s; if(V.jv.stuck){ cx-=Math.cos(V.jv.a)*.9*s; cy=GY+Math.sin(V.jv.a)*.9*s; } javelin(cx,cy,V.jv.a,2.6*s); }
  }
  if(V.landX!=null&&ev.kind!=='pv') flag(X(V.landX),GY+4,'#e8262d','');
  S.fx.forEach(f=>{ if(f.k!=='sand') return; const t=f.t, x=X(f.wx+f.vx*t), y=GY-(f.wy+f.vy*t-4.9*t*t)*s; ctx.fillStyle='#e9d9a8'; ctx.beginPath(); ctx.arc(x,y,2.2,0,Math.PI*2); ctx.fill(); });
  drawBottomAds();
}
export function rivalFlags(V,X,GY){
  ATH.forEach((a,i)=>{ if(a.me) return; const b=S.marks[i].filter(m=>m!=null); if(!b.length) return; flag(X(V.ev.line+Math.max(...b)),GY+14,a.C.j,a.name[0]); });
  if(rec[V.ev.id]!=null){ const x=X(V.ev.line+rec[V.ev.id]); ctx.setLineDash([4,4]); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,GY-30); ctx.lineTo(x,GY+16); ctx.stroke(); ctx.setLineDash([]); txt('RÉCORD',x,GY-36,'#fff',11); }
}
export function drawPole(V,X,GY,fig){
  const ev=V.ev, s=V.ppm, a=V.act, L=4.6*s, [hx,hy]=fig.hand;
  const line=(x1,y1,x2,y2,cx,cy)=>{ ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(x1,y1); if(cx!=null) ctx.quadraticCurveTo(cx,cy,x2,y2); else ctx.lineTo(x2,y2); ctx.stroke(); ctx.strokeStyle='#7ccf3a'; ctx.lineWidth=2.6; ctx.stroke(); };
  const tipX=X(ev.line)-2, tipY=GY+2;
  if(!a||a.k==='pvfoul'){ const d=ev.line-V.x; let ang=a?.1:.15+.75*clamp(d/14,0,1);
    if(V.meter&&V.meter.k==='pole') ang=.55*(1-V.meter.p)+.04;
    const fx=hx+Math.cos(ang)*(L-1.1*s), fy=hy-Math.sin(ang)*(L-1.1*s);
    line(hx-Math.cos(ang)*1.1*s,hy+Math.sin(ang)*1.1*s,fx,fy);
    if(!V.replay&&V.meter&&V.meter.k==='pole'){ target(fx,fy); drawStar(hx+(fx-hx)*V.meter.p,hy+(fy-hy)*V.meter.p,8,V.meter.p); }
    return; }
  if(a.stage==='plant'||a.stage==='rise'){ const mx=(hx+tipX)/2, my=(hy+tipY)/2, bend=a.stage==='plant'?18:Math.max(0,18-(V.y||0)*4), cx=mx-bend*.6, cy=my+bend; line(tipX,tipY,hx,hy,cx,cy);
    if(!V.replay&&V.meter&&V.meter.k==='rise'){ const p=Math.min(V.meter.hit!=null?V.meter.hit:V.meter.p,1.25), q=Math.min(p,1), u=1-q;
      const bx=u*u*tipX+2*u*q*cx+q*q*hx, by=u*u*tipY+2*u*q*cy+q*q*hy; target(hx,hy); drawStar(bx+(p>1?(p-1)*30:0),by-(p>1?(p-1)*30:0),9,p); }
    return; }
  line(tipX,tipY,tipX-Math.cos(1.2)*L,tipY-Math.sin(1.2)*L);
}
// long jump run-up: green / yellow / red bands before the board. No tapping from the green on (you keep your
// speed and get ready); red = the last metres, where the red take-off buttons appear. The band you're in lights up.
const LJ_COLORS=['31,190,90','255,205,40','240,60,50'];
function ljBands(V,X,GY){ const ev=V.ev, d=ev.line-V.x, b=ev.bands;
  [[b[0],b[1],LJ_COLORS[0]],[b[1],b[2],LJ_COLORS[1]],[b[2],0,LJ_COLORS[2]]].forEach(([from,to,rgb])=>{ const x0=X(ev.line-from), x1=X(ev.line-to); if(x1<-10||x0>LW+10) return;
    const on=d<=from&&d>to;
    ctx.fillStyle=`rgba(${rgb},${on?.65:.3})`; ctx.fillRect(x0,GY-25,x1-x0,40);
    ctx.strokeStyle=`rgba(${rgb},${on?1:.75})`; ctx.lineWidth=3;
    for(let x=x0+6;x<x1-6;x+=18){ ctx.beginPath(); ctx.moveTo(x,GY-14); ctx.lineTo(x+7,GY-5); ctx.lineTo(x,GY+4); ctx.stroke(); }
    ctx.fillStyle=`rgb(${rgb})`; ctx.fillRect(x0-1,GY-25,3,40); });
}
// field athletes are drawn FIELD_H*ppm logical px tall (same height as the rig pieces at that scale)
const FIELD_H=2.37;
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
