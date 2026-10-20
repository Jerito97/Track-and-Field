// Track cycling: an indoor velodrome seen from the infield. Behind, the arena (the swimming arena's stands and roof for
// now); the wooden track rising from the blue band at the bottom up to the barrier, steeper in the bends (two a lap),
// with its lines (black measuring line, red sprinters' line, blue stayers' line); the finish line every lap. The
// riders on their bikes (drawn in code: the legs follow the pedals), ours at the bottom, the machines higher up the
// banking, smaller; the starter at the start.
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {GEAR,LAP} from '../game/cycle.js';
import {ME,S} from '../state.js';
import {drawAthlete} from '../rig.js';
import {drawBackdrop,drawPauseBtn,drawStands,setTheme} from './scenery.js';
import {drawStarter} from './sprint.js';
import {txt} from './text.js';

// layout (logical px): the stands' top and bottom, the track's inner edge (where our wheels run), the barrier's
// height on the straights and in the bends
const ST_TOP=30, ST_BOT=160, GY=272, TOP_STRAIGHT=184, TOP_BEND=136;
// the machines up the banking: how far up (share of the track's height there) and how big
const ROWS=[[.2,.86],[.36,.78],[.51,.71],[.64,.65],[.76,.6]];
// a figure unit in logical px (the rider: about 2 units tall), for ours
const U=42;

// how much of a bend there is at distance m (0 on the straights, 1 in the middle of a bend): a lap starts halfway
// down the home straight, then a bend, the back straight, the other bend
function bend(m){ const u=((m%LAP)+LAP)%LAP/LAP, k=u<.125?0:u<.375?(u-.125)/.25:u<.625?0:u<.875?(u-.625)/.25:0; return k>0?Math.sin(Math.PI*k):0; }
const topAt=m=>TOP_STRAIGHT-(TOP_STRAIGHT-TOP_BEND)*bend(m);

export function drawCycle(V){
  const ev=V.ev, s=V.ppm, X=m=>(m-V.cam)*s, M=x=>V.cam+x/s;
  setTheme(false,true);
  ctx.fillStyle='#d8cfb8'; ctx.fillRect(0,0,LW,LH);
  if(!drawBackdrop(V.cam*s*.45,ST_TOP,ST_BOT)) drawStands(V.cam,ST_TOP,ST_BOT,.35,S.clock);
  // the track: wood from the blue band up to the barrier (its top following the banking)
  const pts=[]; for(let x=-8;x<=LW+8;x+=8) pts.push([x,topAt(M(x))]);
  const wood=ctx.createLinearGradient(0,TOP_BEND,0,GY); wood.addColorStop(0,'#c58a4c'); wood.addColorStop(1,'#e6b578');
  ctx.fillStyle=wood; ctx.beginPath(); ctx.moveTo(-8,GY); pts.forEach(([x,y])=>ctx.lineTo(x,y)); ctx.lineTo(LW+8,GY); ctx.closePath(); ctx.fill();
  // the boards, running along the track (closer together further up: the banking turning away)
  ctx.strokeStyle='rgba(120,70,30,.22)'; ctx.lineWidth=1;
  for(let k=1;k<12;k++){ const f=1-Math.pow(1-k/12,1.4); ctx.beginPath(); pts.forEach(([x,y],i)=>{ const yy=GY-(GY-y)*f; i?ctx.lineTo(x,yy):ctx.moveTo(x,yy); }); ctx.stroke(); }
  // the lines: blue stayers' line up the banking, red sprinters' line, black measuring line, the blue band
  const line=(f,col,w)=>{ ctx.strokeStyle=col; ctx.lineWidth=w; ctx.beginPath(); pts.forEach(([x,y],i)=>{ const yy=GY-(GY-y)*f; i?ctx.lineTo(x,yy):ctx.moveTo(x,yy); }); ctx.stroke(); };
  line(.55,'#2f6fd6',2.5); line(.17,'#e8262d',2.5); line(.05,INK,2.5);
  ctx.fillStyle='#4a9fe0'; ctx.fillRect(0,GY,LW,9); ctx.fillStyle='#3a86c4'; ctx.fillRect(0,GY+9,LW,2);
  // the barrier at the top: a blue rail with a white edge
  ctx.fillStyle='#14284f'; ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); for(let i=pts.length-1;i>=0;i--) ctx.lineTo(pts[i][0],pts[i][1]-9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y-9):ctx.moveTo(x,y-9)); ctx.stroke();
  // the infield below
  ctx.fillStyle='#cdd5df'; ctx.fillRect(0,GY+11,LW,LH-GY-11); ctx.fillStyle='rgba(120,135,155,.35)'; for(let m=Math.floor(V.cam/2)*2;X(m)<LW;m+=2) ctx.fillRect(X(m),GY+11,1,LH-GY-11);
  // distance on the blue band every 50 m; the finish line every lap (white with a black line across the track)
  for(let m=50;m<ev.dist;m+=50){ const x=X(m); if(x>-30&&x<LW+30&&m%LAP) txt(`${m} m`,x,GY+5,'#fff',9,{stroke:null}); }
  for(let m=0;m<=ev.dist;m+=LAP){ const x=X(m); if(x<-30||x>LW+30) continue; const t=topAt(m);
    ctx.fillStyle='#fff'; ctx.fillRect(x-4,t,8,GY-t); ctx.fillStyle=INK; ctx.fillRect(x-1,t,2,GY-t);
    txt(m===0?'SALIDA':m>=ev.dist?'META':'VUELTA 2',x,t-17,'#fff',12); }
  // the starter, on the blue band by the start (in front of everyone: on the infield side)
  drawStarter(X(-3.5),GY+9,2.1*U);
  // the machines, highest first
  S.rivals.map((r,i)=>[r,ROWS[i%ROWS.length]]).filter(([r])=>r.vmax!=null).sort((a,b)=>b[1][0]-a[1][0]).forEach(([r,[f,k]])=>{
    const x=X(r.x); if(x<-60||x>LW+60) return; const y=GY-(GY-topAt(r.x))*f;
    rider(x,y,U*k,r.x/GEAR*Math.PI*2+r.lane,r.a.C,{gate:r.t<=r.react}); });
  // ours, at the bottom (before the gun, held by the start gate)
  const px=X(V.x), gate=S.phase==='set'||(S.phase==='wait'&&!S.t);
  rider(px+(S.dip>0?9*Math.sin(Math.PI*Math.min(1,S.dipT/.5)):0),GY-6,U,S.crank||0,ME(),{dip:S.dip>0?S.dipT:null,gate});
  const ty=GY-6-1.75*U; ctx.fillStyle='#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px-5,ty-7); ctx.lineTo(px+5,ty-7); ctx.lineTo(px,ty); ctx.closePath(); ctx.fill(); ctx.stroke();
  // which lap
  if(S.phase!=='set'&&!S.finished) txt(V.x<LAP?'VUELTA 1/2':'ÚLTIMA VUELTA',LW/2,40,'#fff',13,{lw:3});
  drawPauseBtn();
}

// a rider on a track bike at x (the hip over it), wheels on the ground at y, u logical px per figure unit; crank: the
// pedals' angle (radians, going round as the bike goes forward); o.gate: held at the start; o.dip: throwing the bike
function rider(x,y,u,crank,C,o={}){
  const P=(a,b)=>[x+a*u,y-b*u];
  const BB=[.22,.3], CR=.14, WR=.36, RH=[-.26,WR], FH=[.8,WR];
  const lean=1.28+(o.dip!=null?.15*Math.sin(Math.PI*Math.min(1,o.dip/.5)):0), hip=[0,.92];
  // the pedals: near and far, opposite
  const ped=k=>{ const a=-crank+k*Math.PI; return [BB[0]+CR*Math.cos(a),BB[1]+CR*Math.sin(a)]; };
  // two-bone reach (equal or not): from o to t, lengths L1, L2, the middle joint bending toward side (+1 forward/up)
  const reach=(o,t,L1,L2,side)=>{ const dx=t[0]-o[0], dy=t[1]-o[1], d=Math.min(L1+L2-.001,Math.max(.05,Math.hypot(dx,dy))), phi=Math.atan2(dy,dx);
    const al=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d)))), t1=phi+side*al, e=[o[0]+L1*Math.cos(t1),o[1]+L1*Math.sin(t1)], t2=Math.atan2(t[1]-e[1],t[0]-e[0]);
    return [t1,t2]; };
  // legs: knees forward; arms to the drops, elbows down (the figure's angles: 0 straight down, forward positive)
  const leg=k=>{ const [t1,t2]=reach(hip,ped(k),.4,.4,1); return {a:t1+Math.PI/2,b:t1-t2}; };
  const sh=[hip[0]+.44*Math.sin(lean),hip[1]+.44*Math.cos(lean)], hand=[.77,.73];
  const arm=()=>{ const [t1,t2]=reach(sh,hand,.27,.25,-1); return {a:t1+Math.PI/2,b:t2-t1}; };
  const J={hip:hip[1],lean,legs:[leg(0),leg(1)],arms:[arm(),arm()],kind:'bike'};
  // the bike: wheels (spokes turning), frame in the rider's colour, saddle, bars
  ctx.lineCap='round'; ctx.lineJoin='round';
  const spin=crank*GEAR/(2*Math.PI)/(.34);
  [RH,FH].forEach((h,i)=>{ const [cx,cy]=P(...h), r=WR*u;
    // (the rear one a disc wheel, as on time trial bikes)
    if(!i){ ctx.fillStyle='#3a4150'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); }
    ctx.strokeStyle=INK; ctx.lineWidth=Math.max(2,u*.07); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    if(!i){ ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(cx,cy,r*.8,spin,spin+.9); ctx.lineTo(cx,cy); ctx.fill(); ctx.fillStyle='#9aa3b2'; ctx.beginPath(); ctx.arc(cx,cy,Math.max(1.2,u*.03),0,Math.PI*2); ctx.fill(); return; }
    ctx.strokeStyle='rgba(60,60,70,.8)'; ctx.lineWidth=1; for(let i=0;i<6;i++){ const a=spin+i*Math.PI/3; ctx.beginPath(); ctx.moveTo(cx-Math.cos(a)*r*.85,cy-Math.sin(a)*r*.85); ctx.lineTo(cx+Math.cos(a)*r*.85,cy+Math.sin(a)*r*.85); ctx.stroke(); }
    ctx.fillStyle='#9aa3b2'; ctx.beginPath(); ctx.arc(cx,cy,Math.max(1.2,u*.03),0,Math.PI*2); ctx.fill(); });
  const tube=(pts,w)=>{ ctx.beginPath(); ctx.moveTo(...P(...pts[0])); pts.slice(1).forEach(p=>ctx.lineTo(...P(...p))); ctx.strokeStyle=INK; ctx.lineWidth=w+2; ctx.stroke(); ctx.strokeStyle=C.j; ctx.lineWidth=w; ctx.stroke(); };
  const w=Math.max(2,u*.06);
  tube([RH,BB,[.02,.84],RH],w); tube([BB,[.64,.72],[.61,.84],[.02,.84]],w); tube([[.64,.72],FH],w);
  // the far crank and pedal, then the rider, then the near crank over the leg
  const crankArm=k=>{ const p=ped(k); ctx.strokeStyle=k?'#555':INK; ctx.lineWidth=Math.max(1.5,u*.05); ctx.beginPath(); ctx.moveTo(...P(...BB)); ctx.lineTo(...P(...p)); ctx.stroke(); };
  crankArm(1);
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.ellipse(...P(-.02,.89),.11*u,.03*u,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=INK; ctx.lineWidth=Math.max(1.5,u*.05); ctx.beginPath(); ctx.moveTo(...P(.61,.84)); ctx.lineTo(...P(.74,.86)); ctx.quadraticCurveTo(...P(.85,.84),...P(.78,.71)); ctx.stroke();
  // before the gun: the start gate holding the saddle from behind
  if(o.gate){ ctx.fillStyle='#8a94a3'; ctx.fillRect(...P(-.7,1.05),.08*u,1.05*u); ctx.strokeStyle='#8a94a3'; ctx.lineWidth=Math.max(2,u*.05); ctx.beginPath(); ctx.moveTo(...P(-.66,.9)); ctx.lineTo(...P(-.06,.88)); ctx.stroke(); }
  ctx.fillStyle='#bfc6d3'; ctx.beginPath(); ctx.arc(...P(...BB),.06*u,0,Math.PI*2); ctx.fill();
  drawAthlete(ctx,u/1.15,x,y,0,J,C,false);
  crankArm(0);
}
