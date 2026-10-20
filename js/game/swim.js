// Swimming (100 m in a 50 m pool) on the sprint engine: the same gun, machines, time and records; each stroke its own way
// of swimming (ev.stroke): crawl, the 100 m's green buttons; breaststroke (breast), in rhythm: a ring closes and both
// buttons go right as it closes, a good stroke speeding the rhythm up, a bad one slowing it down; butterfly (fly), hold
// and let go: holding both the swimmer dives into the stroke and a star runs to a circle, letting go there is the best
// stroke, then the arms come back over the water and it's another hold. In both, each stroke pushes the swimmer on and
// the water slows it down between strokes.
// On top: the dive off the block (both red buttons at the gun: the reaction counts in the time); the race distance (S.x, 0..100) goes there and back in the pool (poolX);
// at the far wall the turn: the red buttons appear near it, pressed with the head about TURN_BEST m from the wall is a
// perfect flip turn and push-off (it keeps all its speed and glides), earlier or later keeps less; reaching the wall
// without pressing crashes into it. At the end the red buttons again to touch the wall (the 100 m's dip).
import {noise,tone} from '../audio.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {bothCue,judge,pop,sideCue,sinceHold} from './core.js';
import {qPole} from './field.js';

// metres a second per unit of tapping speed (the 100 m's taps, at swimming pace)
export const SWIM_K=.34;
// the dive: how long in the air, how far it lands (m), the block's top above the water (m), the speed it enters with
export const DIVE_T=.6, DIVE_X=3.4, BLOCK_H=1.2;
const DIVE_V=4.5;
// the turn: the cue shows TURN_ZONE m from the wall; best pressed at TURN_BEST m (TURN_OK either side perfect, nothing
// left TURN_W further); how long it takes (s), the push-off (m); what a turn keeps of the speed: TURN_MIN to all of it
export const TURN_ZONE=4.5, TURN_T=.7;
const TURN_BEST=1.3, TURN_OK=.2, TURN_W=1.6, PUSH=2.5, TURN_MIN=.7, CRASH=.5, LAG=.03;
// before the turn and before the touch, this long (s) with nothing to press, to get ready for it
const PREP=.55;
// the race distance counts the hands (stretched out ahead): the hip, where the swimmer is drawn, is REACH m behind
export const REACH=1.0;
// breaststroke and butterfly: what a perfect stroke adds (m/s), how fast the water slows the swimmer (share a second),
// and the slowest it gets between strokes (it never stops: it glides)
const IMP={breast:4.4,fly:5.6}, DRAG=.9, GLIDE_V=1.6, CRUISE=1.4;
// breaststroke rhythm: seconds between strokes at first, at the fastest and at the slowest; a press TIME_OK s from the
// ring closing is perfect, nothing left TIME_W s further; past LATE s without pressing, the stroke is lost
export const BEAT_T0=1.15, BEAT_MIN=.85, BEAT_MAX=1.45;
const TIME_OK=.04, TIME_W=.18, LATE=.22;
// butterfly: seconds for the star to reach the circle (past FLY_LATE of the way, a weak stroke), the arms coming back
export const FLY_T=.6, FLY_REC=.45;
const FLY_LATE=1.3, BLIP=.08;
// where the hands are in the pool at race distance d (0 at the start wall, len at the far one); back: on the way back.
// Turning, the body goes round with the feet where the hands were: the hands end up 2 REACH back toward the start, so
// the turn takes the distance on by that much (swimmers swim 2 REACH less than the race)
export const poolX=(ev,d)=>{ const L=ev.pool; return d<=L?d:Math.max(0,2*L-Math.min(d,ev.dist)); };
// where the swimmer's hip is in the pool (the hands REACH m ahead of it, toward where it swims)
export const hipX=(ev,d)=>poolX(ev,d)+(d>ev.pool?REACH:-REACH);
export const isBack=(ev,d)=>d>ev.pool;
const wallLeft=()=>S.ev.pool-S.x;

// at the gun: the red buttons to dive
export function swimGun(){ S.cue={type:'both',dive:true,t:0}; }
export function swimDiveHit(){ if(!S.cue||!S.cue.dive) return false; S.cue=null; S.dive=0; noise(.15,.2); return true; }
// what to press now to swim, by stroke
function strokeCue(){ const k=S.ev.stroke;
  if(k==='breast'){ S.beat=S.beat||{T:BEAT_T0}; S.cue={type:'both',beat:true,t:0,T:S.beat.T}; }
  else if(k==='fly'){ S.cue={type:'hamhold',label:'MANTENÉ LOS DOS',t:0}; S.fly={st:'wait',free:!S.held2}; S.meter=null; }
  else sideCue(); }
// a stroke of quality q (breaststroke, butterfly): a push on, half of it for any stroke, the other half as good as it was
// (a lost one, a little)
function stroke(q){ S.v+=IMP[S.ev.stroke]*(q>0?.5+.5*q:.15)/SWIM_K; S.strokeAt=S.clock; S.strokeQ=q; S.lastTap=S.clock; }
// breaststroke: both buttons as the ring closes; the next ring comes quicker after a good one, slower after a bad one
export function swimBeatHit(){
  const c=S.cue; if(!c||!c.beat) return false;
  const err=c.t-.03-c.T, q=clamp(1-(Math.abs(err)-TIME_OK)/TIME_W,0,1);
  judge(q); tone(420+260*q,.06,'triangle',.05); beatNext(q); return true;
}
function beatNext(q){ const b=S.beat; stroke(q);
  b.T=q>=.8?Math.max(BEAT_MIN,b.T*.96):q>=.55?Math.max(BEAT_MIN+.1,b.T*.985):q<.35?Math.min(BEAT_MAX,b.T*1.12+.04):b.T; strokeCue(); }
// butterfly: waiting for a fresh hold, holding (the star running), the arms coming back
function flyStep(dt){
  const f=S.fly; if(!f) return;
  if(f.st==='wait'){ if(!S.held2) f.free=true; if(S.held2&&f.free){ f.st='hold'; S.cue=null; S.meter={k:'fly',p:0}; tone(500,.05,'triangle',.04); } return; }
  if(f.st==='hold'){ const m=S.meter; m.p+=dt/FLY_T;
    if(!S.held2&&m.p*FLY_T<BLIP){ strokeCue(); return; }  // a blip (fingers left over): start over
    if(!S.held2||m.p>=FLY_LATE){ if(!S.held2) m.p-=sinceHold()/FLY_T; m.hit=m.p; const q=m.p>=FLY_LATE?0:qPole(m.p-LAG/FLY_T);
      judge(q); tone(300+300*q,.1,'triangle',.05); stroke(q); f.st='rec'; f.t=0; setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='fly'&&S.meter.hit!=null) S.meter=null; },350); }
    return; }
  if(f.st==='rec'){ f.t+=dt; if(f.t>=FLY_REC) strokeCue(); }
}
// one frame of the race (instead of running): dive, turn, or swimming
export function swimStep(dt){
  const ev=S.ev;
  if(S.dive==null) return;  // still on the block
  if(S.dive<DIVE_T){ S.dive+=dt; S.x=DIVE_X*Math.min(1,S.dive/DIVE_T);
    if(S.dive>=DIVE_T){ S.v=DIVE_V/SWIM_K; S.lastTap=S.clock; tone(200,.12,'triangle',.05); noise(.25,.25,900); strokeCue(); }
    return; }
  const a=S.turning;
  if(a){ a.t+=dt; const u=Math.min(1,a.t/a.T);
    // into the wall and over (first half), then the push-off under the water (second half)
    if(u<.5){ const k=u/.5; S.x=a.x0+(ev.pool-a.x0)*k; }
    else { const k=(u-.5)/.5; S.x=ev.pool+2*REACH+PUSH*k*(2-k); }
    if(u>=1){ S.turning=null; S.v=a.v; S.lastTap=S.clock; S.turned=true; strokeCue(); }
    return; }
  const k=ev.stroke;
  // (gliding into a wall, for the turn or the touch, it keeps its speed, and at least GLIDE_V)
  if(k!=='crawl'){ if((S.prepWall&&!S.turned)||S.prepTouch) S.v=Math.max(S.v,GLIDE_V/SWIM_K); else S.v=Math.max(Math.min(S.v,CRUISE/SWIM_K),S.v-S.v*DRAG*dt);
    // a breaststroke ring left to close without pressing: the stroke is lost (slower rhythm)
    if(k==='breast'&&S.cue&&S.cue.beat&&S.cue.t>S.cue.T+LATE){ judge(0); beatNext(0); }
    if(k==='fly'&&!(S.prepWall&&!S.turned)&&!S.prepTouch) flyStep(dt); }
  S.x+=S.v*SWIM_K*dt; S.legP+=S.v*SWIM_K*dt;
  // crawl arms: faster the faster it swims, but at a believable pace (strokes a second)
  S.strokePh=(S.strokePh||0)+dt*2*Math.PI*clamp(.45+S.v*SWIM_K*.12,.45,1.25);
  if(S.finished) return;
  const va=Math.max(S.v*SWIM_K,GLIDE_V);
  // the wall coming: a moment with nothing to press (the strokes stop showing), then the red buttons
  if(S.turned){ if(!S.prepTouch&&S.x>=ev.dist-touchAt()-va*PREP){ S.prepTouch=true; clearStroke(); } return; }
  const w=wallLeft();
  if(!S.prepWall&&w<=TURN_ZONE+va*PREP){ S.prepWall=true; clearStroke(); S.pops.push({text:'¡LLEGA LA PARED!',t:0,dur:.6,col:'#fff',sub:'',big:.55,small:true}); }
  if(!S.turnCued&&w<=TURN_ZONE){ S.turnCued=true; bothCue(); S.pops.push({text:'¡VUELTA!',t:0,dur:.8,col:'#ffd23a',sub:'',big:.6,small:true}); }
  // got to the wall without the turn: into it
  if(w<=0){ S.cue=null; startTurn(-1); }
}
function clearStroke(){ S.cue=null; S.fly=null; if(S.meter&&S.meter.k==='fly') S.meter=null; }
// the red buttons by the far wall: the turn, as good as how close to TURN_BEST m from the wall
export function swimTurnHit(){
  if(!S.turnCued||S.turned||S.turning) return false;
  const w=wallLeft()+S.v*SWIM_K*LAG, q=clamp(1-(Math.abs(w-TURN_BEST)-TURN_OK)/TURN_W,0,1);
  S.cue=null; judge(q); startTurn(q); return true;
}
function startTurn(q){
  const crash=q<0;
  S.turning={t:0,T:crash?TURN_T*1.4:TURN_T,x0:S.x,crash,v:S.v*(crash?CRASH:TURN_MIN+(1-TURN_MIN)*q)};
  if(crash){ pop('¡CONTRA LA PARED!',{col:'#ff5a3c',dur:1}); tone(110,.2,'square',.05); noise(.2,.3); }
  else tone(500+300*q,.1,'triangle',.05);
}
// the touch at the end: the red buttons come this far from the wall
export const touchAt=()=>Math.max(2.5,S.v*SWIM_K*1.1);
