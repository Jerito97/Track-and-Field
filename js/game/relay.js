// 4x100 relay on the sprint engine: four legs of the 100 m's green buttons, run by the player one after the other. At
// each change (every 100 m) a board on the track, centred on the change mark: the green buttons stop a moment before
// it, then both red buttons hand the baton over, best with the baton right over the middle of the board; how close
// sets how much speed the next runner takes off with. Not pressing, it's handed over on its own at the board's far end,
// as badly as it gets.
import {tone} from '../audio.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {bothCue,judge,pop,sideCue} from './core.js';

// the board: perfect within CH_OK m of the mark, nothing left CH_W m further (either side); the baton is BATON m ahead
// of the runner's hip; the red buttons come CH_CUE s before the mark, the green ones stop CH_PREP s before that
export const CH_OK=.12, CH_W=1.4;
const BATON=.35, CH_CUE=.7, CH_PREP=.45, LAG=.03;
// what the next runner takes of the speed: CH_MIN at worst, all of it for a perfect change
const CH_MIN=.72;
// the change marks (m) and the next one ahead
export const changes=ev=>Array.from({length:ev.legs-1},(_,i)=>ev.dist/ev.legs*(i+1));
const nextMark=()=>changes(S.ev)[S.leg];
// the baton from the change mark (m; >0 past it), counting the press's lag
const off=()=>S.x+BATON-S.v*LAG-nextMark();

// once a frame while running: the change coming (green buttons off, then the red ones), and the late change
export function relayStep(){
  const m=nextMark(); if(m==null||S.finished) return;
  const v=Math.max(S.v,4);
  if(!S.chPrep&&S.x+BATON>=m-v*(CH_CUE+CH_PREP)){ S.chPrep=true; S.cue=null; pop('¡LLEGA EL PASE!',{dur:.6,col:'#fff',big:.55}); }
  if(S.chPrep&&!S.chCued&&S.x+BATON>=m-v*CH_CUE){ S.chCued=true; bothCue(); }
  if(off()>=CH_OK+CH_W) handOver();
}
// the red buttons at a change
export function relayHit(){ if(!S.ev.relay||!S.chCued||nextMark()==null) return false; handOver(); return true; }
function handOver(){
  const e=off(), q=clamp(1-(Math.abs(e)-CH_OK)/CH_W,0,1);
  judge(q); tone(500+300*q,.08,'triangle',.05);
  S.prints.push(nextMark()+e);
  // the runner who gave it slows down behind; the next one goes on with the baton
  S.prev={x:S.x,v:S.v,leg:S.leg,t:0}; S.leg++; S.v*=CH_MIN+(1-CH_MIN)*q; S.peak=S.v;
  S.chPrep=S.chCued=false; S.cue=null; S.lastTap=S.clock; sideCue();
  pop(`RELEVO ${S.leg+1}`,{dur:.8,col:"#ffd23a",big:.6});
}
