// Swimming (crawl, 100 m in a 50 m pool) on the sprint engine: the same gun, green buttons, machines, time and records.
// On top: the dive off the block at the gun; the race distance (S.x, 0..100) goes there and back in the pool (poolX);
// at the far wall the turn: the red buttons appear near it, pressed with the head about TURN_BEST m from the wall is a
// perfect flip turn and push-off (it keeps all its speed and glides), earlier or later keeps less; reaching the wall
// without pressing crashes into it. At the end the red buttons again to touch the wall (the 100 m's dip).
import {noise,tone} from '../audio.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {bothCue,judge,pop,sideCue} from './core.js';

// metres a second per unit of tapping speed (the 100 m's taps, at swimming pace)
export const SWIM_K=.34;
// the dive: how long in the air, how far it lands (m), the block's top above the water (m), the speed it enters with
export const DIVE_T=.6, DIVE_X=3.4, BLOCK_H=1.2;
const DIVE_V=4.5;
// the turn: the cue shows TURN_ZONE m from the wall; best pressed at TURN_BEST m (TURN_OK either side perfect, nothing
// left TURN_W further); how long it takes (s), the push-off (m); what a turn keeps of the speed: TURN_MIN to all of it
export const TURN_ZONE=4.5, TURN_T=.7;
const TURN_BEST=1.3, TURN_OK=.2, TURN_W=1.6, PUSH=2.5, TURN_MIN=.7, CRASH=.5, LAG=.03;
// where race distance d is in the pool (0 at the start wall, len at the far one); back: on the way back
export const poolX=(ev,d)=>{ const L=ev.pool; return d<=L?d:Math.max(0,2*L-Math.min(d,ev.dist)); };
export const isBack=(ev,d)=>d>ev.pool;
const wallLeft=()=>S.ev.pool-S.x;

// at the gun: off the block
export function swimGun(){ S.dive=0; S.cue=null; noise(.15,.2); }
// one frame of the race (instead of running): dive, turn, or swimming
export function swimStep(dt){
  const ev=S.ev;
  if(S.dive!=null&&S.dive<DIVE_T){ S.dive+=dt; S.x=DIVE_X*Math.min(1,S.dive/DIVE_T);
    if(S.dive>=DIVE_T){ S.v=DIVE_V/SWIM_K; S.lastTap=S.clock; tone(200,.12,'triangle',.05); noise(.25,.25,900); sideCue(); }
    return; }
  const a=S.turning;
  if(a){ a.t+=dt; const u=Math.min(1,a.t/a.T);
    // into the wall and over (first half), then the push-off under the water (second half)
    if(u<.5){ const k=u/.5; S.x=a.x0+(ev.pool-a.x0)*k; }
    else { const k=(u-.5)/.5; S.x=ev.pool+PUSH*k*(2-k); }
    if(u>=1){ S.turning=null; S.v=a.v; S.lastTap=S.clock; S.turned=true; sideCue(); }
    return; }
  S.x+=S.v*SWIM_K*dt; S.legP+=S.v*SWIM_K*dt;
  if(S.turned||S.finished) return;
  const w=wallLeft();
  if(!S.turnCued&&w<=TURN_ZONE){ S.turnCued=true; bothCue(); S.pops.push({text:'¡VUELTA!',t:0,dur:.8,col:'#ffd23a',sub:'',big:.6,small:true}); }
  // got to the wall without the turn: into it
  if(w<=0){ S.cue=null; startTurn(-1); }
}
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
