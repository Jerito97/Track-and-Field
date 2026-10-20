// 4x100 relay on the sprint engine: four legs of the 100 m's green buttons, run by the player one after the other. At
// each change (every 100 m) a board on the track, centred on the change mark, and before it the lane painted as in the
// long jump: from the green there are no buttons (you keep your speed and get ready), in the red both red buttons hand
// the baton over (and the game goes in slow motion), best with the baton right over the middle of the board; how close
// sets how much speed the next runner takes off with. Not pressing, it's handed over on its own at the board's far end,
// as badly as it gets.
import {tone} from '../audio.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {bothCue,judge,pop,sideCue} from './core.js';

// the board: perfect within CH_OK m of the mark, nothing left CH_W m further (either side); the baton is BATON m ahead
// of the runner's hip; the coloured lane before the mark (m from it, for the baton): green from BANDS[0], yellow from
// BANDS[1], red from BANDS[2] (the red buttons); in the red the game runs at SLOW of its speed
export const CH_OK=.12, CH_W=1.4, BANDS=[16,10,5.5];
const BATON=.35, LAG=.03, SLOW=.4;
// what the next runner takes of the speed: CH_MIN at worst, all of it for a perfect change
const CH_MIN=.72;
// the change marks (m) and the next one ahead
export const changes=ev=>Array.from({length:ev.legs-1},(_,i)=>ev.dist/ev.legs*(i+1));
const nextMark=()=>changes(S.ev)[S.leg];
// the baton from the change mark (m; >0 past it), counting the press's lag
const off=()=>S.x+BATON-S.v*LAG*(S.ts??1)-nextMark();
// how fast the game runs: slowing down into the red, back to normal after the change
export function relayTime(dt){ const want=S.chCued?SLOW:1; S.ts=(S.ts??1)+(want-(S.ts??1))*Math.min(1,dt*(S.chCued?10:5)); return S.ts; }

// once a frame while running: the change coming (green buttons off, then the red ones), and the late change
export function relayStep(){
  const m=nextMark(); if(m==null||S.finished) return;
  const d=m-S.x-BATON;
  if(!S.chPrep&&d<=BANDS[0]){ S.chPrep=true; S.cue=null; tone(520,.06,'triangle',.04); }
  if(S.chPrep&&!S.chCued&&d<=BANDS[2]){ S.chCued=true; bothCue(); pop('¡PASALO!',{dur:.6,col:'#ffd23a',big:.6}); }
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
