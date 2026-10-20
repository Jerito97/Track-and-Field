// Laser run (the modern pentathlon's last part) on the sprint engine: three legs of the 100 m's green buttons with a
// shooting range after the first two. At a range the runner pulls up on the line and the view goes into the sight: a
// board of five black targets swaying in the scope (the more speed the runner came in with, the more it sways; it
// calms down little by little). Any button shoots at the target in the middle of the sight: a hit turns it white, a
// miss adds MISS s to the time. Five shots, then off again from a standstill. The machines stop and shoot too.
import {noise,tone} from '../audio.js';
import {S} from '../state.js';
import {clamp,rand} from '../utils.js';
import {pop,sideCue} from './core.js';

// seconds added for each miss; how hard the runner pulls up at a range (m/s²)
export const MISS=5;
const BRAKE=9;
// the sway (in target radii: a shot hits within 1 of the middle): at most SWAY, times how fast the runner came in
// (against SWAY_V m/s), going down to CALM of it over the time spent aiming
const SWAY=2.6, SWAY_V=9, CALM=.45, CALM_T=2.5;
// after the fifth shot, this long (s) to see the board before running on
const DONE_T=.7;

export const ranges=ev=>ev.ranges;
const nextRange=()=>S.ev.ranges[S.ri||0];
// where the sight is from the middle of the target being aimed at (target radii), now
export function laserAim(){
  const s=S.shot; if(!s) return [9,9];
  const t=s.t, a=SWAY*clamp(s.vin/SWAY_V,.45,1.2)*(CALM+(1-CALM)*Math.exp(-t/CALM_T)), p=s.ph;
  return [a*(Math.sin(1.6*t+p[0])+.5*Math.sin(2.9*t+p[1]))/1.5, a*(Math.sin(1.25*t+p[2])+.5*Math.sin(2.3*t+p[3]))/1.5];
}
const newPhases=()=>[0,0,0,0].map(()=>rand(0,Math.PI*2));

// once a frame while running: pulling up at a range, the shots, and off again after the fifth
export function laserStep(dt){
  const s=S.shot;
  if(s){ s.t+=dt; S.v=0;
    if(s.k>=5){ s.done+=dt; if(s.done>=DONE_T){ S.shot=null; S.ri=(S.ri||0)+1; S.cue=null; S.lastTap=S.clock; sideCue(); } }
    return; }
  const m=nextRange(); if(m==null||S.finished) return;
  // pull up so as to stop right on the line
  if(!S.braking&&m-S.x<=S.v*S.v/(2*BRAKE)+.3){ S.braking=true; S.vin=S.v; S.cue=null; }
  if(S.braking){ S.v=Math.max(0,S.v-BRAKE*dt);
    if(S.v<=.4||S.x>=m){ S.x=Math.min(S.x,m); S.v=0; S.braking=false;
      S.shot={t:0,k:0,res:[],vin:S.vin,ph:newPhases(),done:0}; S.cue={type:'shoot',t:0}; tone(660,.08,'triangle',.05); pop('¡A TIRAR!',{dur:.7,col:'#ffd23a',big:.6}); } }
}
// a shot (any button): hit if the sight is on the target's black
export function laserShoot(){
  const s=S.shot; if(!s||s.k>=5) return;
  const [x,y]=laserAim(), hit=Math.hypot(x,y)<=1;
  s.res.push({hit,x,y}); s.k++; s.t=Math.max(0,s.t*.6); s.ph=newPhases();
  noise(.06,.18,3000);
  if(hit) tone(880,.08,'triangle',.05);
  else { S.pen=(S.pen||0)+MISS; tone(150,.2,'sawtooth',.05); pop(`+${MISS} s`,{dur:.7,col:'#ff5a3c',big:.6}); }
  if(s.k>=5){ S.cue=null; s.done=0; }
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
