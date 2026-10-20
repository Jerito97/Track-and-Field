// Laser run (the modern pentathlon's last part) on the sprint engine: three legs of the 100 m's green buttons with a
// shooting range after the first two. At a range the runner pulls up on the line and the view goes into the sight, with
// four arrows around it: the sight never keeps still, the board going by at the edge of the lens (a glimpse of the
// target: where it's about to come in), until the target comes in and stops for a moment right next to the cross, above,
// below, left or right of it (a shorter moment the faster the runner came in). The arrow toward it then shoots it: a
// hit turns it white; a wrong arrow, or one while it's moving, is a miss and adds MISS s to the time. Five shots, then
// off again from a standstill. The machines stop and shoot too.
import {noise,tone} from '../audio.js';
import {LW} from '../canvas.js';
import {S} from '../state.js';
import {clamp,rand} from '../utils.js';
import {pop,sideCue} from './core.js';

// seconds added for each miss; how hard the runner pulls up at a range (m/s²)
export const MISS=5;
const BRAKE=9;
// the sight on the screen (logical px: middle and radius); a target's radius (px), how far apart they are on the board
// (target radii)
export const scope=()=>{ const R=Math.min(96,LW*.29); return {cx:LW/2,cy:150,R,u:R*.17}; };
export const D=5;
// the arrows (what each moves the sight toward)
export const DIRS={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
// where the target stops, from the cross (target radii); its glimpses at the edge of the lens (from the cross, target
// radii), each this long (s), for GAP s before it comes in; how long it takes to swing in or out (s); how long it
// stays: HOLD0 s, less HOLD_V s per m/s the runner came in with, never under HOLD_MIN; a shot SWING_OK of the way in
// or GRACE s after it leaves still counts
const PEEK=2.3, EDGE=[5.6,6.8], SEG=[.22,.4], GAP=[.4,1.1], SWING=.15, SWING_OK=.6, GRACE=.06;
const HOLD0=1, HOLD_V=.045, HOLD_MIN=.5;
// after the fifth shot, this long (s) to see the board before running on
const DONE_T=.7;

export const ranges=ev=>ev.ranges;
const nextRange=()=>S.ev.ranges[S.ri||0];
const ease=k=>k*k*(3-2*k);
// a glimpse spot: on the edge of the lens, within 50° of the side the target will come in from
const edgeAt=dir=>{ const [dx,dy]=DIRS[dir], a=Math.atan2(dy,dx)+rand(-.9,.9), r=rand(...EDGE); return [Math.cos(a)*r,Math.sin(a)*r]; };
const pickDir=()=>'UDLR'[Math.floor(Math.random()*4)];
// the target being shot at, from the cross (target radii; the board goes with it), now
export function laserAim(){
  const s=S.shot; if(!s) return [9,9];
  const k=s.T?ease(Math.min(1,s.t/s.T)):1, p=[s.a[0]+(s.b[0]-s.a[0])*k,s.a[1]+(s.b[1]-s.a[1])*k];
  if(s.st==='hold'){ p[0]+=.1*Math.sin(S.clock*7.3); p[1]+=.1*Math.sin(S.clock*5.1+1); }  // (breathing)
  return p;
}
// the next move: from where it is now to b, in T s
function go(s,st,b,T){ s.a=laserAim(); s.b=b; s.st=st; s.t=0; s.T=T; }
// glimpses at the edge for a while, then in
function wander(s){ s.dir=pickDir(); s.gap=rand(...GAP); go(s,'edge',edgeAt(s.dir),SWING*1.4); }
const holdT=()=>clamp(HOLD0-HOLD_V*(S.vin||0),HOLD_MIN,HOLD0);
// is the target (just about) stopped by the cross now
export const laserLive=()=>{ const s=S.shot; return !!s&&s.k<5&&(s.st==='in'&&s.t>=s.T*SWING_OK||s.st==='hold'||s.st==='out'&&s.t<GRACE&&!s.shotHere); };

// once a frame while running: pulling up at a range, the sight moving, and off again after the fifth shot
export function laserStep(dt){
  const s=S.shot;
  if(s){ s.t+=dt; S.v=0; if(s.flash) s.flash.t+=dt;
    if(s.k>=5){ s.done+=dt; if(s.done>=DONE_T){ S.shot=null; S.ri=(S.ri||0)+1; S.cue=null; S.lastTap=S.clock; sideCue(); } return; }
    if(s.t<s.T) return;
    if(s.st==='edge'){ s.gap-=s.T; if(s.gap>0) go(s,'edge',edgeAt(s.dir),rand(...SEG)); else go(s,'in',DIRS[s.dir].map(v=>v*PEEK),SWING); }
    else if(s.st==='in') go(s,'hold',s.b,holdT());
    else if(s.st==='hold'){ s.shotHere=false; go(s,'out',edgeAt(pickDir()),SWING); }
    else if(s.st==='out'&&s.t>=s.T) wander(s);
    return; }
  const m=nextRange(); if(m==null||S.finished) return;
  // pull up so as to stop right on the line
  if(!S.braking&&m-S.x<=S.v*S.v/(2*BRAKE)+.3){ S.braking=true; S.vin=S.v; S.cue=null; }
  if(S.braking){ S.v=Math.max(0,S.v-BRAKE*dt);
    if(S.v<=.4||S.x>=m){ S.x=Math.min(S.x,m); S.v=0; S.braking=false;
      const s={k:0,res:[],done:0,a:edgeAt('U'),b:null,st:'edge',t:0,T:0}; s.b=s.a; S.shot=s; wander(s); s.gap+=.5;
      S.cue={type:'shoot',t:0}; tone(660,.08,'triangle',.05); pop('¡A TIRAR!',{dur:.7,col:'#ffd23a',big:.6}); } }
}
// an arrow: a hit if the target is stopped on that side of the cross
export function laserShoot(dir){
  const s=S.shot; if(!s||s.k>=5||!DIRS[dir]) return;
  const p=laserAim(), hit=laserLive()&&dir===s.dir;
  // (a miss leaves a mark where the cross was on the board, from the target)
  s.res.push({hit,x:-p[0],y:-p[1]}); s.k++; s.flash={dir,hit,t:0}; s.shotHere=true;
  noise(.06,.18,3000);
  if(hit) tone(880,.08,'triangle',.05);
  else { S.pen=(S.pen||0)+MISS; tone(150,.2,'sawtooth',.05); pop(`+${MISS} s`,{dur:.7,col:'#ff5a3c',big:.6}); }
  // on to the next target (the board stays where it is: the next one is D further right), off it goes again
  s.a=[p[0]+D,p[1]]; s.b=s.a; s.T=0;
  if(s.k>=5){ S.cue=null; s.done=0; s.st='done'; return; }
  go(s,'out',edgeAt(pickDir()),SWING*1.6);
}

// the machines: each leg from a standstill, then at each range a while shooting, missing now and then (MISS s each)
export function laserRival(r,ev){
  const sk=r.a.sk??.6, k=(ev.spread||16)/16;
  r.leg=ev.legT+(1-sk)*4*k+rand(-.2,.2);
  r.vmax=100/(r.leg-2); r.go=r.react; r.ri=0; r.pen=0; r.stopUntil=null;
}
// one frame of a machine at a range: stopped, then off again; returns true while stopped
export function laserRivalStop(r,ev){
  if(r.stopUntil!=null){ if(r.t<r.stopUntil){ r.v=0; return true; } r.stopUntil=null; r.go=r.t; }
  const m=ev.ranges[r.ri]; if(m!=null&&r.x>=m){ r.x=m; r.ri++; const sk=r.a.sk??.6;
    r.stopUntil=r.t+rand(5,8)*(1.25-.35*sk); for(let i=0;i<5;i++) if(Math.random()<.12+.3*(1-sk)) r.pen+=MISS; r.v=0; return true; }
  return false;
}
