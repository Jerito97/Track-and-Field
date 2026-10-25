// 4x100 relay on the sprint engine: four legs of the 100 m's green buttons, run by the player one after the other. At
// each change (every 100 m) the next runner waits on the change mark and, just behind them, a board on the track: when
// the baton gets near it the red buttons appear (and the game goes in slow motion); pressed with the baton right over
// the middle of the board, the next runner takes off with half the speed and a boost, further from it less boost. Not pressing, it's
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
export const BATON=.35;
const LAG=.03, SLOW=.6, CUE_D=6;
export const GAIN=BATON+MATE;
// the next runner takes off with CH_BASE of the speed the baton came with, plus a boost of up to CH_BOOST more for a
// good change (all of it for a perfect one, nothing for the worst)
export const CH_BASE=.5, CH_BOOST=.25;
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
// the machines change too: each one's changes, how good (better machines, better changes); the time they cost
// (the speed lost, got back at RECOVER per second: the rival's slow), to run the rest faster and keep their time
const RECOVER=.9;
export function rivalChanges(r,ev){ const sk=r.a.sk??.8; r.leg=0; r.chq=changes(ev).map(()=>clamp(.55+.45*sk+(Math.random()*.25-.15),0,1));
  return r.chq.reduce((t,q)=>t+(1-(CH_BASE+CH_BOOST*q))/RECOVER,0); }
// once a frame for a machine: the baton reaching the board, handed over (the runner who gave it slows down behind)
export function rivalRelay(r,dt){
  const m=changes(S.ev)[r.leg];
  if(m!=null&&r.x+BATON>=m-BACK){ r.prev={x:r.x,v:r.v,t:0,legP:r.legP}; r.x+=GAIN; r.slow=CH_BASE+CH_BOOST*r.chq[r.leg]; r.leg++; }
  const p=r.prev; if(p){ p.t+=dt; p.v=Math.max(0,p.v-p.v*1.8*dt); p.x+=p.v*dt; p.legP+=p.v*dt*2.4; }
}
function handOver(){
  const e=off(), q=clamp(1-(Math.abs(e)-CH_OK)/CH_W,0,1);
  S.pops=S.pops.filter(p=>p.text!=='¡PASALO!');  // (so it doesn't sit on top of RELEVO n)
  judge(q); tone(500+300*q,.08,'triangle',.05);
  S.prints.push(board()+e);
  // the runner who gave it slows down behind; the next one (waiting just ahead) goes on with the baton
  S.prev={x:S.x,v:S.v,leg:S.leg,t:0}; S.leg++; S.x+=GAIN; S.v*=CH_BASE+CH_BOOST*q; S.peak=S.v;
  S.chPrep=S.chCued=false; S.cue=null; S.lastTap=S.clock; sideCue();
  pop(`RELEVO ${S.leg+1}`,{dur:.8,col:"#ffd23a",big:.6});
}
