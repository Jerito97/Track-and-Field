// Laser run (the modern pentathlon's last part) on the sprint engine: three legs of the 100 m's green buttons with a
// shooting range after the first two. At a range the runner pulls up on the line and the view goes into the sight, with
// four arrows around it: the sight sways a little around the target (more the faster the runner came in), and every
// so often an arrow shows on the target's black, for a moment (a shorter one the faster the runner came in). The arrow
// button it points to then shoots it: a hit turns it white; a wrong arrow, or one with no arrow on the target, is a
// miss and adds MISS s to the time. Five shots, then off again from a standstill. The machines stop and shoot too.
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
export const scope=()=>{ const R=Math.min(96,LW*.29); return {cx:LW/2,cy:150,R,u:R*.15}; };
export const D=2.5;
// the arrows
export const DIRS={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
// the sway (target radii): SWAY0, plus SWAY_V per m/s the runner came in with; the arrow shows after GAP s (FIRST the
// first time), for HOLD0 s less HOLD_V s per m/s the runner came in with (never under HOLD_MIN); after a shot the sight
// takes SLIDE s to go on to the next target
const SWAY0=.5, SWAY_V=.09, GAP=[.5,1.3], FIRST=[.9,1.5], HOLD0=1, HOLD_V=.045, HOLD_MIN=.5, SLIDE=.3;
// after the fifth shot, this long (s) to see the board before running on
const DONE_T=.7;

export const ranges=ev=>ev.ranges;
const nextRange=()=>S.ev.ranges[S.ri||0];
const ease=k=>k*k*(3-2*k);
// the target being shot at, from the cross (target radii; the board goes with it), now
export function laserAim(){
  const s=S.shot; if(!s) return [9,9];
  const a=SWAY0+SWAY_V*(s.vin||0), t=s.clock, p=s.ph, sl=s.slide<SLIDE?D*(1-ease(s.slide/SLIDE)):0;
  return [sl-a*(Math.sin(.9*t+p[0])+.45*Math.sin(2.1*t+p[1]))/1.45, -a*(Math.sin(.7*t+p[2])+.45*Math.sin(1.8*t+p[3]))/1.45];
}
const holdT=()=>clamp(HOLD0-HOLD_V*(S.vin||0),HOLD_MIN,HOLD0);
const wait=(s,g)=>{ s.st='wait'; s.t=0; s.T=rand(...g); };
// the arrow on the target now (U, D, L, R), or none
export const laserArrow=()=>{ const s=S.shot; return s&&s.st==='show'?s.dir:null; };

// once a frame while running: pulling up at a range, the sight and its arrows, and off again after the fifth shot
export function laserStep(dt){
  const s=S.shot;
  if(s){ s.t+=dt; s.clock+=dt; s.slide+=dt; S.v=0; if(s.flash) s.flash.t+=dt;
    if(s.k>=5){ s.done+=dt; if(s.done>=DONE_T){ S.shot=null; S.ri=(S.ri||0)+1; S.cue=null; S.lastTap=S.clock; sideCue(); } return; }
    if(s.t<s.T) return;
    if(s.st==='wait'){ s.st='show'; s.t=0; s.T=holdT(); s.dir='UDLR'[Math.floor(Math.random()*4)]; tone(740,.04,'triangle',.03); }
    else wait(s,GAP);
    return; }
  const m=nextRange(); if(m==null||S.finished) return;
  // pull up so as to stop right on the line
  if(!S.braking&&m-S.x<=S.v*S.v/(2*BRAKE)+.3){ S.braking=true; S.vin=S.v; S.cue=null; }
  if(S.braking){ S.v=Math.max(0,S.v-BRAKE*dt);
    if(S.v<=.4||S.x>=m){ S.x=Math.min(S.x,m); S.v=0; S.braking=false;
      S.shot={k:0,res:[],done:0,vin:S.vin,clock:0,slide:SLIDE,ph:[0,0,0,0].map(()=>rand(0,Math.PI*2))}; wait(S.shot,FIRST);
      S.cue={type:'shoot',t:0}; tone(660,.08,'triangle',.05); pop('¡A TIRAR!',{dur:.7,col:'#ffd23a',big:.6}); } }
}
// an arrow button: a hit if it's the arrow on the target
export function laserShoot(dir){
  const s=S.shot; if(!s||s.k>=5||!DIRS[dir]) return;
  const p=laserAim(), hit=s.st==='show'&&dir===s.dir;
  // (a miss leaves a mark on the board beside the target, toward where the cross was)
  const a=Math.atan2(-p[1],-p[0]||.01);
  s.res.push({hit,x:Math.cos(a)*1.5,y:Math.sin(a)*1.5}); s.k++; s.flash={dir,hit,t:0};
  noise(.06,.18,3000);
  if(hit) tone(880,.08,'triangle',.05);
  else { S.pen=(S.pen||0)+MISS; tone(150,.2,'sawtooth',.05); pop(`+${MISS} s`,{dur:.7,col:'#ff5a3c',big:.6}); }
  if(s.k>=5){ S.cue=null; s.done=0; s.st='done'; return; }
  // on to the next target
  s.slide=0; wait(s,GAP);
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
