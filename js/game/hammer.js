// Hammer throw, in three parts: three turns tapping the green buttons as in the 100 m (each good tap spins faster, a
// wrong one slows down, not tapping slowly loses speed); the last, fast turn: RUSH_T s to tap as fast as you can (any
// button), each tap adding to the throw; then aim, as with the javelin: hold both buttons and a star runs along a bar
// over the athlete; let go when it reaches the circle at its end. Far too early the ball hits the cage's net, too late
// it lands outside the sector: no mark.
import {noise,tone} from '../audio.js';
import {POSE} from '../poses.js';
import {S} from '../state.js';
import {judge,sideCue} from './core.js';
import {landed,qPole} from './field.js';

const TAU=Math.PI*2;
// the ball's path around the athlete (m): side to side HAM_R, height HAM_MID ± HAM_A (lowest on the left, highest on
// the right); the far half of the circle shows HAM_DEPTH m higher, the near half lower
export const HAM_R=1.75, HAM_MID=1.3, HAM_A=.85, HAM_DEPTH=.45;
// circle radius; the cage's back wall (m behind the circle's centre)
export const HAM_CIRCLE=1.07, HAM_CAGE=3.2;
// shoulders' height, arms' length (m)
const SH=1.42, ARM=.7;
// turning speed (radians/s): slowest, and what each m/s of tapping speed adds
const W_MIN=TAU/1.25, W_PER_V=.7;
const TURNS=3;
// the last turn: how long (s), what each tap adds to the throw (share), and the most it can add
const RUSH_T=1.5, RUSH_TAP=.014, RUSH_MAX=.3;
// then a moment with nothing to press before aiming (s); a hold shorter than BLIP s (fingers left over from the fast
// taps) doesn't throw: it starts over
const GAP=.6, BLIP=.12;
// seconds for the star to reach the ball; let go before EARLY (of the way) = into the net, after LATE = out
const HAM_T=.6, EARLY=.45, LATE=1.25, LAG=.03;
// without holding, the throw goes off on its own after this long (s)
const WAIT=2;
// throw length per m/s of tapping speed (full marks)
const HAM_K=6.6;
// not tapping: as in the 100 m
const IDLE_GRACE=.5, IDLE_DECAY=.3;
// the lowest point of turn n (radians, growing as it turns)
const lowAt=n=>Math.PI+TAU*(n-1);

// ball position for angle φ around an athlete standing at x: [x, height above the track, depth (>0 far side)]
export function hamBall(x,phi){ const c=Math.cos(phi), s=Math.sin(phi); return [x+HAM_R*c,HAM_MID+HAM_A*c+HAM_DEPTH*s,s]; }
// where the hands are, holding the cable toward the ball
export function hamHands(x,b){ const dx=b[0]-x, dy=b[1]-SH, d=Math.hypot(dx,dy)||1; return [x+dx/d*ARM,SH+dy/d*ARM]; }

// arms reach for the ball, legs shuffle with the turn, the body leans back against the pull
function spinPose(a,b){ const dx=b[0]-S.x, dy=b[1]-SH, arm=Math.atan2(dx,-dy), f=.3*Math.sin(a.phi);
  return {kind:'hamspin',hip:.76,lean:-.12,legs:[{a:.2+f,b:.35},{a:-.15-f,b:.3}],arms:[{a:arm,b:.05},{a:arm+.08,b:.12}]}; }

const rushBonus=a=>Math.min(RUSH_MAX,(a.taps||0)*RUSH_TAP);
// the last turn's taps: any button
export function hamRush(){ const a=S.act; if(S.phase!=='act'||!a||a.k!=='ham'||a.stage!=='rush') return false;
  a.taps++; tone(500+Math.min(400,a.taps*18),.03,'triangle',.035); return true; }
export function startHammer(){ S.v=0; S.act={k:'ham',stage:'turn',t:0,phi:0,w:W_MIN,lows:0}; S.phase='act'; S.lastTap=S.clock; sideCue(); tone(600,.06,'triangle',.04); }
export function updateHammer(dt){
  const a=S.act;
  if(a.stage==='fly'||a.stage==='foul'){ flight(dt,a); return; }
  a.t+=dt;
  if(a.stage==='turn'){
    if(S.cue&&S.cue.type==='side'&&S.clock-(S.lastTap||0)>IDLE_GRACE) S.v-=S.v*IDLE_DECAY*dt;
    a.w+=(W_MIN+W_PER_V*S.v-a.w)*Math.min(1,dt*6);
    S.x=Math.min(HAM_CIRCLE-.55,S.x+dt*.3);  // across the circle while turning
  }
  a.phi+=a.w*dt;
  while(a.phi>=lowAt(a.lows+1)){ a.lows++;
    if(a.lows===TURNS){ a.stage='rush'; a.t=0; a.v=S.v; a.taps=0; S.cue={type:'rush',t:0}; tone(700,.08,'square',.04); } }
  if(a.stage==='rush'){
    // spins faster with every tap
    a.w+=(W_MIN+W_PER_V*a.v*(1+2.5*rushBonus(a))-a.w)*Math.min(1,dt*8);
    if(a.t>=RUSH_T){ a.stage='gap'; a.t=0; S.cue=null; S.pops.push({text:'¡AHORA APUNTÁ!',t:0,dur:GAP+.3,col:'#ffd23a',sub:'',big:.6,small:true}); }
  }
  if(a.stage==='gap'&&a.t>=GAP){ a.stage='final'; a.t=0; a.free=!S.held2; S.cue={type:'hamhold',t:0}; tone(500,.06,'triangle',.04); }
  if(a.stage==='final'){
    const m=S.meter;
    // a fresh hold: fingers still down from the fast taps don't start it
    if(!S.held2) a.free=true;
    if(!m&&S.held2&&a.free){ S.meter={k:'ham',p:0}; S.cue=null; tone(500,.06,'triangle',.04); }
    else if(m){ m.p+=dt/HAM_T;
      if(!S.held2&&m.p*HAM_T<BLIP){ S.meter=null; S.cue={type:'hamhold',t:0}; }
      else if(!S.held2||m.p>=LATE) release(a); }
    else if(a.t>WAIT) release(a);
  }
  if(a.stage!=='fly'&&a.stage!=='foul') S.pose=spinPose(a,hamBall(S.x,a.phi));
}
function release(a){
  const m=S.meter, p=m?m.p:LATE, b=hamBall(S.x,a.phi);
  if(m) m.hit=p; S.cue=null; setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='ham') S.meter=null; },300);
  noise(.25,.12,2500); tone(300,.3,'triangle',.04,.5);
  S.jv={held:false,x:b[0],y:Math.max(.3,b[1]),x0:b[0],y0:Math.max(.3,b[1]),t:0,ham:true};
  if(p<EARLY||p>=LATE){
    // early: back into the cage's net; late: out to the side of the sector
    judge(0); a.stage='foul'; a.early=p<EARLY; a.R=a.early?-(b[0]-(S.x-HAM_CAGE)):14+6*Math.random(); a.T=a.early?.35:1.1;
    S.pops.push({text:a.early?'¡A LA RED!':'¡AFUERA DEL SECTOR!',t:0,dur:1.4,col:'#ff5a3c',sub:'',big:.6,small:true}); tone(160,.45,'sawtooth',.06);
  } else {
    const q=qPole(p-LAG/HAM_T); judge(q);
    a.stage='fly'; a.R=Math.max(8,HAM_K*a.v*(1+rushBonus(a))*(.6+.4*q)-(b[0]-S.ev.line)); a.T=1.4+.035*a.R;
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
