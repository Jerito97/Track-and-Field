// 4x100 relay on the sprint engine: four legs of the 100 m's green buttons, run by the player one after the other. At
// each change (every 100 m) the next runner waits on the change mark and, just behind them, a board on the track: when
// the baton gets near it the red buttons appear (and the game goes in slow motion); pressed with the baton right over
// the middle of the board, the next runner takes off with all the speed, further from it with less. Not pressing, it's
// handed over on its own at the board's far end, as badly as it gets.
import {tone} from '../audio.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {bothCue,judge,pop,sideCue} from './core.js';

// the board: its middle BACK m before the change mark, perfect within CH_OK m of it, nothing left CH_W m further
// (either side); the baton is BATON m ahead of the runner's hip, the next runner's hip MATE m past the board's middle
// (the baton goes from hand to hand: the race goes on from there, GAIN m further on); the red buttons come when the
// baton is CUE_D m from the board's middle, and from then the game runs at SLOW of its speed
export const CH_OK=.12, CH_W=1.4, BACK=1.5, MATE=.6;
const BATON=.35, LAG=.03, SLOW=.4, CUE_D=6;
export const GAIN=BATON+MATE;
// what the next runner takes of the speed: CH_MIN at worst, all of it for a perfect change
const CH_MIN=.72;
// the change marks (m), the next board's middle
export const changes=ev=>Array.from({length:ev.legs-1},(_,i)=>ev.dist/ev.legs*(i+1));
const board=()=>{ const m=changes(S.ev)[S.leg]; return m==null?null:m-BACK; };
// the baton from the board's middle (m; >0 past it), counting the press's lag
const off=()=>S.x+BATON-S.v*LAG*(S.ts??1)-board();
// how fast the game runs: slowing down into the red, back to normal after the change
export function relayTime(dt){ const want=S.chCued?SLOW:1; S.ts=(S.ts??1)+(want-(S.ts??1))*Math.min(1,dt*(S.chCued?10:5)); return S.ts; }

// once a frame while running: the change coming (the red buttons), and the late change
export function relayStep(){
  const b=board(); if(b==null||S.finished) return;
  if(!S.chCued&&b-S.x-BATON<=CUE_D){ S.chCued=true; bothCue(); pop('¡PASALO!',{dur:.6,col:'#ffd23a',big:.6}); }
  if(off()>=CH_OK+CH_W) handOver();
}
// the red buttons at a change
export function relayHit(){ if(!S.ev.relay||!S.chCued||board()==null) return false; handOver(); return true; }
function handOver(){
  const e=off(), q=clamp(1-(Math.abs(e)-CH_OK)/CH_W,0,1);
  judge(q); tone(500+300*q,.08,'triangle',.05);
  S.prints.push(board()+e);
  // the runner who gave it slows down behind; the next one (waiting just ahead) goes on with the baton
  S.prev={x:S.x,v:S.v,leg:S.leg,t:0}; S.leg++; S.x+=GAIN; S.v*=CH_MIN+(1-CH_MIN)*q; S.peak=S.v;
  S.chPrep=S.chCued=false; S.cue=null; S.lastTap=S.clock; sideCue();
  pop(`RELEVO ${S.leg+1}`,{dur:.8,col:"#ffd23a",big:.6});
}
