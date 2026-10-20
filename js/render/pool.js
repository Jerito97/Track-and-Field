// Swimming: the indoor pool seen from the side. Behind, the arena (its own stands and ceiling: setTheme swim); then the
// deck on the far side, the other lanes going away (their lane ropes closer together further back), and in front our
// lane cut open like a glass wall: the surface (moving a little) and under it the water down to the floor, with the
// black guide line ending in a T a couple of metres from each wall. At 0 the starting block on the end wall, at the
// far end (len m) the wall with its touch pad; flags across the pool 5 m from each wall, red rope beads near the walls.
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {SCENE} from '../assets.js';
import {drawStarter} from './sprint.js';
import {drawBackdrop,drawStands,setTheme} from './scenery.js';
import {txt} from './text.js';

// layout (logical px): top and bottom of the stands (the ceiling above), the deck's front edge, our lane's surface (GY)
// and the floor
const ST_TOP=50, ST_BOT=184, DECK=200, FLOOR=LH-14;
// rope bead colours: red near the walls, then white and blue
const BEAD=['#e8262d','#ffffff','#2f6fd6'];

// o: {cam (m), ppm, camY, len (pool length, m), clock (s)}; returns the surface y (GY) and the metre → x mapping
export function drawPool(o){
  const s=o.ppm, sh=(o.camY||0)*s, X=m=>(m-o.cam)*s, GY=252+sh, len=o.len||50, t=o.clock||0;
  setTheme(false,true);
  ctx.fillStyle='#d8cfb8'; ctx.fillRect(0,0,LW,LH);
  // (the pictures load the first time: until then, the stands drawn in code)
  if(!drawBackdrop(o.cam*s*.45,ST_TOP+sh,ST_BOT+sh)) drawStands(o.cam,ST_TOP+sh,ST_BOT+sh,.35,t);
  // the far deck: light tiles with a darker joint every metre, a gutter along the water
  const deck=DECK+sh;
  ctx.fillStyle='#e9eef2'; ctx.fillRect(0,ST_BOT+sh,LW,deck-ST_BOT-sh);
  ctx.fillStyle='rgba(120,140,160,.35)'; for(let m=Math.floor(o.cam);X(m)<LW;m++) ctx.fillRect(X(m),ST_BOT+sh,1,deck-ST_BOT-sh);
  ctx.fillStyle='#9fb3c4'; ctx.fillRect(0,deck-3,LW,3);
  // the other lanes: water getting lighter toward the back, ropes closer together further away
  const far=ctx.createLinearGradient(0,deck,0,GY); far.addColorStop(0,'#7fd3f0'); far.addColorStop(1,'#2fa6dc');
  ctx.fillStyle=far; ctx.fillRect(0,deck,LW,GY-deck);
  [0,.3,.54,.73,.88].forEach((k,i)=>rope(X,deck+(GY-deck)*(1-k)-(i?0:2),len,1-i*.16));
  // flags across the pool 5 m from each wall (on poles at the deck)
  [5,len-5].forEach(m=>flags(X(m),deck,GY));
  // our lane, under the surface: deeper blue going down, light ripples, the floor tiles and the guide line
  const deep=ctx.createLinearGradient(0,GY,0,FLOOR+sh); deep.addColorStop(0,'#2a9bd6'); deep.addColorStop(1,'#1764a8');
  ctx.fillStyle=deep; ctx.fillRect(0,GY,LW,LH-GY);
  ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=2;
  for(let k=0;k<5;k++){ const y=GY+14+k*13; ctx.beginPath();
    for(let x=0;x<=LW;x+=12){ const w=Math.sin((x+o.cam*s*.6)*.045+t*1.6+k*1.7)*3; x?ctx.lineTo(x,y+w):ctx.moveTo(x,y+w); } ctx.stroke(); }
  const fl=FLOOR+sh;
  ctx.fillStyle='#e6f2f8'; ctx.fillRect(0,fl,LW,LH-fl);
  ctx.fillStyle='rgba(120,160,190,.5)'; for(let m=Math.floor(o.cam*2)/2;X(m)<LW;m+=.5) ctx.fillRect(X(m),fl,1,LH-fl);
  ctx.fillStyle='#1b1f2a'; ctx.fillRect(Math.max(0,X(2)),fl+3,Math.max(0,Math.min(LW,X(len-2))-Math.max(0,X(2))),5);
  [2,len-2].forEach(m=>{ const x=X(m); if(x>-10&&x<LW+10) ctx.fillRect(x-1.5,fl-8,3,16); });
  // the surface of our lane: a light line that moves a little, and a thin white highlight
  ctx.fillStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(0,GY+3);
  for(let x=0;x<=LW;x+=8) ctx.lineTo(x,GY+Math.sin((x+o.cam*s)*.06+t*3)*1.6);
  ctx.lineTo(LW,GY+3); ctx.closePath(); ctx.fill();
  // the end walls: the starting block at 0, the touch pad at the far end
  wall(X(0),GY,fl,s,true,o.lane); wall(X(len),GY,fl,s,false);
  startDeck(X,GY,s);
  // distance on the floor every 10 m
  for(let m=10;m<len;m+=10){ const x=X(m); if(x>-30&&x<LW+30) txt(m+' m',x,fl-10,'#fff',10); }
  return {GY,X,deck};
}
// a lane rope at height y: floats in half-metre pieces, red in the 5 m by each wall, then white and blue; size k
// (further away = thinner)
function rope(X,y,len,k){
  const w=Math.max(1.5,5*k), x0=Math.max(-10,X(0)), x1=Math.min(LW+10,X(len)); if(x1<x0) return;
  ctx.strokeStyle='rgba(10,40,70,.55)'; ctx.lineWidth=w+2; ctx.lineCap='butt'; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
  // one path per colour (a few strokes a frame instead of one per float)
  ctx.lineWidth=w; const paths=BEAD.map(()=>new Path2D());
  for(let m=0;m<len;m+=.5){ const a=X(m), b=X(m+.5); if(b<0) continue; if(a>LW) break;
    const P=paths[m<5||m>=len-5?0:1+Math.floor(m/.5)%2]; P.moveTo(a+.5,y); P.lineTo(b-.5,y); }
  paths.forEach((P,i)=>{ ctx.strokeStyle=BEAD[i]; ctx.stroke(P); });
}
// backstroke flags: a line across the pool on two poles, with small coloured triangles
function flags(x,deck,GY){
  if(x<-20||x>LW+20) return;
  const top=deck-34, cols=['#e8262d','#ffffff','#2f6fd6','#ffd23a'];
  ctx.strokeStyle='#8a94a3'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,deck); ctx.lineTo(x,top); ctx.stroke();
  ctx.strokeStyle='rgba(40,40,50,.6)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,top); ctx.lineTo(x,GY-30); ctx.stroke();
  for(let k=0;k<6;k++){ const y=top+4+k*((GY-30-top)/6); ctx.fillStyle=cols[k%4]; ctx.beginPath(); ctx.moveTo(x-5,y); ctx.lineTo(x+5,y); ctx.lineTo(x,y+7); ctx.closePath(); ctx.fill(); }
}
// an end wall at x: tiles down to the floor, the deck beyond it; start = the starting block (with the lane number)
// (beyond the wall, the deck: the far lanes end there too)
function wall(x,GY,fl,s,start,lane=4){
  if(start?x<0:x>LW) return;
  const dy=.35*s, a=start?0:x, w=start?x:LW-x;  // the deck stands a little above the water
  ctx.fillStyle='#e9eef2'; ctx.fillRect(a,DECK,w,GY-dy-DECK);
  ctx.fillStyle='#dfe6ec'; ctx.fillRect(a,GY-dy,w,LH-GY+dy);
  ctx.fillStyle='rgba(120,140,160,.4)'; for(let y=GY-dy+10;y<LH;y+=10) ctx.fillRect(a,y,w,1);
  ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,GY-dy); ctx.lineTo(x,fl); ctx.stroke();
  if(start){
    // the block: a sloped top on a stand, the lane number on its front
    const bw=.8*s, bh=.85*s, bx=x-bw-2;
    ctx.fillStyle='#cfd6de'; ctx.fillRect(bx+bw*.3,GY-dy-bh*.6,bw*.4,bh*.6);
    ctx.fillStyle='#f4f6f8'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(bx,GY-dy-bh*.62); ctx.lineTo(bx+bw,GY-dy-bh); ctx.lineTo(bx+bw,GY-dy-bh*.78); ctx.lineTo(bx,GY-dy-bh*.45); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2f6fd6'; ctx.fillRect(bx+bw*.25,GY-dy-bh*.42,bw*.5,bh*.3); txt(String(lane),bx+bw*.5,GY-dy-bh*.27,'#fff',11,{lw:2});
  } else {
    // the touch pad: yellow and black, just under the surface
    ctx.fillStyle='#ffd23a'; ctx.fillRect(x-4,GY-6,4,.9*s); ctx.fillStyle=INK; for(let y=GY-6;y<GY-6+.9*s;y+=6) ctx.fillRect(x-4,y,4,2);
  }
}
// behind the start wall (seen at the start and at the finish): on the deck the starter (firing at the gun) and a
// timekeeper with a stopwatch, a bench with towels and a stack of kickboards
function startDeck(X,GY,s){
  const wx=X(0); if(wx<=0) return;
  const top=GY-.35*s;
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,wx-1,LH); ctx.clip();
  // kickboards, the bench with towels, the starter, the timekeeper
  kickboards(X(-12),top,s); bench(X(-10),X(-6.5),top,s);
  drawStarter(X(-4.4),top,2.85*s);
  timekeeper(X(-2.2),top,s);
  ctx.restore();
}
function kickboards(x,y,s){ const w=.75*s, h=.13*s, cols=['#ffd23a','#2f6fd6','#e8262d','#1f9e54','#ff8a1f','#2f6fd6'];
  cols.forEach((c,i)=>{ ctx.fillStyle=c; ctx.strokeStyle=INK; ctx.lineWidth=1.2; ctx.beginPath(); ctx.roundRect(x-w/2+(i%2)*1.5,y-(i+1)*h,w,h,h*.4); ctx.fill(); ctx.stroke(); }); }
function bench(x0,x1,y,s){ const h=.6*s, t=.1*s;
  ctx.fillStyle='#8a94a3'; [x0+.15*s,x1-.15*s].forEach(x=>ctx.fillRect(x-1.5,y-h,3,h));
  ctx.fillStyle='#c98b4f'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.rect(x0,y-h-t,x1-x0,t); ctx.fill(); ctx.stroke();
  // folded towels on it
  [['#e8262d',.12],['#2f6fd6',.42],['#ffd23a',.7]].forEach(([c,f])=>{ const x=x0+(x1-x0)*f, w=.75*s, th=.22*s;
    ctx.fillStyle=c; ctx.beginPath(); ctx.roundRect(x,y-h-t-th,w,th,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(x+3,y-h-t-th*.55,w-6,1.5); }); }
// an official in white with a stopwatch held up in front, looking at the pool (the picture; drawn in code until it loads)
function timekeeper(x,y,s){
  const im=SCENE.timekeeper; if(im.naturalWidth){ const h=2.75*s, w=h*im.naturalWidth/im.naturalHeight; ctx.drawImage(im,x-w*.45,y-h,w,h); return; }
  const k=s*1.45, P=(a,b)=>[x+a*k,y-b*k];
  ctx.lineCap='round'; ctx.lineJoin='round';
  // legs (navy trousers)
  ctx.strokeStyle='#1d2c4f'; ctx.lineWidth=.17*k; [[-.1,.04],[.12,.06]].forEach(([a,b])=>{ ctx.beginPath(); ctx.moveTo(...P(a*.6,.85)); ctx.lineTo(...P(a,b)); ctx.stroke(); });
  ctx.fillStyle=INK; [[-.1],[.12]].forEach(([a])=>{ ctx.beginPath(); ctx.ellipse(...P(a+.06,.02),.12*k,.05*k,0,0,Math.PI*2); ctx.fill(); });
  // white polo
  ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(...P(-.2,1.45),.4*k,.62*k,.08*k); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#2f6fd6'; ctx.fillRect(...P(-.2,1.2),.4*k,.05*k);
  // arm up in front with the stopwatch, the other down
  ctx.strokeStyle=INK; ctx.lineWidth=.11*k+2; ctx.beginPath(); ctx.moveTo(...P(.12,1.35)); ctx.lineTo(...P(.38,1.12)); ctx.lineTo(...P(.42,1.38)); ctx.stroke();
  ctx.strokeStyle='#d9a07a'; ctx.lineWidth=.11*k; ctx.stroke();
  ctx.strokeStyle=INK; ctx.lineWidth=.11*k+2; ctx.beginPath(); ctx.moveTo(...P(-.14,1.35)); ctx.lineTo(...P(-.2,.95)); ctx.stroke(); ctx.strokeStyle='#d9a07a'; ctx.lineWidth=.11*k; ctx.stroke();
  ctx.fillStyle='#e9eef2'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(...P(.44,1.46),.09*k,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=INK; ctx.fillRect(P(.44,1.58)[0]-1.5,P(.44,1.58)[1],3,.04*k);
  // head with a white cap
  ctx.fillStyle='#d9a07a'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(...P(0,1.65),.2*k,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(...P(0,1.7),.2*k,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(...P(.18,1.7),.14*k,.04*k,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
}
