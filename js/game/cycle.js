// Track cycling (500 m time trial in a velodrome: two laps of 250 m) on the sprint engine. The pedals, one after the
// other: a ring shows on the pedal's side (left, right, left...); hold that button and the ring fills, let go right
// as it closes (a little before or after) for a full stroke, earlier for less (the ring filled, squared: half a ring
// is a quarter of a stroke); held past it, the stroke is half one. The ring let go stays a moment as it was left.
// The air slows the rider down, more the faster it goes. At the gun the first pedal; past the line the first time
// the bell (last lap); at the line, both red buttons to throw the bike.
import {tone} from '../audio.js';
import {S} from '../state.js';
import {judge,pop} from './core.js';

export const LAP=250;
// seconds for a ring to fill; let go between PERFECT and PAST of it is a full stroke (the ring closes inside it, more
// of it after: the screen shows the ring a moment late, so one sees it close a little after it does); past PAST it's
// half one, held to OVER it goes on its own
export const FILL_T=.5;
const PERFECT=.95, PAST=1.15, OVER=1.4, OVER_Q=.5;
// a full stroke adds IMP m/s; the air takes DRAG·v² m/s every second (COAST of it once the pedalling is over, the
// bike thrown at the line: tucked in, coasting)
const IMP=2.0, DRAG=.012, COAST=.3;
// metres the bike goes for a turn of the pedals (track gear)
export const GEAR=7.5;

const held=side=>!!(S.press&&S.press[side]);
// seconds since that button was pressed or let go (the game notices it a frame late), at most .05
const since=side=>{ const t=S.pressAt&&S.pressAt[side]; return t==null?0:Math.max(0,Math.min(.05,(performance.now()-t)/1000)); };
function pedal(side){ S.cue={type:'pedal',side,t:0}; S.ped={side,st:'wait',p:0,free:!held(side)}; }
// at the gun: the first pedal (the right one)
export function cycleGun(){ pedal('R'); }
// a stroke: how much of the ring it took (as let go); the ring stays on its side a moment (S.pedLast)
function stroke(p,side){
  const over=p>PAST, q=over?OVER_Q:p>=PERFECT?1:p*p;
  S.v+=IMP*q; S.strokeQ=q; S.pedLast={side,p,q,over,t:0};
  if(over) S.pops.push({text:'¡TE PASASTE!',t:0,dur:.6,col:'#ff5a3c',sub:'',big:.55,small:true});
  else judge(p>=PERFECT?1:p>=.86?.75:p>=.65?.5:.2);
  tone(over?180:360+300*Math.min(p,1),.05,'triangle',.04);
}
// once a frame while racing: the air, the pedal being held, the bell
export function cycleStep(dt){
  S.v=Math.max(0,S.v-DRAG*(S.dipCued&&!S.finished?COAST:1)*S.v*S.v*dt);
  S.crank=(S.crank||0)+S.v*dt/GEAR*Math.PI*2;
  if(S.pedLast) S.pedLast.t+=dt;
  if(!S.lapBell&&S.x>=LAP){ S.lapBell=true; pop('¡ÚLTIMA VUELTA!',{dur:1,col:'#ffd23a',big:.7}); [0,.18,.36].forEach(d=>setTimeout(()=>tone(1320,.12,'sine',.05),d*1000)); }
  const f=S.ped; if(!f||!S.cue||S.cue.type!=='pedal'||S.finished) return;
  if(f.st==='wait'){ if(!held(f.side)) f.free=true; if(held(f.side)&&f.free){ f.st='hold'; f.p=since(f.side)/FILL_T; } return; }
  f.p+=dt/FILL_T;
  if(!held(f.side)||f.p>=OVER){ const p=held(f.side)?f.p:f.p-since(f.side)/FILL_T; stroke(p,f.side); pedal(f.side==='L'?'R':'L'); }
}
// the ring of the pedal being held (0..OVER), for the screen
export const pedalP=()=>S.ped&&S.ped.st==='hold'?S.ped.p:0;
export {PAST,PERFECT,OVER};
