// Hammer throw: two winds over the head, then four turns in the circle. In turns 1-3 the ball's lowest point is the
// moment to tap the orange button (left, right, left): the closer, the faster the turns get. In turn 4 hold both
// buttons and let go as the ball passes in front (the marked arc): early or late sends it crooked, too far off and it
// hits the cage or lands outside the sector (no mark).
import {noise,tone} from '../audio.js';
import {POSE} from '../poses.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {judge} from './core.js';
import {landed} from './field.js';

const TAU=Math.PI*2;
// the ball's path around the athlete (m): side to side HAM_R, height HAM_MID ± HAM_A (lowest on the left, highest on
// the right); the far half of the circle shows HAM_DEPTH m higher, the near half lower
export const HAM_R=1.75, HAM_MID=1.3, HAM_A=.85, HAM_DEPTH=.45;
// circle radius; the cage's back wall (m behind the circle's centre)
export const HAM_CIRCLE=1.07, HAM_CAGE=3.2;
// shoulders' height, arms' length (m)
const SH=1.42, ARM=.7;
// first turn's length (s); each tap speeds the turns up by HAM_GAIN (+ HAM_GAIN_Q for a perfect one)
const W0=TAU/1.1, HAM_GAIN=.06, HAM_GAIN_Q=.19;
// tap / release windows (s): perfect within OK; a tap counts until EARLY before / LATE after the lowest point; a
// release past FOUL either side leaves the sector
const OK=.06, EARLY=.22, LATE=.16, FOUL=.2, LAG=.03;
// throw length (m) after three perfect taps and a perfect release
const BEST=92, W_BEST=W0*Math.pow(1+HAM_GAIN+HAM_GAIN_Q,3);
// angles (radians, growing as it turns): the lowest point is at π (+2π per turn), the release point a quarter turn on
const LOW=Math.PI, REL=Math.PI*1.5;
const WINDS=2, TAPS=3;
// low point crossings: 1-2 winds, 3-5 the taps, 6 the start of the last turn; release on that turn
const lowAt=n=>LOW+TAU*(n-1);
const REL_AT=lowAt(WINDS+TAPS+1)+(REL-LOW);

// ball position for angle φ around an athlete standing at x: [x, height above the track, depth (>0 far side)]
export function hamBall(x,phi){ const c=Math.cos(phi), s=Math.sin(phi); return [x+HAM_R*c,HAM_MID+HAM_A*c+HAM_DEPTH*s,s]; }
// where the hands are, holding the cable toward the ball
export function hamHands(x,b){ const dx=b[0]-x, dy=b[1]-SH, d=Math.hypot(dx,dy)||1; return [x+dx/d*ARM,SH+dy/d*ARM]; }
// the release arc (for the marker): angles and how wide the perfect / valid parts are at the current speed
export function hamArc(a){ return a&&a.stage==='final'&&!a.rel?{at:REL_AT,ok:a.w*OK,foul:a.w*FOUL}:null; }

const qWin=(e,early,late)=>Math.abs(e)<=OK?1:e<0?clamp(1+(e+OK)/(early-OK),0,1):clamp(1-(e-OK)/(late-OK),0,1);
// arms reach for the ball, legs shuffle with the turn, the body leans back against the pull
function spinPose(a,b){ const dx=b[0]-S.x, dy=b[1]-SH, arm=Math.atan2(dx,-dy), f=a.stage==='wind'?0:.3*Math.sin(a.phi);
  return {kind:'hamspin',hip:.76,lean:-.12,legs:[{a:.2+f,b:.35},{a:-.15-f,b:.3}],arms:[{a:arm,b:.05},{a:arm+.08,b:.12}]}; }

export function startHammer(){ S.cue=null; S.act={k:'ham',stage:'wind',t:0,phi:0,w:W0*.8,lows:0,taps:0}; S.phase='act'; tone(500,.06,'triangle',.04); }
export function updateHammer(dt){
  const a=S.act;
  if(a.stage==='fly'||a.stage==='foul'){ flight(dt,a); return; }
  // the winds speed up into the first turn's pace
  if(a.stage==='wind') a.w=Math.min(W0,a.w+dt*.6);
  a.phi+=a.w*dt;
  // across the circle while turning
  if(a.stage!=='wind') S.x=Math.min(HAM_CIRCLE-.55,S.x+dt*.42);
  while(a.phi>=lowAt(a.lows+1)){ a.lows++; a.lowT=a.t; if(a.lows===WINDS){ a.stage='turn'; } }
  if(a.stage==='turn'){
    const n=WINDS+a.taps+1, toLow=(lowAt(n)-a.phi)/a.w;
    if(!S.cue&&a.lows<n&&toLow<=.45) S.cue={type:'spin',side:a.taps%2?'R':'L',t:0};
    // not tapped in time: no speed from this turn
    if(a.lows>=n&&a.t-a.lowT>LATE+LAG) hamResolve(0);
  } else if(a.stage==='final'){
    if(S.held2) a.held=true;
    else if(a.held) release(a);
    // never let go: it flies off late
    if(!a.rel&&a.phi>REL_AT+a.w*(FOUL+LAG+.1)) release(a);
  }
  const b=hamBall(S.x,a.phi); S.pose=spinPose(a,b);
  a.t+=dt;
}
// the orange button on a turn's lowest point
export function hamTap(side){
  const a=S.act; if(S.phase!=='act'||!a||a.k!=='ham'||a.stage!=='turn'||!S.cue||S.cue.type!=='spin') return;
  if(side!==S.cue.side){ hamResolve(0); return 'x'; }
  const n=WINDS+a.taps+1, e=(a.lows>=n?a.t-a.lowT:-(lowAt(n)-a.phi)/a.w)-LAG;
  hamResolve(e<-EARLY?0:qWin(e,EARLY,LATE)); return 'ok';
}
function hamResolve(q){
  const a=S.act; S.cue=null; judge(q);
  a.w*=q>0?1+HAM_GAIN+HAM_GAIN_Q*q:1; a.taps++;
  tone(360+a.taps*60,.06,'triangle',.05);
  if(a.taps>=TAPS){ a.stage='final'; a.held=!!S.held2; S.cue={type:'hamhold',t:0}; }
}
function release(a){
  a.rel=true; S.cue=null;
  // seconds from the release point (negative: early)
  const e=(a.phi-REL_AT)/a.w-LAG, b=hamBall(S.x,a.phi), q=clamp(1-(Math.abs(e)-OK)/(FOUL-OK),0,1);
  a.e=e; judge(Math.abs(e)>FOUL?0:q); noise(.25,.12,2500); tone(300,.3,'triangle',.04,.5);
  S.jv={held:false,x:b[0],y:Math.max(.3,b[1]),x0:b[0],y0:Math.max(.3,b[1]),t:0,ham:true};
  if(Math.abs(e)>FOUL){
    // early: back into the cage's net; late: out to the side of the sector
    a.stage='foul'; a.early=e<0; a.R=a.early?-(b[0]-(S.x-HAM_CAGE)):14+6*Math.random(); a.T=a.early?.35:1.1;
    S.pops.push({text:a.early?'¡A LA RED!':'¡AFUERA DEL SECTOR!',t:0,dur:1,col:'#ff5a3c',sub:'',big:.6,small:true}); tone(160,.45,'sawtooth',.06);
  } else {
    const len=BEST*Math.pow(a.w/W_BEST,1.6)*(.6+.4*q);
    a.stage='fly'; a.R=Math.max(8,len-(b[0]-S.ev.line)); a.T=1.4+.035*a.R;
  }
  a.t=0; a.wf=a.w;
}
// the ball's flight (like the javelin's); the athlete spins down to a stop
function flight(dt,a){
  a.t+=dt; a.wf=Math.max(0,a.wf-a.wf*2.2*dt); a.phi+=a.wf*dt;
  const j=S.jv;
  S.pose=j.stuck&&a.stage==='fly'?POSE.cheer:{...POSE.stand,kind:'hamafter',lean:.1,arms:[{a:1.9+.3*Math.sin(a.phi),b:.1},{a:1.5,b:.2}]};
  if(j.stuck) return;
  j.t+=dt; const u=Math.min(1,j.t/a.T);
  // into the net: straight back, dropping to its foot
  if(a.stage==='foul'&&a.early){ j.x=j.x0+a.R*u; j.y=j.y0+(.12-j.y0)*u*u; }
  else { const top=a.R*.2; j.x=j.x0+a.R*u; j.y=j.y0*(1-u)+4*top*u*(1-u); S.ppm+=(16-S.ppm)*Math.min(1,dt*1.6); }
  if(u>=1){ j.stuck=true; j.y=.12; tone(140,.12,'square',.05);
    if(a.stage==='fly'){ S.landX=j.x; landed(Math.floor((j.x-S.ev.line)*100)/100); } else landed(null); }
}
